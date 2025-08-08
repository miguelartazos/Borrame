import {
  detectScreenshot,
  checkCanIndex,
  mapAssetToDBSchema,
  processAssetBatch,
  runInitialIndex,
  updateIndexProgress,
  __testing,
} from './indexer';
import type { Asset } from 'expo-media-library';
import * as MediaLibrary from 'expo-media-library';
import { insertAssets, getAssetCount } from '../../db/helpers';
import { useIndexStore } from '../../store/useIndexStore';
import { usePermissions } from '../../store/usePermissions';
// React Native imports only used for types

// Mock dependencies
jest.mock('expo-media-library');
jest.mock('../../db/helpers');
jest.mock('../../store/useIndexStore');
jest.mock('../../store/usePermissions');
jest.mock('../../lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock React Native modules
const mockRunAfterInteractions = jest.fn();
const mockAddEventListener = jest.fn();

jest.mock('react-native', () => ({
  InteractionManager: {
    runAfterInteractions: mockRunAfterInteractions,
  },
  AppState: {
    addEventListener: mockAddEventListener,
  },
}));

// Test constants
const TEST_SCREENSHOT_FILENAME = 'Screenshot_2024-01-15.png';
const TEST_REGULAR_FILENAME = 'IMG_vacation.jpg';
const TEST_SCREENSHOT_WIDTH = 1170;
const TEST_SCREENSHOT_HEIGHT = 2532;
const TEST_PHOTO_WIDTH = 3024;
const TEST_PHOTO_HEIGHT = 4032;

describe('detectScreenshot', () => {
  const createAsset = (overrides: Partial<Asset> = {}): Asset =>
    ({
      id: 'test-id',
      uri: 'file://test.jpg',
      width: TEST_PHOTO_WIDTH,
      height: TEST_PHOTO_HEIGHT,
      ...overrides,
    }) as Asset;

  it('should detect screenshot by filename', () => {
    const asset = createAsset({ filename: TEST_SCREENSHOT_FILENAME });
    expect(detectScreenshot(asset)).toBe(true);
  });

  it('should detect screenshot by filename case-insensitive', () => {
    const asset = createAsset({ filename: 'my_SCREENSHOT_file.jpg' });
    expect(detectScreenshot(asset)).toBe(true);
  });

  it('should detect screenshot by iOS mediaSubtype', () => {
    const asset = createAsset({
      filename: 'IMG_1234.png',
      mediaSubtypes: ['screenshot'],
    } as Asset & { mediaSubtypes: string[] });
    expect(detectScreenshot(asset)).toBe(true);
  });

  it('should detect screenshot by exact resolution', () => {
    const asset = createAsset({
      width: TEST_SCREENSHOT_WIDTH,
      height: TEST_SCREENSHOT_HEIGHT,
    });
    expect(detectScreenshot(asset)).toBe(true);
  });

  it('should detect screenshot in landscape orientation', () => {
    const asset = createAsset({
      width: TEST_SCREENSHOT_HEIGHT,
      height: TEST_SCREENSHOT_WIDTH,
    });
    expect(detectScreenshot(asset)).toBe(true);
  });

  it('should detect when multiple criteria match', () => {
    const asset = createAsset({
      filename: TEST_SCREENSHOT_FILENAME,
      width: TEST_SCREENSHOT_WIDTH,
      height: TEST_SCREENSHOT_HEIGHT,
      mediaSubtypes: ['screenshot'],
    } as Asset & { mediaSubtypes: string[] });
    expect(detectScreenshot(asset)).toBe(true);
  });

  it('should not detect regular photo as screenshot', () => {
    const asset = createAsset({ filename: TEST_REGULAR_FILENAME });
    expect(detectScreenshot(asset)).toBe(false);
  });

  it('should handle missing filename gracefully', () => {
    const asset = createAsset({ filename: undefined });
    expect(detectScreenshot(asset)).toBe(false);
  });

  it('should handle missing dimensions gracefully', () => {
    const asset = createAsset({ width: 0, height: 0 });
    expect(detectScreenshot(asset)).toBe(false);
  });
});

describe('checkCanIndex', () => {
  it('should allow indexing for granted permission', () => {
    const result = checkCanIndex('granted');
    expect(result.canIndex).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it('should allow indexing for limited permission', () => {
    const result = checkCanIndex('limited');
    expect(result.canIndex).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it('should not allow indexing for undetermined permission', () => {
    const result = checkCanIndex('undetermined');
    expect(result.canIndex).toBe(false);
    expect(result.reason).toBe('Permissions not granted');
  });
});

describe('mapAssetToDBSchema', () => {
  it('should map asset to DB schema correctly', () => {
    const asset = {
      uri: 'file://photo.jpg',
      filename: 'photo.jpg',
      width: 1920,
      height: 1080,
      creationTime: 1700000000000,
    } as Asset;

    const timestamp = Date.now();
    const result = mapAssetToDBSchema(asset, timestamp);

    expect(result).toEqual({
      uri: 'file://photo.jpg',
      filename: 'photo.jpg',
      size_bytes: null,
      width: 1920,
      height: 1080,
      created_at: 1700000000000,
      is_screenshot: 0,
    });
  });

  it('should use timestamp fallback when creationTime is missing', () => {
    const asset = {
      uri: 'file://photo.jpg',
    } as Asset;

    const timestamp = 1700000000000;
    const result = mapAssetToDBSchema(asset, timestamp);

    expect(result.created_at).toBe(timestamp);
  });

  it('should detect screenshot in mapping', () => {
    const asset = {
      uri: 'file://screenshot.png',
      filename: TEST_SCREENSHOT_FILENAME,
      width: TEST_SCREENSHOT_WIDTH,
      height: TEST_SCREENSHOT_HEIGHT,
    } as Asset;

    const result = mapAssetToDBSchema(asset, Date.now());
    expect(result.is_screenshot).toBe(1);
  });
});

describe('processAssetBatch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should insert assets in batch', async () => {
    const rows = [
      {
        uri: 'file://1.jpg',
        filename: '1.jpg',
        size_bytes: null,
        width: 100,
        height: 100,
        created_at: 1,
        is_screenshot: 0,
      },
      {
        uri: 'file://2.jpg',
        filename: '2.jpg',
        size_bytes: null,
        width: 200,
        height: 200,
        created_at: 2,
        is_screenshot: 0,
      },
    ];

    await processAssetBatch(rows);

    expect(insertAssets).toHaveBeenCalledWith(rows);
  });

  it('should skip empty batches', async () => {
    await processAssetBatch([]);
    expect(insertAssets).not.toHaveBeenCalled();
  });

  it('should throw on insert failure', async () => {
    const error = new Error('DB Error');
    (insertAssets as jest.Mock).mockRejectedValueOnce(error);

    const rows = [
      {
        uri: 'file://fail.jpg',
        filename: null,
        size_bytes: null,
        width: null,
        height: null,
        created_at: 1,
        is_screenshot: 0,
      },
    ];

    await expect(processAssetBatch(rows)).rejects.toThrow('DB Error');
  });
});

describe('updateIndexProgress', () => {
  let mockStore: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    __testing.resetLastProgressPercent();

    mockStore = jest.fn();
    (useIndexStore.getState as jest.Mock).mockReturnValue({
      setProgress: mockStore,
    });
  });

  it('should update progress when percentage changes', () => {
    updateIndexProgress(100, 0);
    expect(mockStore).toHaveBeenCalledWith(100, 0);

    updateIndexProgress(100, 1);
    expect(mockStore).toHaveBeenCalledWith(100, 1);

    expect(mockStore).toHaveBeenCalledTimes(2);
  });

  it('should not update when percentage stays same', () => {
    updateIndexProgress(100, 10);
    expect(mockStore).toHaveBeenCalledTimes(1);

    updateIndexProgress(100, 10);
    expect(mockStore).toHaveBeenCalledTimes(1); // Still 1, not updated
  });

  it('should ensure monotonic progression', () => {
    const calls: number[] = [];
    mockStore.mockImplementation((total, indexed) => {
      calls.push(indexed);
    });

    updateIndexProgress(100, 0);
    updateIndexProgress(100, 25);
    updateIndexProgress(100, 50);
    updateIndexProgress(100, 75);
    updateIndexProgress(100, 100);

    // Check all values are increasing
    for (let i = 1; i < calls.length; i++) {
      expect(calls[i]).toBeGreaterThanOrEqual(calls[i - 1]);
    }
  });
});

describe('runInitialIndex', () => {
  let mockStore: {
    running: boolean;
    currentRunId?: string;
    setRunId: jest.Mock;
    setRunning: jest.Mock;
    setPaused: jest.Mock;
    setLimitedScope: jest.Mock;
    setLimitedCount: jest.Mock;
    setLastError: jest.Mock;
    setProgress: jest.Mock;
    setLastSuccessfulBatch: jest.Mock;
    resetRunState: jest.Mock;
  };
  let mockPermStore: {
    status: 'granted' | 'limited' | 'undetermined';
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset module state
    __testing.setCurrentControl(null);
    __testing.setIsStarting(false);
    __testing.resetLastProgressPercent();

    // Mock store state
    mockStore = {
      running: false,
      currentRunId: undefined,
      setRunId: jest.fn(),
      setRunning: jest.fn(),
      setPaused: jest.fn(),
      setLimitedScope: jest.fn(),
      setLimitedCount: jest.fn(),
      setLastError: jest.fn(),
      setProgress: jest.fn(),
      setLastSuccessfulBatch: jest.fn(),
      resetRunState: jest.fn(),
    };

    mockPermStore = {
      status: 'granted',
    };

    (useIndexStore.getState as jest.Mock).mockReturnValue(mockStore);
    (usePermissions.getState as jest.Mock).mockReturnValue(mockPermStore);
    (getAssetCount as jest.Mock).mockResolvedValue(0);
    (MediaLibrary.getAssetsAsync as jest.Mock).mockResolvedValue({
      assets: [],
      endCursor: undefined,
      totalCount: 0,
      hasNextPage: false,
    });

    // Mock InteractionManager to resolve immediately
    mockRunAfterInteractions.mockImplementation(() => Promise.resolve());
  });

  it('should handle limited access correctly with count', async () => {
    mockPermStore.status = 'limited';
    (MediaLibrary.getAssetsAsync as jest.Mock).mockResolvedValueOnce({
      assets: [],
      totalCount: 150,
      hasNextPage: false,
    });

    await runInitialIndex();

    expect(mockStore.setLimitedScope).toHaveBeenCalledWith(true);
    expect(mockStore.setLimitedCount).toHaveBeenCalledWith(150);
  });

  it('should return existing control if already running', async () => {
    mockStore.running = true;
    mockStore.currentRunId = 'existing-run';
    const existingControl = __testing.createIndexControl('existing-run');
    __testing.setCurrentControl(existingControl);

    const control = await runInitialIndex();

    expect(control.runId).toBe('existing-run');
    expect(mockStore.setRunId).not.toHaveBeenCalled();
  });

  it('should handle cancellation mid-run and cleanup', async () => {
    let callCount = 0;
    (MediaLibrary.getAssetsAsync as jest.Mock).mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({
          assets: [{ uri: 'file://1.jpg' }],
          totalCount: 100,
          hasNextPage: true,
          endCursor: 'cursor1',
        });
      }
      return Promise.resolve({
        assets: [{ uri: 'file://2.jpg' }],
        totalCount: 100,
        hasNextPage: false,
      });
    });

    const control = await runInitialIndex();

    // Cancel immediately
    control.cancel();

    // Wait for completion
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Should have cleaned up
    expect(mockStore.resetRunState).toHaveBeenCalled();
    expect(__testing.getCurrentControl()).toBeNull();
  });

  it('should prevent concurrent starts with lock', async () => {
    mockStore.running = false;
    mockStore.currentRunId = undefined;

    (MediaLibrary.getAssetsAsync as jest.Mock).mockResolvedValue({
      assets: [{ uri: 'file://test.jpg' }],
      totalCount: 1,
      hasNextPage: false,
    });

    // Start two runs simultaneously
    const [control1, control2] = await Promise.all([runInitialIndex(), runInitialIndex()]);

    // Second call should return existing control
    expect(control1.runId).toBeTruthy();
    expect(control2.runId).toBe(control1.runId);

    // Only one run should have executed
    expect(mockStore.setRunId).toHaveBeenCalledTimes(1);
  });

  it('should yield using InteractionManager between batches', async () => {
    (MediaLibrary.getAssetsAsync as jest.Mock)
      .mockResolvedValueOnce({
        assets: [],
        totalCount: 2,
        hasNextPage: true,
        endCursor: 'c1',
      })
      .mockResolvedValueOnce({
        assets: [{ uri: '1' }],
        totalCount: 2,
        hasNextPage: true,
        endCursor: 'c2',
      })
      .mockResolvedValueOnce({
        assets: [{ uri: '2' }],
        totalCount: 2,
        hasNextPage: false,
      });

    await runInitialIndex({ pageSize: 1 });

    // Should have yielded between batches
    expect(mockRunAfterInteractions).toHaveBeenCalledTimes(2);
  });

  it('should handle AppState transitions', async () => {
    let appStateCallback: ((state: string) => void) | null = null;
    mockAddEventListener.mockImplementation((event, callback) => {
      if (event === 'change') {
        appStateCallback = callback;
      }
      return { remove: jest.fn() };
    });

    const control = await runInitialIndex();

    // Simulate background
    appStateCallback?.('background');
    expect(control.isPaused()).toBe(true);

    // Simulate active
    appStateCallback?.('active');
    expect(control.isPaused()).toBe(false);
  });

  it('should cleanup AppState subscription on error', async () => {
    const mockRemove = jest.fn();
    mockAddEventListener.mockReturnValue({ remove: mockRemove });

    // Make indexing fail
    (MediaLibrary.getAssetsAsync as jest.Mock).mockRejectedValueOnce(new Error('Test error'));

    await runInitialIndex();

    // AppState subscription should be cleaned up
    expect(mockRemove).toHaveBeenCalled();
  });

  it('should update progress monotonically', async () => {
    const progressUpdates: number[] = [];
    mockStore.setProgress = jest.fn((total, indexed) => {
      progressUpdates.push(indexed);
    });

    (MediaLibrary.getAssetsAsync as jest.Mock)
      .mockResolvedValueOnce({
        assets: [],
        totalCount: 3,
        hasNextPage: true,
        endCursor: 'c1',
      })
      .mockResolvedValueOnce({
        assets: [{ uri: '1' }, { uri: '2' }],
        totalCount: 3,
        hasNextPage: true,
        endCursor: 'c2',
      })
      .mockResolvedValueOnce({
        assets: [{ uri: '3' }],
        totalCount: 3,
        hasNextPage: false,
      });

    await runInitialIndex({ pageSize: 2 });

    // Progress should increase monotonically
    for (let i = 1; i < progressUpdates.length; i++) {
      expect(progressUpdates[i]).toBeGreaterThanOrEqual(progressUpdates[i - 1]);
    }
  });

  it('should record successful batch timestamps', async () => {
    (MediaLibrary.getAssetsAsync as jest.Mock)
      .mockResolvedValueOnce({
        assets: [],
        totalCount: 1,
        hasNextPage: true,
        endCursor: 'c1',
      })
      .mockResolvedValueOnce({
        assets: [{ uri: '1' }],
        totalCount: 1,
        hasNextPage: false,
      });

    await runInitialIndex();

    expect(mockStore.setLastSuccessfulBatch).toHaveBeenCalled();
    const timestamp = mockStore.setLastSuccessfulBatch.mock.calls[0][0];
    expect(timestamp).toBeGreaterThan(0);
  });
});
