import * as MediaLibrary from 'expo-media-library';
import { InteractionManager, AppState, AppStateStatus } from 'react-native';
import type { Asset as DBAsset } from '../../db/schema';
import { insertAssets, getAssetCount } from '../../db/helpers';
import { useIndexStore } from '../../store/useIndexStore';
import { usePermissions } from '../../store/usePermissions';
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

export function mapAssetToDBSchema(
  asset: MediaLibrary.Asset,
  timestamp: number
): Omit<DBAsset, 'id'> {
  return {
    uri: asset.uri,
    filename: asset.filename || null,
    size_bytes: null,
    width: asset.width || null,
    height: asset.height || null,
    created_at: asset.creationTime || timestamp,
    is_screenshot: detectScreenshot(asset) ? 1 : 0,
  };
}

export async function processAssetBatch(rows: Omit<DBAsset, 'id'>[]): Promise<void> {
  if (rows.length === 0) return;

  // This will throw on failure (transaction rollback)
  await insertAssets(rows);
}

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

    // Check if DB already has assets
    const existingCount = await getAssetCount();
    if (existingCount > 0) {
      logger.info(`Database already has ${existingCount} assets, skipping initial index`);
      return createIndexControl(''); // Return no-op control
    }

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
          // Map assets to DB schema
          const timestamp = Date.now();
          const dbRows = batch.assets.map((asset) => mapAssetToDBSchema(asset, timestamp));

          // Process batch in transaction
          await processAssetBatch(dbRows);

          // Record successful batch
          store.setLastSuccessfulBatch(Date.now());

          // Update progress
          indexedCount += batch.assets.length;
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
