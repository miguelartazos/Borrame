import { renderHook, act } from '@testing-library/react-hooks';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useGoalStore } from './useGoalStore';
import * as formatters from '../lib/formatters';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Mock formatters
jest.mock('../lib/formatters', () => ({
  getTodayUTC: jest.fn(() => '2024-01-15'),
  getYesterdayUTC: jest.fn(() => '2024-01-14'),
  getWeekNumber: jest.fn(() => 3),
}));

describe('useGoalStore', () => {
  beforeEach(() => {
    // Reset store state
    useGoalStore.setState({
      minutesPerDay: 15,
      targetMB: 100,
      currentStreak: 0,
      lastActiveDate: null,
      lastWeekNumber: 3,
      weeklyActivity: [false, false, false, false, false, false, false],
      todayMinutes: 0,
      todayFreedMB: 0,
      sessionStartTime: null,
    });
    jest.clearAllMocks();
  });

  describe('Goal Settings', () => {
    it('sets minutes per day within valid range', () => {
      const { result } = renderHook(() => useGoalStore());

      act(() => {
        result.current.setMinutesPerDay(30);
      });
      expect(result.current.minutesPerDay).toBe(30);

      // Test min boundary
      act(() => {
        result.current.setMinutesPerDay(3);
      });
      expect(result.current.minutesPerDay).toBe(5);

      // Test max boundary
      act(() => {
        result.current.setMinutesPerDay(100);
      });
      expect(result.current.minutesPerDay).toBe(60);
    });

    it('sets target MB within valid range', () => {
      const { result } = renderHook(() => useGoalStore());

      act(() => {
        result.current.setTargetMB(250);
      });
      expect(result.current.targetMB).toBe(250);

      // Test boundaries
      act(() => {
        result.current.setTargetMB(5);
      });
      expect(result.current.targetMB).toBe(10);

      act(() => {
        result.current.setTargetMB(1000);
      });
      expect(result.current.targetMB).toBe(500);
    });
  });

  describe('Streak Management', () => {
    it('continues streak when active yesterday', () => {
      const { result } = renderHook(() => useGoalStore());

      act(() => {
        useGoalStore.setState({
          lastActiveDate: '2024-01-14',
          currentStreak: 5,
        });
        result.current.updateStreak();
      });

      expect(result.current.currentStreak).toBe(6);
      expect(result.current.lastActiveDate).toBe('2024-01-15');
    });

    it('resets streak when not active yesterday', () => {
      const { result } = renderHook(() => useGoalStore());

      act(() => {
        useGoalStore.setState({
          lastActiveDate: '2024-01-10',
          currentStreak: 5,
        });
        result.current.updateStreak();
      });

      expect(result.current.currentStreak).toBe(1);
      expect(result.current.lastActiveDate).toBe('2024-01-15');
    });

    it('does not update streak if already updated today', () => {
      const { result } = renderHook(() => useGoalStore());

      act(() => {
        useGoalStore.setState({
          lastActiveDate: '2024-01-15',
          currentStreak: 5,
        });
        result.current.updateStreak();
      });

      expect(result.current.currentStreak).toBe(5);
    });

    it('resets weekly activity on new week', () => {
      const { result } = renderHook(() => useGoalStore());
      jest.mocked(formatters.getWeekNumber).mockReturnValue(4);

      act(() => {
        useGoalStore.setState({
          lastWeekNumber: 3,
          weeklyActivity: [true, true, false, false, false, false, false],
        });
        result.current.updateStreak();
      });

      // Should reset weekly activity and set Monday (index 0 for Monday)
      const expectedActivity = [true, false, false, false, false, false, false];
      expect(result.current.weeklyActivity).toEqual(expectedActivity);
      expect(result.current.lastWeekNumber).toBe(4);
    });
  });

  describe('Activity Recording', () => {
    it('records activity and updates progress', () => {
      const { result } = renderHook(() => useGoalStore());

      act(() => {
        result.current.recordActivity(10, 50);
      });

      expect(result.current.todayMinutes).toBe(10);
      expect(result.current.todayFreedMB).toBe(50);
    });

    it('triggers streak update when goal is met', async () => {
      const { result } = renderHook(() => useGoalStore());
      const updateStreakSpy = jest.spyOn(result.current, 'updateStreak');

      act(() => {
        useGoalStore.setState({
          minutesPerDay: 15,
          targetMB: 100,
          todayMinutes: 10,
        });
      });

      act(() => {
        result.current.recordActivity(5, 0); // Total will be 15, meeting goal
      });

      // Wait for setTimeout
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      expect(updateStreakSpy).toHaveBeenCalled();
    });
  });

  describe('Session Tracking', () => {
    it('starts and ends session correctly', () => {
      const { result } = renderHook(() => useGoalStore());
      const now = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(now);

      act(() => {
        result.current.startSession();
      });

      expect(result.current.sessionStartTime).toBe(now);

      // Simulate 5 minutes passing
      jest.spyOn(Date, 'now').mockReturnValue(now + 5 * 60 * 1000);

      let sessionMinutes;
      act(() => {
        sessionMinutes = result.current.endSession();
      });

      expect(sessionMinutes).toBe(5);
      expect(result.current.sessionStartTime).toBeNull();
      expect(result.current.todayMinutes).toBe(5);
    });

    it('returns 0 if no session was started', () => {
      const { result } = renderHook(() => useGoalStore());

      let sessionMinutes;
      act(() => {
        sessionMinutes = result.current.endSession();
      });

      expect(sessionMinutes).toBe(0);
    });
  });

  describe('Daily Progress Reset', () => {
    it('resets progress on new day', () => {
      const { result } = renderHook(() => useGoalStore());

      act(() => {
        useGoalStore.setState({
          lastActiveDate: '2024-01-14',
          todayMinutes: 30,
          todayFreedMB: 200,
        });
        result.current.resetDailyProgress();
      });

      expect(result.current.todayMinutes).toBe(0);
      expect(result.current.todayFreedMB).toBe(0);
    });

    it('does not reset if same day', () => {
      const { result } = renderHook(() => useGoalStore());

      act(() => {
        useGoalStore.setState({
          lastActiveDate: '2024-01-15',
          todayMinutes: 30,
          todayFreedMB: 200,
        });
        result.current.resetDailyProgress();
      });

      expect(result.current.todayMinutes).toBe(30);
      expect(result.current.todayFreedMB).toBe(200);
    });
  });

  describe('Persistence', () => {
    it('persists correct state properties', async () => {
      const { result } = renderHook(() => useGoalStore());

      act(() => {
        result.current.setMinutesPerDay(20);
        result.current.setTargetMB(150);
      });

      // Wait for persistence
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      const calls = (AsyncStorage.setItem as jest.Mock).mock.calls;
      const lastCall = calls[calls.length - 1];
      const [key, value] = lastCall;

      expect(key).toBe('swipeclean-goals');
      const parsed = JSON.parse(value);
      expect(parsed.state.minutesPerDay).toBe(20);
      expect(parsed.state.targetMB).toBe(150);
      // sessionStartTime should not be persisted
      expect(parsed.state.sessionStartTime).toBeUndefined();
      // todayMinutes/todayFreedMB should not be persisted
      expect(parsed.state.todayMinutes).toBeUndefined();
      expect(parsed.state.todayFreedMB).toBeUndefined();
    });
  });
});
