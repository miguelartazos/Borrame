import * as MediaLibrary from 'expo-media-library';
import { DeletionService } from './DeletionService';
import { removePendingIntents } from '../features/pending/selectors';
import { InteractionManager } from 'react-native';

jest.mock('expo-media-library');
jest.mock('../features/pending/selectors');
jest.mock('react-native', () => ({
  InteractionManager: {
    runAfterInteractions: jest.fn((callback) => callback()),
  },
}));
jest.mock('../lib/analytics', () => ({
  analytics: { track: jest.fn() },
}));

describe('DeletionService', () => {
  let service: DeletionService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DeletionService();
  });

  describe('executeDelete', () => {
    it('should delete assets in chunks', async () => {
      const assets = Array.from({ length: 120 }, (_, i) => ({
        id: `asset-${i}`,
        size_bytes: 1000,
      }));

      (MediaLibrary.deleteAssetsAsync as jest.Mock).mockResolvedValue(true);
      (removePendingIntents as jest.Mock).mockResolvedValue(undefined);

      const result = await service.executeDelete(assets);

      expect(MediaLibrary.deleteAssetsAsync).toHaveBeenCalledTimes(3);
      expect(MediaLibrary.deleteAssetsAsync).toHaveBeenNthCalledWith(
        1,
        assets.slice(0, 50).map((a) => a.id)
      );
      expect(MediaLibrary.deleteAssetsAsync).toHaveBeenNthCalledWith(
        2,
        assets.slice(50, 100).map((a) => a.id)
      );
      expect(MediaLibrary.deleteAssetsAsync).toHaveBeenNthCalledWith(
        3,
        assets.slice(100, 120).map((a) => a.id)
      );

      expect(result).toEqual({
        successCount: 120,
        failureCount: 0,
        failedIds: [],
        totalBytes: 120000,
      });
    });

    it('should handle partial failures', async () => {
      const assets = [
        { id: 'asset-1', size_bytes: 1000 },
        { id: 'asset-2', size_bytes: 2000 },
        { id: 'asset-3', size_bytes: 3000 },
      ];

      (MediaLibrary.deleteAssetsAsync as jest.Mock)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);

      const result = await service.executeDelete(assets);

      expect(result).toEqual({
        successCount: 2,
        failureCount: 1,
        failedIds: ['asset-2'],
        totalBytes: 4000,
      });

      expect(removePendingIntents).toHaveBeenCalledWith(['asset-1']);
      expect(removePendingIntents).toHaveBeenCalledWith(['asset-3']);
    });

    it('should handle permission errors', async () => {
      const assets = [{ id: 'asset-1', size_bytes: 1000 }];
      const permissionError = new Error('User denied permission');

      (MediaLibrary.deleteAssetsAsync as jest.Mock).mockRejectedValue(permissionError);

      await expect(service.executeDelete(assets)).rejects.toThrow('permission');
    });

    it('should yield to UI between chunks', async () => {
      const assets = Array.from({ length: 60 }, (_, i) => ({
        id: `asset-${i}`,
        size_bytes: 1000,
      }));

      (MediaLibrary.deleteAssetsAsync as jest.Mock).mockResolvedValue(true);

      await service.executeDelete(assets);

      expect(InteractionManager.runAfterInteractions).toHaveBeenCalledTimes(2);
    });

    it('should calculate total bytes correctly', async () => {
      const assets = [
        { id: 'asset-1', size_bytes: 1500 },
        { id: 'asset-2', size_bytes: null },
        { id: 'asset-3', size_bytes: 2500 },
      ];

      (MediaLibrary.deleteAssetsAsync as jest.Mock).mockResolvedValue(true);

      const result = await service.executeDelete(assets);

      expect(result.totalBytes).toBe(4000);
    });
  });

  describe('retryFailed', () => {
    it('should retry failed asset deletions', async () => {
      const failedIds = ['asset-1', 'asset-2'];

      (MediaLibrary.deleteAssetsAsync as jest.Mock).mockResolvedValue(true);

      const result = await service.retryFailed(failedIds);

      expect(MediaLibrary.deleteAssetsAsync).toHaveBeenCalledWith(failedIds);
      expect(result.successCount).toBe(2);
    });
  });
});
