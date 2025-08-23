import { computeStreak, getLocalISO, computeGoalTodayMinutes } from './useProgressTracker';
import type { ActivityEvent } from '../services/ActivityService';

describe('useProgressTracker', () => {
  describe('getLocalISO', () => {
    it('returns YYYY-MM-DD format for current date', () => {
      const date = new Date('2024-03-15T10:30:00');
      const result = getLocalISO(date);
      expect(result).toBe('2024-03-15');
    });

    it('pads single digit months and days', () => {
      const date = new Date('2024-01-05T10:30:00');
      const result = getLocalISO(date);
      expect(result).toBe('2024-01-05');
    });

    it('uses current date when no date provided', () => {
      const result = getLocalISO();
      const today = new Date();
      const expectedYear = today.getFullYear();
      const expectedMonth = String(today.getMonth() + 1).padStart(2, '0');
      const expectedDay = String(today.getDate()).padStart(2, '0');
      expect(result).toBe(`${expectedYear}-${expectedMonth}-${expectedDay}`);
    });
  });

  describe('computeStreak', () => {
    const today = getLocalISO();
    const yesterday = getLocalISO(new Date(Date.now() - 24 * 60 * 60 * 1000));
    const twoDaysAgo = getLocalISO(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000));
    const threeDaysAgo = getLocalISO(new Date(Date.now() - 3 * 24 * 60 * 60 * 1000));
    const fourDaysAgo = getLocalISO(new Date(Date.now() - 4 * 24 * 60 * 60 * 1000));

    it('returns 0 for empty array', () => {
      expect(computeStreak([])).toBe(0);
    });

    it('returns 0 when no activity today', () => {
      expect(computeStreak([yesterday])).toBe(0);
      expect(computeStreak([twoDaysAgo, threeDaysAgo])).toBe(0);
    });

    it('returns 1 for activity only today', () => {
      expect(computeStreak([today])).toBe(1);
    });

    it('returns correct streak for consecutive days ending today', () => {
      expect(computeStreak([today, yesterday])).toBe(2);
      expect(computeStreak([today, yesterday, twoDaysAgo])).toBe(3);
      expect(computeStreak([today, yesterday, twoDaysAgo, threeDaysAgo])).toBe(4);
    });

    it('handles unsorted dates correctly', () => {
      expect(computeStreak([twoDaysAgo, today, yesterday])).toBe(3);
      expect(computeStreak([yesterday, threeDaysAgo, today, twoDaysAgo])).toBe(4);
    });

    it('stops counting at first gap', () => {
      expect(computeStreak([today, yesterday, threeDaysAgo])).toBe(2);
      expect(computeStreak([today, twoDaysAgo])).toBe(1);
    });

    it('handles duplicate dates', () => {
      expect(computeStreak([today, today, yesterday])).toBe(2);
      expect(computeStreak([today, yesterday, yesterday, twoDaysAgo])).toBe(3);
    });

    it('handles streak that ended yesterday', () => {
      expect(computeStreak([yesterday, twoDaysAgo, threeDaysAgo])).toBe(0);
    });

    it('handles non-consecutive days with activity today', () => {
      expect(computeStreak([today, threeDaysAgo, fourDaysAgo])).toBe(1);
    });

    it('handles single day streak', () => {
      expect(computeStreak([today])).toBe(1);
    });

    it('handles long streaks', () => {
      const dates = [];
      for (let i = 0; i < 30; i++) {
        dates.push(getLocalISO(new Date(Date.now() - i * 24 * 60 * 60 * 1000)));
      }
      expect(computeStreak(dates)).toBe(30);
    });

    it('handles future dates by ignoring them', () => {
      const tomorrow = getLocalISO(new Date(Date.now() + 24 * 60 * 60 * 1000));
      expect(computeStreak([tomorrow, today, yesterday])).toBe(2);
    });
  });

  describe('computeGoalTodayMinutes', () => {
    const now = Date.now();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStartMs = todayStart.getTime();

    it('returns 0 for empty events', () => {
      expect(computeGoalTodayMinutes([])).toBe(0);
    });

    it('returns 0 for events outside today', () => {
      const yesterday = now - 24 * 60 * 60 * 1000;
      const events: ActivityEvent[] = [
        { timestamp: yesterday, action: 'delete' },
        { timestamp: yesterday - 1000, action: 'keep' },
      ];
      expect(computeGoalTodayMinutes(events)).toBe(0);
    });

    it('calculates minutes for single event today', () => {
      const events = [{ timestamp: todayStartMs + 60000, action: 'delete' }];
      expect(computeGoalTodayMinutes(events)).toBeGreaterThanOrEqual(1);
    });

    it('calculates minutes for multiple events in same session', () => {
      const events = [
        { timestamp: todayStartMs + 60000, action: 'delete' },
        { timestamp: todayStartMs + 70000, action: 'keep' },
        { timestamp: todayStartMs + 80000, action: 'delete' },
      ];
      const result = computeGoalTodayMinutes(events);
      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(5);
    });

    it('handles multiple sessions with gaps', () => {
      const events = [
        { timestamp: todayStartMs + 60000, action: 'delete' },
        { timestamp: todayStartMs + 120000, action: 'keep' },
        // 10 minute gap - new session
        { timestamp: todayStartMs + 12 * 60000, action: 'delete' },
        { timestamp: todayStartMs + 13 * 60000, action: 'keep' },
      ];
      const result = computeGoalTodayMinutes(events);
      expect(result).toBeGreaterThanOrEqual(2);
    });

    it('sorts events by timestamp', () => {
      const events = [
        { timestamp: todayStartMs + 120000, action: 'keep' },
        { timestamp: todayStartMs + 60000, action: 'delete' },
        { timestamp: todayStartMs + 180000, action: 'delete' },
      ];
      const result = computeGoalTodayMinutes(events);
      expect(result).toBeGreaterThanOrEqual(1);
    });

    it('identifies sessions based on 5 minute threshold', () => {
      const events = [
        { timestamp: todayStartMs, action: 'delete' },
        // 4 minutes later - same session
        { timestamp: todayStartMs + 4 * 60000, action: 'keep' },
        // 6 minutes later - new session
        { timestamp: todayStartMs + 10 * 60000, action: 'delete' },
      ];
      const result = computeGoalTodayMinutes(events);
      expect(result).toBeGreaterThanOrEqual(2);
    });

    it('handles events at end of day', () => {
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 0, 0);
      const events = [
        { timestamp: endOfDay.getTime(), action: 'delete' },
        { timestamp: endOfDay.getTime() + 30000, action: 'keep' },
      ];
      const result = computeGoalTodayMinutes(events);
      expect(result).toBeGreaterThanOrEqual(1);
    });
  });
});
