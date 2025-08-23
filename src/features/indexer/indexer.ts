import * as MediaLibrary from 'expo-media-library';
import { InteractionManager, AppState, AppStateStatus } from 'react-native';
import * as Haptics from 'expo-haptics';
import type { Asset as DBAsset } from '../../db/schema';
import { insertAssets, getAssetCount, getLatestAssetTimestamp } from '../../db/helpers';
import { useIndexStore } from '../../store/useIndexStore';
import { usePermissions } from '../../store/usePermissions';
import { useSettings } from '../../store/useSettings';
import { logger } from '../../lib/logger';

// Constants
const SCREENSHOT_RESOLUTIONS = [
  { width: 828, height: 1792 },
  { width: 1170, height: 2532 },
  { width: 1179, height: 2556 },
  { width: 1284, height: 2778 },
  { width: 1290, height: 2796 },
  { width: 750, height: 1334 },
  { width: 1125, height: 2436 },
  { width: 1242, height: 2208 },
  { width: 1242, height: 2688 },
  { width: 640, height: 1136 },
];

// Types
interface IndexControl {
  runId: string;
  cancel: () => void;
  pause: () => void;
  resume: () => void;
  isCanceled: () => boolean;
  isPaused: () => boolean;
}

interface IndexOptions {
  pageSize?: number;
}

interface AssetBatch {
  assets: MediaLibrary.Asset[];
  endCursor?: string;
  totalCount: number;
  hasNextPage: boolean;
}

interface CanIndexResult {
  canIndex: boolean;
  reason?: string;
}

// Module-level control state
let currentControl: IndexControl | null = null;
let appStateSubscription: { remove: () => void } | null = null;
let isStarting = false; // Start lock to prevent races

// Helper to generate unique run IDs
function generateRunId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Small, testable functions

export function checkCanIndex(permission: 'granted' | 'limited' | 'undetermined'): CanIndexResult {
  if (permission === 'undetermined') {
    return { canIndex: false, reason: 'Permissions not granted' };
  }
  // Both granted and limited can index
  return { canIndex: true };
}

export async function fetchAssetBatch(params: {
  first: number;
  after?: string;
}): Promise<AssetBatch> {
  const result = await MediaLibrary.getAssetsAsync({
    mediaType: MediaLibrary.MediaType.photo,
    first: params.first,
    sortBy: [MediaLibrary.SortBy.creationTime],
    after: params.after,
  });

  return {
    assets: result.assets,
    endCursor: result.endCursor,
    totalCount: result.totalCount,
    hasNextPage: result.hasNextPage,
  };
}

export function detectScreenshot(asset: MediaLibrary.Asset): boolean {
  // Early return for filename match
  const filename = asset.filename?.toLowerCase() || '';
  if (filename.includes('screenshot')) {
    return true;
  }

  // Early return for iOS mediaSubtype
  if ('mediaSubtypes' in asset && Array.isArray(asset.mediaSubtypes)) {
    if (asset.mediaSubtypes.includes('screenshot')) {
      return true;
    }
  }

  // Early return for exact resolution match
  const isExactMatch = SCREENSHOT_RESOLUTIONS.some(
    (res) => res.width === asset.width && res.height === asset.height
  );
  if (isExactMatch) {
    return true;
  }

  // Check for landscape orientation match
  const isLandscapeMatch = SCREENSHOT_RESOLUTIONS.some(
    (res) => res.height === asset.width && res.width === asset.height
  );

  return isLandscapeMatch;
}

// Helper to estimate file size when not available from MediaLibrary
function estimateFileSize(asset: MediaLibrary.Asset): number {
  // TODO: MediaLibrary doesn't expose fileSize property
  // This is a rough estimation - actual sizes may vary significantly
  // Consider using expo-file-system to get accurate sizes for critical features

  if (asset.mediaType === MediaLibrary.MediaType.video) {
    const durationSec = asset.duration || 0;
    // Estimate ~500KB/sec for compressed video (H.264 baseline)
    return Math.round(durationSec * 500000);
  }

  // Photo size estimation based on dimensions
  const pixels = (asset.width || 0) * (asset.height || 0);
  // Estimate ~0.3 bytes per pixel for compressed JPEG (quality ~80)
  return Math.round(pixels * 0.3);
}

// Helper to detect blur using available metadata
function detectBlur(asset: MediaLibrary.Asset): number {
  // TODO: Implement real blur detection when we have:
  // 1. Access to EXIF data (ISO, ShutterSpeed) via expo-media-library v2
  // 2. Image processing capability (Laplacian variance) via expo-image-manipulator
  // 3. Or ML model integration via TensorFlow.js
  // Currently returns 0 as safe default - no false positives

  // Simple heuristics since we don't have EXIF in MediaLibrary
  // Mark screenshots as not blurry
  if (detectScreenshot(asset)) return 0;

  return 0;
}

// Helper to generate content hash for duplicate detection
function generateContentHash(asset: MediaLibrary.Asset): string | undefined {
  // Create hash from available metadata
  // Better than nothing, but not as good as actual file hash
  if (asset.width && asset.height && asset.modificationTime) {
    return `${asset.width}x${asset.height}_${asset.modificationTime}_${asset.duration || 0}`;
  }
  return undefined;
}

// Helper to detect bundle categories
function detectBundleMetadata(asset: MediaLibrary.Asset) {
  const uri = asset.uri.toLowerCase();

  return {
    is_blurry: detectBlur(asset),
    is_burst: 0, // MediaLibrary doesn't expose burst info
    is_whatsapp: uri.includes('whatsapp') || uri.includes('telegram') ? 1 : 0,
    is_video: asset.mediaType === MediaLibrary.MediaType.video ? 1 : 0,
    duration_ms: asset.duration ? Math.round(asset.duration * 1000) : undefined,
    mime_type: String(asset.mediaType) || undefined,
    content_hash: generateContentHash(asset),
    size_bytes: estimateFileSize(asset) || null,
  };
}

export function mapAssetToDBSchema(
  asset: MediaLibrary.Asset,
  timestamp: number
): Omit<DBAsset, 'id'> {
  const bundleMetadata = detectBundleMetadata(asset);

  return {
    uri: asset.uri,
    filename: asset.filename || null,
    width: asset.width || null,
    height: asset.height || null,
    created_at: asset.creationTime || timestamp,
    is_screenshot: detectScreenshot(asset) ? 1 : 0,
    ...bundleMetadata,
  };
}

export async function processAssetBatch(rows: Omit<DBAsset, 'id'>[]): Promise<void> {
  if (rows.length === 0) return;

  // This will throw on failure (transaction rollback)
  await insertAssets(rows);
}

// Resolve accurate file sizes for a batch using MediaLibrary.getAssetInfoAsync
// Note: MediaLibrary.getAssetInfoAsync typings may not expose fileSize on current SDK; keeping
// this helper out until we integrate a precise size retrieval strategy (e.g., expo-file-system).

// Optimized progress update - only update when percentage changes
let lastProgressPercent = -1;
export function updateIndexProgress(total: number, indexed: number): void {
  const percent = total > 0 ? Math.floor((indexed / total) * 100) : 0;

  // Only update if percentage changed by at least 1%
  if (percent !== lastProgressPercent) {
    lastProgressPercent = percent;
    useIndexStore.getState().setProgress(total, indexed);
  }
}

// Control object factory
function createIndexControl(runId: string): IndexControl {
  let canceled = false;
  let paused = false;

  return {
    runId,
    cancel: () => {
      canceled = true;
    },
    pause: () => {
      paused = true;
    },
    resume: () => {
      paused = false;
    },
    isCanceled: () => canceled,
    isPaused: () => paused,
  };
}

// AppState handler - safer with cleanup guard
function setupAppStateHandler(control: IndexControl): void {
  // Clean up any existing subscription first (guard against double subscription)
  cleanupAppStateHandler();

  appStateSubscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active') {
      control.resume();
    } else if (nextAppState === 'background' || nextAppState === 'inactive') {
      control.pause();
    }
  });
}

function cleanupAppStateHandler(): void {
  if (appStateSubscription) {
    appStateSubscription.remove();
    appStateSubscription = null;
  }
}

// Main indexing function with start lock
export async function runInitialIndex(options: IndexOptions = {}): Promise<IndexControl> {
  const { pageSize = 200 } = options;
  const store = useIndexStore.getState();
  const permStore = usePermissions.getState();

  // Atomic check for existing or starting run
  if (isStarting || (store.running && store.currentRunId && currentControl)) {
    return currentControl || createIndexControl(''); // Return existing control or no-op
  }

  // Set start lock
  isStarting = true;

  try {
    // Check permissions
    const { canIndex, reason } = checkCanIndex(permStore.status);
    if (!canIndex) {
      logger.error(`Cannot index: ${reason}`);
      store.setLastError(reason);
      return createIndexControl(''); // Return no-op control
    }

    // Determine mode: initial or incremental
    const existingCount = await getAssetCount();
    const isInitial = existingCount === 0;

    // Generate run ID and create control
    const runId = generateRunId();
    const control = createIndexControl(runId);

    // Atomically set state and control
    currentControl = control;
    store.setRunId(runId);
    store.setRunning(true);
    store.setPaused(false);
    store.setLimitedScope(permStore.status === 'limited');
    store.setLastError(undefined);

    // Set up AppState handler AFTER control exists
    setupAppStateHandler(control);

    try {
      // Get total count with tiny initial fetch
      const initialBatch = await fetchAssetBatch({ first: 1 });
      const totalCount = initialBatch.totalCount;

      // If limited, store the count
      if (permStore.status === 'limited') {
        store.setLimitedCount(totalCount);
      }

      updateIndexProgress(totalCount, 0);

      let after: string | undefined;
      let hasNextPage = true;
      let indexedCount = 0;

      while (hasNextPage) {
        // Check cancellation
        if (control.isCanceled()) {
          logger.info('Indexing cancelled by user');
          break;
        }

        // Handle pause
        while (control.isPaused()) {
          await new Promise((resolve) => setTimeout(resolve, 200));
          // Check cancellation during pause
          if (control.isCanceled()) {
            break;
          }
        }

        // Race protection: verify we're still the active run
        const currentStore = useIndexStore.getState();
        if (currentStore.currentRunId !== runId) {
          logger.warn('Run ID mismatch, exiting indexing loop');
          break;
        }

        // Fetch batch
        const batch = await fetchAssetBatch({ first: pageSize, after });

        if (batch.assets.length > 0) {
          // If incremental, filter to only assets newer than our latest timestamp
          let assetsToProcess = batch.assets;
          if (!isInitial) {
            const latest = await getLatestAssetTimestamp();
            assetsToProcess = batch.assets.filter((a) => (a.creationTime || 0) > latest);
          }

          // Map assets to DB schema
          const timestamp = Date.now();
          const dbRows = assetsToProcess.map((asset) => mapAssetToDBSchema(asset, timestamp));

          // Process batch in transaction
          if (dbRows.length > 0) {
            await processAssetBatch(dbRows);
          }

          // Record successful batch
          store.setLastSuccessfulBatch(Date.now());

          // Update progress
          indexedCount += assetsToProcess.length;
          updateIndexProgress(totalCount, indexedCount);
        }

        hasNextPage = batch.hasNextPage;
        after = batch.endCursor;

        // Yield to UI to prevent gesture jank
        // This allows touch events and animations to process between batches
        if (InteractionManager?.runAfterInteractions) {
          await InteractionManager.runAfterInteractions();
        } else {
          // Fallback micro-yield when InteractionManager unavailable
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      }

      logger.info(`Indexing completed: ${indexedCount} photos indexed`);

      // Success haptic feedback when bundle scanning completes
      const hapticFeedback = useSettings.getState().hapticFeedback;
      if (hapticFeedback && indexedCount > 0) {
        // Run haptic after interactions to prevent frame drops
        if (InteractionManager?.runAfterInteractions) {
          await InteractionManager.runAfterInteractions();
        }

        try {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch (hapticError) {
          // Log error for telemetry but don't throw
          logger.warn('Haptic feedback failed', hapticError);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Indexing error:', errorMessage);
      store.setLastError(errorMessage);
    } finally {
      // Clean up only if this is still the active run
      const finalStore = useIndexStore.getState();
      if (finalStore.currentRunId === runId) {
        store.resetRunState();
        if (currentControl?.runId === runId) {
          currentControl = null;
        }
      }

      // Always clean up AppState subscription
      cleanupAppStateHandler();
    }

    return control;
  } finally {
    // Always release start lock
    isStarting = false;
  }
}

// Export for testing
export const __testing = {
  generateRunId,
  createIndexControl,
  setupAppStateHandler,
  cleanupAppStateHandler,
  getCurrentControl: () => currentControl,
  setCurrentControl: (control: IndexControl | null) => {
    currentControl = control;
  },
  getIsStarting: () => isStarting,
  setIsStarting: (value: boolean) => {
    isStarting = value;
  },
  resetLastProgressPercent: () => {
    lastProgressPercent = -1;
  },
};
