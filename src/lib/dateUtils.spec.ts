/**
 * Unit tests for date utility functions
 */

import {
  getCurrentDayIndex,
  getLocalISO,
  getLocalDateString,
  getCurrentWeekDates,
  getWeekActivityDates,
  hasActivityOnDayOptimized,
  createWeekActivityMap,
  clearDayIndexCache,
  MS_PER_DAY,
  DAYS_IN_WEEK,
} from './dateUtils';

describe('dateUtils', () => {
  // Mock Date to ensure consistent testing
  const mockDate = new Date('2024-01-15T12:00:00'); // Monday, Jan 15, 2024
  const originalDate = global.Date;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(mockDate);
  });

  afterEach(() => {
    jest.useRealTimers();
    global.Date = originalDate;
  });

  describe('getCurrentDayIndex', () => {
    beforeEach(() => {
      clearDayIndexCache();
    });

    it('should return 0 for Monday', () => {
      jest.setSystemTime(new Date('2024-01-15T12:00:00')); // Monday
      expect(getCurrentDayIndex()).toBe(0);
    });

    it('should return 6 for Sunday', () => {
      jest.setSystemTime(new Date('2024-01-21T12:00:00')); // Sunday
      expect(getCurrentDayIndex()).toBe(6);
    });

    it('should return 4 for Friday', () => {
      jest.setSystemTime(new Date('2024-01-19T12:00:00')); // Friday
      expect(getCurrentDayIndex()).toBe(4);
    });

    it('should cache the result for 1 minute', () => {
      jest.setSystemTime(new Date('2024-01-15T12:00:00')); // Monday
      const firstCall = getCurrentDayIndex();
      expect(firstCall).toBe(0); // Monday

      // Advance time by 30 seconds
      jest.advanceTimersByTime(30000);
      const secondCall = getCurrentDayIndex();
      expect(secondCall).toBe(firstCall);

      // Advance time by another 31 seconds (total 61 seconds)
      jest.advanceTimersByTime(31000);

      // Change the system day
      jest.setSystemTime(new Date('2024-01-16T12:00:00')); // Tuesday
      const thirdCall = getCurrentDayIndex();

      expect(thirdCall).toBe(1); // Tuesday = 1
    });
  });

  describe('getLocalISO', () => {
    it('should format date as YYYY-MM-DD', () => {
      const date = new Date('2024-01-15T12:00:00');
      expect(getLocalISO(date)).toBe('2024-01-15');
    });

    it('should pad single digit months and days', () => {
      const date = new Date('2024-03-05T12:00:00');
      expect(getLocalISO(date)).toBe('2024-03-05');
    });

    it('should use current date when no date provided', () => {
      expect(getLocalISO()).toBe('2024-01-15');
    });

    it('should handle month boundaries correctly', () => {
      const date = new Date('2024-01-31T23:59:59');
      expect(getLocalISO(date)).toBe('2024-01-31');
    });

    it('should handle year boundaries correctly', () => {
      const date = new Date('2023-12-31T23:59:59');
      expect(getLocalISO(date)).toBe('2023-12-31');
    });
  });

  describe('getLocalDateString', () => {
    it('should format components as YYYY-MM-DD', () => {
      expect(getLocalDateString(2024, 1, 15)).toBe('2024-01-15');
    });

    it('should pad single digit months and days', () => {
      expect(getLocalDateString(2024, 3, 5)).toBe('2024-03-05');
    });

    it('should handle December correctly', () => {
      expect(getLocalDateString(2024, 12, 25)).toBe('2024-12-25');
    });
  });

  describe('getCurrentWeekDates', () => {
    it('should return 7 dates for the current week', () => {
      const weekDates = getCurrentWeekDates();
      expect(weekDates).toHaveLength(7);
    });

    it('should start with Monday when current day is Monday', () => {
      jest.setSystemTime(new Date('2024-01-15T12:00:00')); // Monday
      const weekDates = getCurrentWeekDates();
      expect(weekDates[0]).toBe('2024-01-15'); // Monday
      expect(weekDates[6]).toBe('2024-01-21'); // Sunday
    });

    it('should start with Monday when current day is Sunday', () => {
      jest.setSystemTime(new Date('2024-01-21T12:00:00')); // Sunday
      const weekDates = getCurrentWeekDates();
      expect(weekDates[0]).toBe('2024-01-15'); // Monday
      expect(weekDates[6]).toBe('2024-01-21'); // Sunday
    });

    it('should start with Monday when current day is Wednesday', () => {
      jest.setSystemTime(new Date('2024-01-17T12:00:00')); // Wednesday
      const weekDates = getCurrentWeekDates();
      expect(weekDates[0]).toBe('2024-01-15'); // Monday
      expect(weekDates[2]).toBe('2024-01-17'); // Wednesday
      expect(weekDates[6]).toBe('2024-01-21'); // Sunday
    });

    it('should handle month boundaries correctly', () => {
      jest.setSystemTime(new Date('2024-02-01T12:00:00')); // Thursday
      const weekDates = getCurrentWeekDates();
      expect(weekDates[0]).toBe('2024-01-29'); // Monday (previous month)
      expect(weekDates[3]).toBe('2024-02-01'); // Thursday (current month)
      expect(weekDates[6]).toBe('2024-02-04'); // Sunday (current month)
    });
  });

  describe('getWeekActivityDates', () => {
    beforeEach(() => {
      jest.setSystemTime(new Date('2024-01-15T12:00:00')); // Monday
    });

    it('should return empty array for empty input', () => {
      expect(getWeekActivityDates([])).toEqual([]);
    });

    it('should return empty array for all false', () => {
      const weeklyActivity = [false, false, false, false, false, false, false];
      expect(getWeekActivityDates(weeklyActivity)).toEqual([]);
    });

    it('should return dates only for true values', () => {
      const weeklyActivity = [true, false, true, false, false, false, false];
      const result = getWeekActivityDates(weeklyActivity);
      expect(result).toHaveLength(2);
      expect(result).toContain('2024-01-15'); // Monday
      expect(result).toContain('2024-01-17'); // Wednesday
    });

    it('should return all dates when all true', () => {
      const weeklyActivity = [true, true, true, true, true, true, true];
      const result = getWeekActivityDates(weeklyActivity);
      expect(result).toHaveLength(7);
      expect(result[0]).toBe('2024-01-15'); // Monday
      expect(result[6]).toBe('2024-01-21'); // Sunday
    });

    it('should handle weekend activity', () => {
      const weeklyActivity = [false, false, false, false, false, true, true];
      const result = getWeekActivityDates(weeklyActivity);
      expect(result).toHaveLength(2);
      expect(result).toContain('2024-01-20'); // Saturday
      expect(result).toContain('2024-01-21'); // Sunday
    });
  });

  describe('createWeekActivityMap', () => {
    beforeEach(() => {
      jest.setSystemTime(new Date('2024-01-17T12:00:00')); // Wednesday
    });

    it('should return empty map for empty input', () => {
      const map = createWeekActivityMap([]);
      expect(map.size).toBe(7);
      for (let i = 0; i < 7; i++) {
        expect(map.get(i)).toBe(false);
      }
    });

    it('should correctly map activity for current week', () => {
      const daysWithActivity = [
        '2024-01-15', // Monday
        '2024-01-17', // Wednesday
        '2024-01-20', // Saturday
      ];
      const map = createWeekActivityMap(daysWithActivity);

      expect(map.get(0)).toBe(true); // Monday
      expect(map.get(1)).toBe(false); // Tuesday
      expect(map.get(2)).toBe(true); // Wednesday
      expect(map.get(3)).toBe(false); // Thursday
      expect(map.get(4)).toBe(false); // Friday
      expect(map.get(5)).toBe(true); // Saturday
      expect(map.get(6)).toBe(false); // Sunday
    });

    it('should ignore dates outside current week', () => {
      const daysWithActivity = [
        '2024-01-08', // Previous Monday
        '2024-01-15', // Current Monday
        '2024-01-22', // Next Monday
      ];
      const map = createWeekActivityMap(daysWithActivity);

      expect(map.get(0)).toBe(true); // Current Monday
      expect(map.get(1)).toBe(false); // Tuesday
    });

    it('should handle all days with activity', () => {
      const daysWithActivity = [
        '2024-01-15',
        '2024-01-16',
        '2024-01-17',
        '2024-01-18',
        '2024-01-19',
        '2024-01-20',
        '2024-01-21',
      ];
      const map = createWeekActivityMap(daysWithActivity);

      for (let i = 0; i < 7; i++) {
        expect(map.get(i)).toBe(true);
      }
    });
  });

  describe('hasActivityOnDayOptimized', () => {
    it('should return false for empty map', () => {
      const map = new Map<number, boolean>();
      expect(hasActivityOnDayOptimized(0, map)).toBe(false);
    });

    it('should return correct value from map', () => {
      const map = new Map<number, boolean>([
        [0, true],
        [1, false],
        [2, true],
      ]);

      expect(hasActivityOnDayOptimized(0, map)).toBe(true);
      expect(hasActivityOnDayOptimized(1, map)).toBe(false);
      expect(hasActivityOnDayOptimized(2, map)).toBe(true);
      expect(hasActivityOnDayOptimized(3, map)).toBe(false); // Not in map
    });
  });

  describe('constants', () => {
    it('should have correct MS_PER_DAY value', () => {
      expect(MS_PER_DAY).toBe(24 * 60 * 60 * 1000);
    });

    it('should have correct DAYS_IN_WEEK value', () => {
      expect(DAYS_IN_WEEK).toBe(7);
    });
  });
});
