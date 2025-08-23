/**
 * Tests for haptic feedback when bundle scanning completes
 */

import * as Haptics from 'expo-haptics';
import { useSettings } from '../../store/useSettings';
import { runInitialIndex } from './indexer';
import * as MediaLibrary from 'expo-media-library';

// Mock dependencies
jest.mock('expo-haptics');
jest.mock('expo-media-library');
jest.mock('../../store/useSettings');
jest.mock('../../store/useIndexStore', () => ({
  useIndexStore: {
    getState: jest.fn(() => ({
      running: false,
      currentRunId: null,
      setRunning: jest.fn(),
      setTotal: jest.fn(),
      setIndexed: jest.fn(),
      setCurrentRunId: jest.fn(),
      resetRunState: jest.fn(),
      setLastSuccessfulBatch: jest.fn(),
      setLastError: jest.fn(),
    })),
  },
}));
jest.mock('../../store/usePermissions', () => ({
  usePermissions: {
    getState: jest.fn(() => ({
      status: 'granted',
    })),
  },
}));
jest.mock('../../db/helpers', () => ({
  insertAssets: jest.fn().mockResolvedValue(undefined),
  getAssetCount: jest.fn().mockResolvedValue(0),
}));

const mockHaptics = Haptics as jest.Mocked<typeof Haptics>;
const mockUseSettings = useSettings as jest.MockedFunction<typeof useSettings>;

describe('Indexer - Haptic Feedback', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock setup
    (MediaLibrary.getAssetsAsync as jest.Mock).mockResolvedValue({
      assets: [],
      endCursor: null,
      hasNextPage: false,
      totalCount: 0,
    });
  });

  describe('bundle scanning completion', () => {
    it('triggers haptic feedback when scanning completes with assets', async () => {
      // Mock settings to enable haptic feedback
      mockUseSettings.getState = jest.fn().mockReturnValue({
        hapticFeedback: true,
      });

      // Mock some assets to be indexed
      (MediaLibrary.getAssetsAsync as jest.Mock).mockResolvedValueOnce({
        assets: [
          { id: '1', filename: 'photo1.jpg', uri: 'uri1', width: 100, height: 100 },
          { id: '2', filename: 'photo2.jpg', uri: 'uri2', width: 100, height: 100 },
        ],
        endCursor: null,
        hasNextPage: false,
        totalCount: 2,
      });

      // Run indexing
      await runInitialIndex();

      // Should trigger light impact haptic
      expect(mockHaptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
      expect(mockHaptics.impactAsync).toHaveBeenCalledTimes(1);
    });

    it('does not trigger haptic when feedback is disabled', async () => {
      // Mock settings to disable haptic feedback
      mockUseSettings.getState = jest.fn().mockReturnValue({
        hapticFeedback: false,
      });

      // Mock some assets
      (MediaLibrary.getAssetsAsync as jest.Mock).mockResolvedValueOnce({
        assets: [{ id: '1', filename: 'photo.jpg', uri: 'uri1', width: 100, height: 100 }],
        endCursor: null,
        hasNextPage: false,
        totalCount: 1,
      });

      await runInitialIndex();

      // Should not trigger haptic
      expect(mockHaptics.impactAsync).not.toHaveBeenCalled();
    });

    it('does not trigger haptic when no assets are indexed', async () => {
      mockUseSettings.getState = jest.fn().mockReturnValue({
        hapticFeedback: true,
      });

      // Mock empty asset list
      (MediaLibrary.getAssetsAsync as jest.Mock).mockResolvedValueOnce({
        assets: [],
        endCursor: null,
        hasNextPage: false,
        totalCount: 0,
      });

      await runInitialIndex();

      // Should not trigger haptic for empty indexing
      expect(mockHaptics.impactAsync).not.toHaveBeenCalled();
    });

    it('handles haptic errors gracefully', async () => {
      mockUseSettings.getState = jest.fn().mockReturnValue({
        hapticFeedback: true,
      });

      // Mock haptic to throw error
      mockHaptics.impactAsync.mockRejectedValueOnce(new Error('Haptic not supported'));

      // Mock some assets
      (MediaLibrary.getAssetsAsync as jest.Mock).mockResolvedValueOnce({
        assets: [{ id: '1', filename: 'photo.jpg', uri: 'uri1', width: 100, height: 100 }],
        endCursor: null,
        hasNextPage: false,
        totalCount: 1,
      });

      // Should not throw even if haptic fails
      await expect(runInitialIndex()).resolves.not.toThrow();

      // Haptic was attempted
      expect(mockHaptics.impactAsync).toHaveBeenCalledTimes(1);
    });

    it('triggers haptic only once for multi-batch indexing', async () => {
      mockUseSettings.getState = jest.fn().mockReturnValue({
        hapticFeedback: true,
      });

      // Mock multiple batches
      (MediaLibrary.getAssetsAsync as jest.Mock)
        .mockResolvedValueOnce({
          assets: Array(50)
            .fill(null)
            .map((_, i) => ({
              id: `${i}`,
              filename: `photo${i}.jpg`,
              uri: `uri${i}`,
              width: 100,
              height: 100,
            })),
          endCursor: 'cursor1',
          hasNextPage: true,
          totalCount: 100,
        })
        .mockResolvedValueOnce({
          assets: Array(50)
            .fill(null)
            .map((_, i) => ({
              id: `${i + 50}`,
              filename: `photo${i + 50}.jpg`,
              uri: `uri${i + 50}`,
              width: 100,
              height: 100,
            })),
          endCursor: null,
          hasNextPage: false,
          totalCount: 100,
        });

      await runInitialIndex();

      // Should trigger haptic only once at completion
      expect(mockHaptics.impactAsync).toHaveBeenCalledTimes(1);
      expect(mockHaptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    });
  });

  describe('haptic timing', () => {
    it('triggers haptic after all indexing operations complete', async () => {
      mockUseSettings.getState = jest.fn().mockReturnValue({
        hapticFeedback: true,
      });

      const callOrder: string[] = [];

      // Mock to track call order
      (MediaLibrary.getAssetsAsync as jest.Mock).mockImplementation(() => {
        callOrder.push('getAssets');
        return Promise.resolve({
          assets: [{ id: '1', filename: 'photo.jpg', uri: 'uri1', width: 100, height: 100 }],
          endCursor: null,
          hasNextPage: false,
          totalCount: 1,
        });
      });

      mockHaptics.impactAsync.mockImplementation(() => {
        callOrder.push('haptic');
        return Promise.resolve();
      });

      await runInitialIndex();

      // Haptic should be called after assets are fetched
      expect(callOrder).toEqual(['getAssets', 'haptic']);
    });
  });
});
