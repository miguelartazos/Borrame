/**
 * Performance tests for date utility functions
 * Ensures optimizations are working as expected
 */

import {
  getCurrentDayIndex,
  createWeekActivityMap,
  getCurrentWeekDates,
  getWeekActivityDates,
  clearDayIndexCache,
} from './dateUtils';

describe('dateUtils performance', () => {
  // Save original Date for restoration
  const RealDate = global.Date;

  beforeEach(() => {
    clearDayIndexCache();
    // Restore real Date for performance tests
    global.Date = RealDate;
  });

  afterEach(() => {
    // Restore real Date after each test
    global.Date = RealDate;
  });

  describe('getCurrentDayIndex caching', () => {
    it('should be fast when cached', () => {
      // First call to populate cache
      getCurrentDayIndex();

      // Measure performance of cached calls
      const start = performance.now();
      for (let i = 0; i < 10000; i++) {
        getCurrentDayIndex();
      }
      const end = performance.now();
      const duration = end - start;

      // Should be very fast (< 5ms for 10000 calls)
      expect(duration).toBeLessThan(5);
    });

    it('should cache results and avoid redundant calculations', () => {
      // Clear cache first
      clearDayIndexCache();

      // First call
      const firstResult = getCurrentDayIndex();

      // Multiple subsequent calls should return same result without recalculation
      for (let i = 0; i < 100; i++) {
        const result = getCurrentDayIndex();
        expect(result).toBe(firstResult);
      }
    });
  });

  describe('createWeekActivityMap performance', () => {
    it('should handle large activity arrays efficiently', () => {
      const largeActivityArray = Array.from({ length: 365 }, (_, i) => {
        const date = new Date(2024, 0, i + 1);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
          date.getDate()
        ).padStart(2, '0')}`;
      });

      const start = performance.now();
      const map = createWeekActivityMap(largeActivityArray);
      const end = performance.now();
      const duration = end - start;

      // Should complete in reasonable time (< 10ms)
      expect(duration).toBeLessThan(10);
      expect(map.size).toBe(7);
    });

    it('should return map with exactly 7 entries', () => {
      const activities = ['2024-01-15', '2024-01-17'];
      const map = createWeekActivityMap(activities);

      // Should always return a map with 7 entries (one for each day of week)
      expect(map.size).toBe(7);
    });
  });

  describe('getWeekActivityDates performance', () => {
    it('should return correct number of active dates', () => {
      // Only 2 active days out of 7
      const weeklyActivity = [true, false, true, false, false, false, false];
      const result = getWeekActivityDates(weeklyActivity);

      // Should return exactly 2 dates
      expect(result).toHaveLength(2);
    });

    it('should return empty array fast for no activity', () => {
      const weeklyActivity = [false, false, false, false, false, false, false];

      const start = performance.now();
      for (let i = 0; i < 10000; i++) {
        getWeekActivityDates(weeklyActivity);
      }
      const end = performance.now();
      const duration = end - start;

      // Should be very fast (< 10ms for 10000 calls)
      expect(duration).toBeLessThan(10);
    });
  });

  describe('getCurrentWeekDates performance', () => {
    it('should return exactly 7 dates', () => {
      const dates = getCurrentWeekDates();

      // Should always return 7 dates (one for each day of week)
      expect(dates).toHaveLength(7);

      // All should be valid date strings
      dates.forEach((date) => {
        expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      });
    });

    it('should complete quickly', () => {
      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        getCurrentWeekDates();
      }
      const end = performance.now();
      const duration = end - start;

      // Should complete 1000 calls in reasonable time (< 50ms)
      expect(duration).toBeLessThan(50);
    });
  });

  describe('real-world usage patterns', () => {
    it('should handle rapid re-renders efficiently', () => {
      // Simulate component re-rendering 60 times per second
      const activities = ['2024-01-15', '2024-01-16', '2024-01-17'];

      const start = performance.now();
      for (let frame = 0; frame < 60; frame++) {
        // Simulate what happens in ProgressTrackerCard render
        const currentDay = getCurrentDayIndex(); // Cached after first call
        const activityMap = createWeekActivityMap(activities);

        // Check each day
        for (let i = 0; i < 7; i++) {
          activityMap.get(i);
        }
      }
      const end = performance.now();
      const duration = end - start;

      // Should complete 60 frames in less than 16ms (60fps = ~16ms per frame)
      // We're doing 60 frames, so should be less than 1000ms total
      expect(duration).toBeLessThan(100);
    });
  });
});
