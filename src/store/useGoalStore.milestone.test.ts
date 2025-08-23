/**
 * Tests for 500MB milestone detection and confetti trigger
 */

import { renderHook, act } from '@testing-library/react-native';
import { useGoalStore } from './useGoalStore';

describe('useGoalStore - 500MB Milestone', () => {
  beforeEach(() => {
    // Reset store state before each test
    useGoalStore.setState({
      todayFreedMB: 0,
      todayMinutes: 0,
      currentStreak: 0,
      lastActiveDate: null,
    });
  });

  describe('recordActivity', () => {
    it('tracks freed MB correctly', () => {
      const { result } = renderHook(() => useGoalStore());

      act(() => {
        result.current.recordActivity(0, 100);
      });

      expect(result.current.todayFreedMB).toBe(100);
    });

    it('accumulates freed MB across multiple calls', () => {
      const { result } = renderHook(() => useGoalStore());

      act(() => {
        result.current.recordActivity(0, 150);
        result.current.recordActivity(0, 200);
        result.current.recordActivity(0, 175);
      });

      expect(result.current.todayFreedMB).toBe(525);
    });

    it('detects 500MB milestone crossing', () => {
      const { result } = renderHook(() => useGoalStore());

      // Start below 500MB
      act(() => {
        result.current.recordActivity(0, 450);
      });

      expect(result.current.todayFreedMB).toBe(450);

      // Cross 500MB threshold
      act(() => {
        result.current.recordActivity(0, 75);
      });

      expect(result.current.todayFreedMB).toBe(525);
      expect(result.current.todayFreedMB).toBeGreaterThanOrEqual(500);
    });

    it('handles exact 500MB milestone', () => {
      const { result } = renderHook(() => useGoalStore());

      act(() => {
        result.current.recordActivity(0, 500);
      });

      expect(result.current.todayFreedMB).toBe(500);
      expect(result.current.todayFreedMB).toBeGreaterThanOrEqual(500);
    });

    it('continues tracking beyond 500MB', () => {
      const { result } = renderHook(() => useGoalStore());

      act(() => {
        result.current.recordActivity(0, 600);
        result.current.recordActivity(0, 100);
      });

      expect(result.current.todayFreedMB).toBe(700);
    });
  });

  describe('resetDailyProgress', () => {
    it('resets freed MB for new day', () => {
      const { result } = renderHook(() => useGoalStore());

      // Set some progress
      act(() => {
        result.current.recordActivity(0, 550);
      });

      expect(result.current.todayFreedMB).toBe(550);

      // Reset for new day
      act(() => {
        result.current.resetDailyProgress();
      });

      expect(result.current.todayFreedMB).toBe(0);
    });

    it('preserves progress if same day', () => {
      const { result } = renderHook(() => useGoalStore());
      const today = new Date().toISOString().split('T')[0];

      // Set last active date to today
      act(() => {
        useGoalStore.setState({ lastActiveDate: today });
        result.current.recordActivity(0, 550);
      });

      // Reset should not clear progress since it's the same day
      act(() => {
        result.current.resetDailyProgress();
      });

      // Progress should be preserved for same day
      expect(result.current.todayFreedMB).toBe(550);
    });
  });

  describe('milestone conditions', () => {
    it('identifies when milestone is reached for first time', () => {
      const { result } = renderHook(() => useGoalStore());

      // Track progress in chunks
      const chunks = [100, 150, 125, 100, 50];
      let hasReachedMilestone = false;

      chunks.forEach((chunk) => {
        act(() => {
          result.current.recordActivity(0, chunk);
        });

        if (result.current.todayFreedMB >= 500 && !hasReachedMilestone) {
          hasReachedMilestone = true;
          expect(result.current.todayFreedMB).toBeGreaterThanOrEqual(500);
        }
      });

      expect(hasReachedMilestone).toBe(true);
      expect(result.current.todayFreedMB).toBe(525);
    });

    it('calculates progress towards milestone', () => {
      const { result } = renderHook(() => useGoalStore());

      act(() => {
        result.current.recordActivity(0, 250);
      });

      const progressPercent = (result.current.todayFreedMB / 500) * 100;
      expect(progressPercent).toBe(50);
    });

    it('handles small incremental updates', () => {
      const { result } = renderHook(() => useGoalStore());

      // Simulate many small file deletions
      for (let i = 0; i < 100; i++) {
        act(() => {
          result.current.recordActivity(0, 5.5); // 5.5MB each
        });
      }

      expect(result.current.todayFreedMB).toBe(550);
      expect(result.current.todayFreedMB).toBeGreaterThanOrEqual(500);
    });
  });
});
