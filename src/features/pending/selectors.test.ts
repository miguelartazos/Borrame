import { db } from '../../db';
import {
  getPendingAssets,
  getPendingCount,
  getPendingSpaceEstimate,
  removePendingIntents,
  restoreAllPending,
} from './selectors';

jest.mock('../../db');

describe('pending selectors', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getPendingAssets', () => {
    it('should return assets with delete intents', async () => {
      const mockAssets = [
        {
          id: 'asset-1',
          uri: 'file://photo1.jpg',
          filename: 'photo1.jpg',
          size_bytes: 1000,
          width: 100,
          height: 100,
          created_at: Date.now(),
          is_screenshot: 0,
          intentId: 'intent-1',
          intentCreatedAt: Date.now(),
        },
      ];

      (db.getAllAsync as jest.Mock).mockResolvedValue(mockAssets);

      const result = await getPendingAssets();

      expect(db.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining("WHERE i.action = 'delete'")
      );
      expect(result).toEqual(mockAssets);
    });
  });

  describe('getPendingCount', () => {
    it('should return count of pending deletions', async () => {
      (db.getFirstAsync as jest.Mock).mockResolvedValue({ count: 42 });

      const result = await getPendingCount();

      expect(db.getFirstAsync).toHaveBeenCalledWith(
        expect.stringContaining("WHERE action = 'delete'")
      );
      expect(result).toBe(42);
    });

    it('should return 0 when no pending deletions', async () => {
      (db.getFirstAsync as jest.Mock).mockResolvedValue(null);

      const result = await getPendingCount();

      expect(result).toBe(0);
    });
  });

  describe('getPendingSpaceEstimate', () => {
    it('should return total size of pending deletions', async () => {
      (db.getFirstAsync as jest.Mock).mockResolvedValue({ total: 5000000 });

      const result = await getPendingSpaceEstimate();

      expect(db.getFirstAsync).toHaveBeenCalledWith(expect.stringContaining('SUM(a.size_bytes)'));
      expect(result).toBe(5000000);
    });

    it('should return 0 when no size data available', async () => {
      (db.getFirstAsync as jest.Mock).mockResolvedValue({ total: null });

      const result = await getPendingSpaceEstimate();

      expect(result).toBe(0);
    });
  });

  describe('removePendingIntents', () => {
    it('should remove specific intents', async () => {
      const assetIds = ['asset-1', 'asset-2', 'asset-3'];

      await removePendingIntents(assetIds);

      expect(db.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM intents WHERE asset_id IN (?,?,?)'),
        assetIds
      );
    });

    it('should handle empty array', async () => {
      await removePendingIntents([]);

      expect(db.runAsync).not.toHaveBeenCalled();
    });
  });

  describe('restoreAllPending', () => {
    it('should remove all delete intents', async () => {
      await restoreAllPending();

      expect(db.runAsync).toHaveBeenCalledWith(`DELETE FROM intents WHERE action = 'delete'`);
    });
  });
});
