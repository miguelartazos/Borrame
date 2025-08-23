/**
 * Tests for useHomeData hook
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { InteractionManager } from 'react-native';
import { useHomeData } from './useHomeData';
import * as homeMocks from '../data/homeMocks';

// Test constants
const TEST_SPACE_MB = 1500;
const TEST_SPACE_GB_MB = 2048; // 2GB in MB
const TEST_SPACE_SMALL_MB = 500;
const TEST_PHOTOS_COUNT = 5000;
const TEST_VIDEOS_COUNT = 200;
const TEST_CHIP_COUNT_ALL = 1000;
const TEST_CHIP_COUNT_SCREENSHOTS = 200;
const TEST_CHIP_COUNT_BLURRY = 50;
const TEST_PROGRESS_HALF = 0.5;
const TEST_PROGRESS_FULL = 1.0;

// Mock InteractionManager
jest.mock('react-native', () => ({
  InteractionManager: {
    runAfterInteractions: jest.fn((callback) => {
      callback();
      return { cancel: jest.fn() };
    }),
  },
}));

// Mock the data module
jest.mock('../data/homeMocks', () => ({
  getInstantMockData: jest.fn(),
  generateHomeData: jest.fn(),
  simulateScan: jest.fn(),
}));

describe('useHomeData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    (homeMocks.getInstantMockData as jest.Mock).mockReturnValue({
      progress: TEST_PROGRESS_FULL,
      spaceReadyMB: TEST_SPACE_MB,
      chips: [
        { id: 'all', label: 'All', count: TEST_CHIP_COUNT_ALL, active: true },
        {
          id: 'screenshots',
          label: 'Screenshots',
          count: TEST_CHIP_COUNT_SCREENSHOTS,
          active: false,
        },
      ],
      bundles: [],
      months: [],
      totalPhotos: TEST_PHOTOS_COUNT,
      totalVideos: TEST_VIDEOS_COUNT,
      lastScanDate: new Date(),
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should load initial data after interactions', async () => {
    const { result } = renderHook(() => useHomeData());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeTruthy();
    expect(result.current.progress).toBe(TEST_PROGRESS_FULL);
    expect(result.current.spaceReadyMB).toBe(TEST_SPACE_MB);
    expect(InteractionManager.runAfterInteractions).toHaveBeenCalled();
  });

  it('should format space correctly for GB', () => {
    (homeMocks.getInstantMockData as jest.Mock).mockReturnValue({
      progress: TEST_PROGRESS_FULL,
      spaceReadyMB: TEST_SPACE_GB_MB,
      chips: [],
      bundles: [],
      months: [],
      totalPhotos: TEST_PHOTOS_COUNT,
      totalVideos: TEST_VIDEOS_COUNT,
      lastScanDate: new Date(),
    });

    const { result } = renderHook(() => useHomeData());

    waitFor(() => {
      expect(result.current.spaceReadyFormatted).toBe('2.0 GB');
    });
  });

  it('should format space correctly for MB', () => {
    (homeMocks.getInstantMockData as jest.Mock).mockReturnValue({
      progress: TEST_PROGRESS_FULL,
      spaceReadyMB: TEST_SPACE_SMALL_MB,
      chips: [],
      bundles: [],
      months: [],
      totalPhotos: TEST_PHOTOS_COUNT,
      totalVideos: TEST_VIDEOS_COUNT,
      lastScanDate: new Date(),
    });

    const { result } = renderHook(() => useHomeData());

    waitFor(() => {
      expect(result.current.spaceReadyFormatted).toBe('500 MB');
    });
  });

  it('should handle chip selection', async () => {
    const { result } = renderHook(() => useHomeData());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.selectChip('screenshots');
    });

    expect(result.current.activeChipId).toBe('screenshots');
    expect(result.current.chips.find((c) => c.id === 'screenshots')?.active).toBe(true);
    expect(result.current.chips.find((c) => c.id === 'all')?.active).toBe(false);
  });

  it('should start scan and update progress', async () => {
    (homeMocks.simulateScan as jest.Mock).mockImplementation(async (onProgress) => {
      onProgress(TEST_PROGRESS_HALF, {
        progress: TEST_PROGRESS_HALF,
        spaceReadyMB: TEST_CHIP_COUNT_ALL,
        chips: [],
        bundles: [],
        months: [],
      });
      return {
        progress: TEST_PROGRESS_FULL,
        spaceReadyMB: TEST_SPACE_MB,
        chips: [],
        bundles: [],
        months: [],
      };
    });

    const { result } = renderHook(() => useHomeData());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      result.current.startScan();
      jest.runAllTimers();
    });

    expect(homeMocks.simulateScan).toHaveBeenCalled();
    expect(result.current.isScanning).toBe(false);
  });

  it('should refresh data without animation', async () => {
    const TEST_NEW_SPACE_MB = 2000;
    const TEST_NEW_PHOTOS = 6000;
    const TEST_NEW_VIDEOS = 300;

    (homeMocks.generateHomeData as jest.Mock).mockReturnValue({
      progress: 0,
      spaceReadyMB: TEST_NEW_SPACE_MB,
      chips: [],
      bundles: [],
      months: [],
      totalPhotos: TEST_NEW_PHOTOS,
      totalVideos: TEST_NEW_VIDEOS,
    });

    const { result } = renderHook(() => useHomeData());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.refreshData();
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(result.current.data?.spaceReadyMB).toBe(TEST_NEW_SPACE_MB);
    });

    expect(result.current.progress).toBe(TEST_PROGRESS_FULL);
    expect(result.current.data?.lastScanDate).toBeTruthy();
  });

  it('should calculate total items count correctly', async () => {
    const TOTAL_EXPECTED =
      TEST_CHIP_COUNT_ALL + TEST_CHIP_COUNT_SCREENSHOTS + TEST_CHIP_COUNT_BLURRY;

    (homeMocks.getInstantMockData as jest.Mock).mockReturnValue({
      progress: TEST_PROGRESS_FULL,
      spaceReadyMB: TEST_SPACE_MB,
      chips: [
        { id: 'all', label: 'All', count: TEST_CHIP_COUNT_ALL, active: true },
        {
          id: 'screenshots',
          label: 'Screenshots',
          count: TEST_CHIP_COUNT_SCREENSHOTS,
          active: false,
        },
        { id: 'blurry', label: 'Blurry', count: TEST_CHIP_COUNT_BLURRY, active: false },
      ],
      bundles: [],
      months: [],
      totalPhotos: TEST_PHOTOS_COUNT,
      totalVideos: TEST_VIDEOS_COUNT,
      lastScanDate: new Date(),
    });

    const { result } = renderHook(() => useHomeData());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.totalItemsCount).toBe(TOTAL_EXPECTED);
  });

  it('should determine canClean correctly', async () => {
    const { result } = renderHook(() => useHomeData());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.canClean).toBe(true);

    // Test when scanning
    act(() => {
      result.current.startScan();
    });
    expect(result.current.canClean).toBe(false);
  });

  it('should handle errors during data loading', async () => {
    const testError = new Error('Failed to load data');
    (homeMocks.getInstantMockData as jest.Mock).mockImplementation(() => {
      throw testError;
    });

    const { result } = renderHook(() => useHomeData());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toEqual(testError);
    expect(result.current.data).toBeNull();
  });

  it('should cleanup on unmount', () => {
    const cancelMock = jest.fn();
    (InteractionManager.runAfterInteractions as jest.Mock).mockReturnValue({
      cancel: cancelMock,
    });

    const { unmount } = renderHook(() => useHomeData());

    unmount();

    expect(cancelMock).toHaveBeenCalled();
  });

  describe('invariants and edge cases', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      // Reset mocks for edge case tests
      (InteractionManager.runAfterInteractions as jest.Mock).mockImplementation((callback) => {
        callback();
        return { cancel: jest.fn() };
      });
    });

    it('should ensure progress is always between 0 and 1', async () => {
      const INVALID_PROGRESS_NEGATIVE = -0.5;
      const INVALID_PROGRESS_OVER = 1.5;

      (homeMocks.simulateScan as jest.Mock).mockImplementation(async (onProgress) => {
        // Try to set invalid progress values
        onProgress(INVALID_PROGRESS_NEGATIVE, {
          progress: INVALID_PROGRESS_NEGATIVE,
          spaceReadyMB: TEST_SPACE_MB,
          chips: [],
          bundles: [],
          months: [],
        });
        onProgress(INVALID_PROGRESS_OVER, {
          progress: INVALID_PROGRESS_OVER,
          spaceReadyMB: TEST_SPACE_MB,
          chips: [],
          bundles: [],
          months: [],
        });
      });

      const { result } = renderHook(() => useHomeData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        result.current.startScan();
        jest.runAllTimers();
      });

      // Progress should be clamped to valid range
      expect(result.current.progress).toBeGreaterThanOrEqual(0);
      expect(result.current.progress).toBeLessThanOrEqual(1);
    });

    it('should handle negative space values gracefully', async () => {
      const NEGATIVE_SPACE = -500;

      (homeMocks.getInstantMockData as jest.Mock).mockReturnValue({
        progress: TEST_PROGRESS_FULL,
        spaceReadyMB: NEGATIVE_SPACE,
        chips: [],
        bundles: [],
        months: [],
        totalPhotos: TEST_PHOTOS_COUNT,
        totalVideos: TEST_VIDEOS_COUNT,
        lastScanDate: new Date(),
      });

      const { result } = renderHook(() => useHomeData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should format negative space as 0
      expect(result.current.spaceReadyFormatted).toBe('0 MB');
      expect(result.current.spaceReadyMB).toBe(NEGATIVE_SPACE);
    });

    it('should handle empty chips array', async () => {
      (homeMocks.getInstantMockData as jest.Mock).mockReturnValue({
        progress: TEST_PROGRESS_FULL,
        spaceReadyMB: TEST_SPACE_MB,
        chips: [],
        bundles: [],
        months: [],
        totalPhotos: 0,
        totalVideos: 0,
        lastScanDate: new Date(),
      });

      const { result } = renderHook(() => useHomeData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.chips).toEqual([]);
      expect(result.current.totalItemsCount).toBe(0);
      expect(result.current.canClean).toBe(false); // Can't clean with no items
    });

    it('should handle null data gracefully', async () => {
      (homeMocks.getInstantMockData as jest.Mock).mockReturnValue(null);

      const { result } = renderHook(() => useHomeData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toBeNull();
      expect(result.current.progress).toBe(0);
      expect(result.current.spaceReadyMB).toBe(0);
      expect(result.current.chips).toEqual([]);
      expect(result.current.bundles).toEqual([]);
      expect(result.current.months).toEqual([]);
    });

    it('should format very large numbers correctly', async () => {
      const VERY_LARGE_MB = 1000000; // 1 TB
      const VERY_LARGE_COUNT = 10000000; // 10M

      (homeMocks.getInstantMockData as jest.Mock).mockReturnValue({
        progress: TEST_PROGRESS_FULL,
        spaceReadyMB: VERY_LARGE_MB,
        chips: [{ id: 'all', label: 'All', count: VERY_LARGE_COUNT, active: true }],
        bundles: [],
        months: [],
        totalPhotos: VERY_LARGE_COUNT,
        totalVideos: TEST_VIDEOS_COUNT,
        lastScanDate: new Date(),
      });

      const { result } = renderHook(() => useHomeData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.spaceReadyFormatted).toBe('976.6 GB');
      expect(result.current.chips[0].displayCount).toBe('10.0M');
    });
  });
});
