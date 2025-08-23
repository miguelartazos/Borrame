import { ActivityService } from './ActivityService';
import { getDatabase } from '../db';
import { logger } from '../lib/logger';

// Mock dependencies
jest.mock('../db');
jest.mock('../lib/logger');

describe('ActivityService', () => {
  let service: ActivityService;
  let mockDb: {
    getAllAsync: jest.Mock;
    getFirstAsync: jest.Mock;
  };

  beforeEach(() => {
    service = new ActivityService();
    mockDb = {
      getAllAsync: jest.fn(),
      getFirstAsync: jest.fn(),
    };
    (getDatabase as jest.Mock).mockResolvedValue(mockDb);
    jest.clearAllMocks();
  });

  describe('loadActivityEvents', () => {
    it('loads activity events from database', async () => {
      const mockEvents = [
        { created_at: 1000, action: 'delete' },
        { created_at: 2000, action: 'keep' },
      ];
      mockDb.getAllAsync.mockResolvedValue(mockEvents);

      const result = await service.loadActivityEvents();

      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        'SELECT created_at, action FROM intents ORDER BY created_at DESC LIMIT ?',
        [1000]
      );
      expect(result).toEqual([
        { timestamp: 1000, action: 'delete' },
        { timestamp: 2000, action: 'keep' },
      ]);
    });

    it('returns empty array on error', async () => {
      mockDb.getAllAsync.mockRejectedValue(new Error('DB error'));

      const result = await service.loadActivityEvents();

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to load activity events',
        expect.any(Error)
      );
      expect(result).toEqual([]);
    });

    it('respects custom limit parameter', async () => {
      mockDb.getAllAsync.mockResolvedValue([]);

      await service.loadActivityEvents(500);

      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        'SELECT created_at, action FROM intents ORDER BY created_at DESC LIMIT ?',
        [500]
      );
    });
  });

  describe('getDaysWithActivity', () => {
    it('loads days with activity from database', async () => {
      const mockDays = [{ date: '2024-03-15' }, { date: '2024-03-14' }];
      mockDb.getAllAsync.mockResolvedValue(mockDays);

      const result = await service.getDaysWithActivity();

      expect(mockDb.getAllAsync).toHaveBeenCalledWith(
        expect.stringContaining('SELECT DISTINCT date'),
        expect.arrayContaining([expect.any(Number)])
      );
      expect(result).toEqual(['2024-03-15', '2024-03-14']);
    });

    it('returns empty array on error', async () => {
      mockDb.getAllAsync.mockRejectedValue(new Error('DB error'));

      const result = await service.getDaysWithActivity();

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to get days with activity',
        expect.any(Error)
      );
      expect(result).toEqual([]);
    });

    it('respects custom days back parameter', async () => {
      mockDb.getAllAsync.mockResolvedValue([]);
      const now = Date.now();

      await service.getDaysWithActivity(7);

      const callArgs = mockDb.getAllAsync.mock.calls[0];
      const cutoffTime = callArgs[1][0];
      const expectedCutoff = now - 7 * 24 * 60 * 60 * 1000;

      // Allow 1 second tolerance for test timing
      expect(Math.abs(cutoffTime - expectedCutoff)).toBeLessThan(1000);
    });
  });

  describe('calculatePercentReviewed', () => {
    it('calculates percentage correctly', async () => {
      mockDb.getFirstAsync
        .mockResolvedValueOnce({ count: 100 }) // total assets
        .mockResolvedValueOnce({ count: 25 }); // reviewed assets

      const result = await service.calculatePercentReviewed();

      expect(result).toBe(0.25);
    });

    it('returns 0 when no assets exist', async () => {
      mockDb.getFirstAsync.mockResolvedValueOnce({ count: 0 }).mockResolvedValueOnce({ count: 0 });

      const result = await service.calculatePercentReviewed();

      expect(result).toBe(0);
    });

    it('returns 0 on error', async () => {
      mockDb.getFirstAsync.mockRejectedValue(new Error('DB error'));

      const result = await service.calculatePercentReviewed();

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to calculate percent reviewed',
        expect.any(Error)
      );
      expect(result).toBe(0);
    });

    it('handles null results gracefully', async () => {
      mockDb.getFirstAsync.mockResolvedValueOnce(null).mockResolvedValueOnce(null);

      const result = await service.calculatePercentReviewed();

      expect(result).toBe(0);
    });
  });

  describe('loadActivityMetrics', () => {
    it('loads all metrics in parallel', async () => {
      const mockEvents = [{ created_at: 1000, action: 'delete' }];
      const mockDays = [{ date: '2024-03-15' }];

      mockDb.getAllAsync
        .mockResolvedValueOnce(mockEvents) // for loadActivityEvents
        .mockResolvedValueOnce(mockDays); // for getDaysWithActivity

      mockDb.getFirstAsync
        .mockResolvedValueOnce({ count: 100 })
        .mockResolvedValueOnce({ count: 50 });

      const result = await service.loadActivityMetrics();

      expect(result).toEqual({
        events: [{ timestamp: 1000, action: 'delete' }],
        daysWithActivity: ['2024-03-15'],
        percentReviewed: 0.5,
      });
    });

    it('returns default values on error', async () => {
      mockDb.getAllAsync.mockRejectedValue(new Error('DB error'));
      mockDb.getFirstAsync.mockRejectedValue(new Error('DB error'));

      const result = await service.loadActivityMetrics();

      expect(logger.error).toHaveBeenCalled();
      expect(result).toEqual({
        events: [],
        daysWithActivity: [],
        percentReviewed: 0,
      });
    });

    it('handles partial failures gracefully', async () => {
      mockDb.getAllAsync
        .mockResolvedValueOnce([{ created_at: 1000, action: 'delete' }])
        .mockRejectedValueOnce(new Error('Partial failure'));

      mockDb.getFirstAsync
        .mockResolvedValueOnce({ count: 100 })
        .mockResolvedValueOnce({ count: 25 });

      const result = await service.loadActivityMetrics();

      expect(result.events).toHaveLength(1);
      expect(result.daysWithActivity).toEqual([]);
      expect(result.percentReviewed).toBe(0.25);
    });
  });
});
