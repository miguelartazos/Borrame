import { db } from '../../db';
import { getUndecidedAssets, getUndecidedCount, getTotalReviewedCount } from './selectors';
import type { Asset } from '../../db/schema';

jest.mock('../../db', () => ({
  db: {
    runAsync: jest.fn(),
    getAllAsync: jest.fn(),
    getFirstAsync: jest.fn(),
  },
}));

describe('Deck Selectors', () => {
  const mockAssets: Asset[] = [
    {
      id: 'asset_1',
      uri: 'file://photo1.jpg',
      filename: 'photo1.jpg',
      size_bytes: 1024000,
      width: 1920,
      height: 1080,
      created_at: Date.now(),
      is_screenshot: 0,
    },
    {
      id: 'asset_2',
      uri: 'file://screenshot1.png',
      filename: 'screenshot1.png',
      size_bytes: 512000,
      width: 1170,
      height: 2532,
      created_at: Date.now() - 86400000,
      is_screenshot: 1,
    },
    {
      id: 'asset_3',
      uri: 'file://oldphoto.jpg',
      filename: 'oldphoto.jpg',
      size_bytes: 2048000,
      width: 3024,
      height: 4032,
      created_at: Date.now() - 40 * 24 * 60 * 60 * 1000,
      is_screenshot: 0,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUndecidedAssets', () => {
    it('should return only undecided assets with all filter', async () => {
      (db.getAllAsync as jest.Mock).mockResolvedValue(mockAssets);

      const result = await getUndecidedAssets({
        filter: 'all',
        limit: 60,
        offset: 0,
      });

      expect(db.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('LEFT JOIN intents'),
        [60, 0]
      );
      expect(result).toEqual(mockAssets);
    });

    it('should filter screenshots when filter is screenshots', async () => {
      const screenshotOnly = [mockAssets[1]];
      (db.getAllAsync as jest.Mock).mockResolvedValue(screenshotOnly);

      const result = await getUndecidedAssets({
        filter: 'screenshots',
        limit: 60,
        offset: 0,
      });

      expect(db.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('is_screenshot = 1'),
        [60, 0]
      );
      expect(result).toEqual(screenshotOnly);
    });

    it('should filter recent assets when filter is recent', async () => {
      const recentOnly = mockAssets.slice(0, 2);
      (db.getAllAsync as jest.Mock).mockResolvedValue(recentOnly);

      const result = await getUndecidedAssets({
        filter: 'recent',
        limit: 60,
        offset: 0,
      });

      expect(db.getAllAsync).toHaveBeenCalledWith(expect.stringContaining('created_at >= ?'), [
        expect.any(Number),
        60,
        0,
      ]);
      expect(result).toEqual(recentOnly);
    });

    it('should respect limit and offset parameters', async () => {
      (db.getAllAsync as jest.Mock).mockResolvedValue([mockAssets[0]]);

      const result = await getUndecidedAssets({
        filter: 'all',
        limit: 1,
        offset: 10,
      });

      expect(db.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT ? OFFSET ?'),
        [1, 10]
      );
      expect(result).toHaveLength(1);
    });

    it('should order by created_at DESC', async () => {
      (db.getAllAsync as jest.Mock).mockResolvedValue(mockAssets);

      await getUndecidedAssets({
        filter: 'all',
        limit: 60,
        offset: 0,
      });

      expect(db.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY a.created_at DESC'),
        expect.any(Array)
      );
    });

    it('should filter videos when filter is videos', async () => {
      (db.getAllAsync as jest.Mock).mockResolvedValue([]);

      await getUndecidedAssets({
        filter: 'videos',
        limit: 60,
        offset: 0,
      });

      expect(db.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining("a.filename LIKE '%.mp4'"),
        [60, 0]
      );
    });

    it('should filter duplicates when filter is duplicates', async () => {
      (db.getAllAsync as jest.Mock).mockResolvedValue([]);

      await getUndecidedAssets({
        filter: 'duplicates',
        limit: 60,
        offset: 0,
      });

      expect(db.getAllAsync).toHaveBeenCalledWith(expect.stringContaining('EXISTS'), [60, 0]);
    });

    it('should handle monthFilter parameter', async () => {
      (db.getAllAsync as jest.Mock).mockResolvedValue([]);

      await getUndecidedAssets({
        filter: 'all',
        limit: 60,
        offset: 0,
        monthFilter: '2024-01',
      });

      expect(db.getAllAsync).toHaveBeenCalledWith(expect.stringContaining('strftime'), [
        '2024-01',
        60,
        0,
      ]);
    });

    it('should handle sortOrder oldest', async () => {
      (db.getAllAsync as jest.Mock).mockResolvedValue([]);

      await getUndecidedAssets({
        filter: 'all',
        limit: 60,
        offset: 0,
        sortOrder: 'oldest',
      });

      expect(db.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY a.created_at ASC'),
        [60, 0]
      );
    });
  });

  describe('getUndecidedCount', () => {
    it('should return count of undecided assets for all filter', async () => {
      (db.getFirstAsync as jest.Mock).mockResolvedValue({ count: 42 });

      const result = await getUndecidedCount('all');

      expect(db.getFirstAsync).toHaveBeenCalledWith(expect.stringContaining('COUNT(*)'), []);
      expect(result).toBe(42);
    });

    it('should return 0 when no undecided assets', async () => {
      (db.getFirstAsync as jest.Mock).mockResolvedValue(null);

      const result = await getUndecidedCount('all');

      expect(result).toBe(0);
    });

    it('should count only screenshots when filter is screenshots', async () => {
      (db.getFirstAsync as jest.Mock).mockResolvedValue({ count: 10 });

      const result = await getUndecidedCount('screenshots');

      expect(db.getFirstAsync).toHaveBeenCalledWith(
        expect.stringContaining('is_screenshot = 1'),
        []
      );
      expect(result).toBe(10);
    });

    it('should count videos when filter is videos', async () => {
      (db.getFirstAsync as jest.Mock).mockResolvedValue({ count: 5 });

      const result = await getUndecidedCount('videos');

      expect(db.getFirstAsync).toHaveBeenCalledWith(
        expect.stringContaining("a.filename LIKE '%.mp4'"),
        []
      );
      expect(result).toBe(5);
    });

    it('should count duplicates when filter is duplicates', async () => {
      (db.getFirstAsync as jest.Mock).mockResolvedValue({ count: 3 });

      const result = await getUndecidedCount('duplicates');

      expect(db.getFirstAsync).toHaveBeenCalledWith(expect.stringContaining('EXISTS'), []);
      expect(result).toBe(3);
    });

    it('should handle monthFilter parameter', async () => {
      (db.getFirstAsync as jest.Mock).mockResolvedValue({ count: 15 });

      const result = await getUndecidedCount('all', '2024-01');

      expect(db.getFirstAsync).toHaveBeenCalledWith(expect.stringContaining('strftime'), [
        '2024-01',
      ]);
      expect(result).toBe(15);
    });
  });

  describe('getTotalReviewedCount', () => {
    it('should return total count of intents', async () => {
      (db.getFirstAsync as jest.Mock).mockResolvedValue({ count: 25 });

      const result = await getTotalReviewedCount();

      expect(db.getFirstAsync).toHaveBeenCalledWith('SELECT COUNT(*) as count FROM intents');
      expect(result).toBe(25);
    });

    it('should return 0 when no intents exist', async () => {
      (db.getFirstAsync as jest.Mock).mockResolvedValue(null);

      const result = await getTotalReviewedCount();

      expect(result).toBe(0);
    });
  });
});
