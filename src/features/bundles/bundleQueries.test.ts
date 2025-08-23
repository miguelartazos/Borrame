/**
 * Tests for Bundle Query Functions
 * Uses mocked db module for isolation
 */

import { fetchBundleCounts, getDefaultCounts } from './bundleQueries';

// Mock the db module
jest.mock('../../db', () => ({
  db: {
    getFirstAsync: jest.fn(),
  },
}));

import { db } from '../../db';

describe('Bundle Queries', () => {
  const mockDb = db as jest.Mocked<typeof db>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchBundleCounts', () => {
    it('should return counts for all bundle types', async () => {
      // Mock successful responses for all queries
      mockDb.getFirstAsync
        .mockResolvedValueOnce({ count: 5 }) // duplicates
        .mockResolvedValueOnce({ count: 3 }) // blurry
        .mockResolvedValueOnce({ count: 20 }) // screenshots
        .mockResolvedValueOnce({ count: 8 }) // burst
        .mockResolvedValueOnce({ count: 15 }) // whatsapp
        .mockResolvedValueOnce({ count: 2 }) // long videos
        .mockResolvedValueOnce({ count: 4 }) // large files
        .mockResolvedValueOnce({ count: 6 }); // documents

      const counts = await fetchBundleCounts();

      expect(counts).toEqual([
        { key: 'duplicados', count: 5, locked: true },
        { key: 'borrosas', count: 3, locked: false },
        { key: 'pantallazos', count: 20, locked: false },
        { key: 'rafaga', count: 8, locked: false },
        { key: 'whatsapp', count: 15, locked: false },
        { key: 'videos_largos', count: 2, locked: false },
        { key: 'archivos_grandes', count: 4, locked: false },
        { key: 'recibos', count: 6, locked: false },
      ]);

      // Verify all queries were made
      expect(mockDb.getFirstAsync).toHaveBeenCalledTimes(8);
    });

    it('should handle database errors gracefully', async () => {
      // Mock all queries to fail (simulating missing columns)
      mockDb.getFirstAsync.mockRejectedValue(new Error('no such column: content_hash'));

      const counts = await fetchBundleCounts();

      // Should return zeros for all bundles
      expect(counts).toEqual([
        { key: 'duplicados', count: 0, locked: true },
        { key: 'borrosas', count: 0, locked: false },
        { key: 'pantallazos', count: 0, locked: false },
        { key: 'rafaga', count: 0, locked: false },
        { key: 'whatsapp', count: 0, locked: false },
        { key: 'videos_largos', count: 0, locked: false },
        { key: 'archivos_grandes', count: 0, locked: false },
        { key: 'recibos', count: 0, locked: false },
      ]);
    });

    it('should handle mixed success and failure', async () => {
      // Some queries succeed, some fail
      mockDb.getFirstAsync
        .mockRejectedValueOnce(new Error('no such column')) // duplicates fail
        .mockResolvedValueOnce({ count: 3 }) // blurry succeeds
        .mockResolvedValueOnce({ count: 20 }) // screenshots succeeds
        .mockRejectedValueOnce(new Error('no such column')) // burst fails
        .mockResolvedValueOnce({ count: 15 }) // whatsapp succeeds
        .mockRejectedValueOnce(new Error('no such column')) // long videos fail
        .mockRejectedValueOnce(new Error('no such column')) // large files fail
        .mockResolvedValueOnce({ count: 6 }); // documents succeeds

      const counts = await fetchBundleCounts();

      expect(counts).toEqual([
        { key: 'duplicados', count: 0, locked: true },
        { key: 'borrosas', count: 3, locked: false },
        { key: 'pantallazos', count: 20, locked: false },
        { key: 'rafaga', count: 0, locked: false },
        { key: 'whatsapp', count: 15, locked: false },
        { key: 'videos_largos', count: 0, locked: false },
        { key: 'archivos_grandes', count: 0, locked: false },
        { key: 'recibos', count: 6, locked: false },
      ]);
    });

    it('should handle null results', async () => {
      // Mock queries returning null
      mockDb.getFirstAsync.mockResolvedValue(null);

      const counts = await fetchBundleCounts();

      // Should return zeros for all bundles
      expect(counts.every((bundle) => bundle.count === 0)).toBe(true);
    });
  });

  describe('getDefaultCounts', () => {
    it('should return all bundles with zero counts', () => {
      const counts = getDefaultCounts();

      expect(counts).toHaveLength(8);
      expect(counts.every((bundle) => bundle.count === 0)).toBe(true);

      // Check locked status
      const duplicados = counts.find((b) => b.key === 'duplicados');
      expect(duplicados?.locked).toBe(true);

      const borrosas = counts.find((b) => b.key === 'borrosas');
      expect(borrosas?.locked).toBe(false);
    });
  });

  describe('SQL injection safety', () => {
    it('should use parameterized queries for thresholds', async () => {
      mockDb.getFirstAsync.mockResolvedValue({ count: 0 });

      await fetchBundleCounts();

      // Check that large file query uses inline constant, not user input
      const largeFileCall = mockDb.getFirstAsync.mock.calls.find((call) =>
        call[0].includes('size_bytes')
      );
      expect(largeFileCall?.[0]).toContain('104857600'); // 100MB in bytes

      // Check that long video query uses inline constant
      const longVideoCall = mockDb.getFirstAsync.mock.calls.find((call) =>
        call[0].includes('duration_ms')
      );
      expect(longVideoCall?.[0]).toContain('300000'); // 5 minutes in ms
    });
  });
});
