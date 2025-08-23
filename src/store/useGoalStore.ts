import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTodayUTC, getYesterdayUTC, getWeekNumber } from '../lib/formatters';
import { logger } from '../lib/logger';

interface GoalState {
  // Goal settings
  minutesPerDay: number;
  targetMB: number;

  // Streak tracking
  currentStreak: number;
  lastActiveDate: string | null;
  lastWeekNumber: number;
  weeklyActivity: boolean[]; // 7 days, Mon-Sun

  // Today's progress
  todayMinutes: number;
  todayFreedMB: number;
  sessionStartTime: number | null;

  // Confetti tracking
  lastConfettiDate: string | null;

  // Error state
  lastError?: string;

  // Actions
  setMinutesPerDay: (minutes: number) => void;
  setTargetMB: (mb: number) => void;
  updateStreak: () => void;
  recordActivity: (minutes: number, freedMB: number) => void;
  resetDailyProgress: () => void;
  getWeeklyActivity: () => boolean[];
  startSession: () => void;
  endSession: () => number;
  setLastError: (error?: string) => void;
  hasShownConfettiToday: () => boolean;
  markConfettiShown: () => void;
}

export const useGoalStore = create<GoalState>()(
  persist(
    (set, get) => ({
      // Default values
      minutesPerDay: 15,
      targetMB: 100,
      currentStreak: 0,
      lastActiveDate: null,
      lastWeekNumber: getWeekNumber(),
      weeklyActivity: [false, false, false, false, false, false, false],
      todayMinutes: 0,
      todayFreedMB: 0,
      sessionStartTime: null,
      lastConfettiDate: null,
      lastError: undefined,

      setMinutesPerDay: (minutes) => set({ minutesPerDay: Math.min(60, Math.max(5, minutes)) }),

      setTargetMB: (mb) => set({ targetMB: Math.min(500, Math.max(10, mb)) }),

      setLastError: (error) => set({ lastError: error }),

      updateStreak: () => {
        try {
          get().setLastError(undefined);
          const today = getTodayUTC();
          const yesterday = getYesterdayUTC();
          const currentWeek = getWeekNumber();
          const { lastActiveDate, currentStreak, lastWeekNumber, weeklyActivity } = get();

          if (lastActiveDate === today) {
            return; // Already updated today
          }

          // Check if we need to reset weekly activity
          let newWeeklyActivity = weeklyActivity;
          if (currentWeek !== lastWeekNumber) {
            newWeeklyActivity = [false, false, false, false, false, false, false];
          }

          // Update streak
          let newStreak = currentStreak;
          if (lastActiveDate === yesterday) {
            // Continue streak
            newStreak = currentStreak + 1;
          } else {
            // Break streak
            newStreak = 1;
          }

          // Update weekly activity for today
          const dayOfWeek = new Date().getDay();
          const mondayFirst = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
          newWeeklyActivity = [...newWeeklyActivity];
          newWeeklyActivity[mondayFirst] = true;

          set({
            currentStreak: newStreak,
            lastActiveDate: today,
            lastWeekNumber: currentWeek,
            weeklyActivity: newWeeklyActivity,
          });
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Failed to update streak';
          logger.error('Failed to update streak', error);
          get().setLastError(errorMsg);
        }
      },

      recordActivity: (minutes, freedMB) => {
        try {
          get().setLastError(undefined);
          set((state) => {
            const newMinutes = state.todayMinutes + minutes;
            const newFreedMB = state.todayFreedMB + freedMB;

            // Check if goal met for streak with updated values
            const goalMet = newMinutes >= state.minutesPerDay || newFreedMB >= state.targetMB;

            if (goalMet) {
              // Schedule streak update after state is set
              setTimeout(() => get().updateStreak(), 0);
            }

            return {
              todayMinutes: newMinutes,
              todayFreedMB: newFreedMB,
            };
          });
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Failed to record activity';
          logger.error('Failed to record activity', error);
          get().setLastError(errorMsg);
        }
      },

      resetDailyProgress: () => {
        const today = getTodayUTC();
        const { lastActiveDate } = get();

        // Only reset if it's a new day
        if (lastActiveDate !== today) {
          set({
            todayMinutes: 0,
            todayFreedMB: 0,
          });
        }
      },

      getWeeklyActivity: () => get().weeklyActivity,

      startSession: () => {
        set({ sessionStartTime: Date.now() });
      },

      endSession: () => {
        try {
          get().setLastError(undefined);
          const { sessionStartTime } = get();
          if (!sessionStartTime) return 0;

          const sessionMinutes = Math.round((Date.now() - sessionStartTime) / 60000);
          set({ sessionStartTime: null });

          // Record the actual session time
          if (sessionMinutes > 0) {
            get().recordActivity(sessionMinutes, 0);
          }

          return sessionMinutes;
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Failed to end session';
          logger.error('Failed to end session', error);
          get().setLastError(errorMsg);
          return 0;
        }
      },

      hasShownConfettiToday: () => {
        const { lastConfettiDate } = get();
        const today = getTodayUTC();
        return lastConfettiDate === today;
      },

      markConfettiShown: () => {
        const today = getTodayUTC();
        set({ lastConfettiDate: today });
      },
    }),
    {
      name: 'swipeclean-goals',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        minutesPerDay: state.minutesPerDay,
        targetMB: state.targetMB,
        currentStreak: state.currentStreak,
        lastActiveDate: state.lastActiveDate,
        lastWeekNumber: state.lastWeekNumber,
        weeklyActivity: state.weeklyActivity,
        lastConfettiDate: state.lastConfettiDate,
      }),
    }
  )
);

// Selectors
export const useGoalMinutes = () => useGoalStore((state) => state.minutesPerDay);
export const useGoalMB = () => useGoalStore((state) => state.targetMB);
export const useCurrentStreak = () => useGoalStore((state) => state.currentStreak);
export const useTodayMinutes = () => useGoalStore((state) => state.todayMinutes);
export const useTodayFreedMB = () => useGoalStore((state) => state.todayFreedMB);
export const useTodayProgress = () => {
  const minutes = useGoalStore((state) => state.todayMinutes);
  const freedMB = useGoalStore((state) => state.todayFreedMB);
  return { minutes, freedMB };
};
export const useWeeklyActivity = () => useGoalStore((state) => state.weeklyActivity);
export const useGoalError = () => useGoalStore((state) => state.lastError);
