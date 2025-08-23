/**
 * Hook to gather all data needed for ProgressTrackerCard
 * Combines data from multiple stores with proper selectors
 */

import { useMemo } from 'react';
import type { ProgressTrackerProps } from '../components/home/ProgressTrackerCard';
import {
  useCurrentStreak,
  useGoalMinutes,
  useTodayProgress,
  useWeeklyActivity,
} from '../store/useGoalStore';
import { useLastProgress } from '../store/useHomeStore';
import { useHomeData } from './useHomeData';

// Get local date string (YYYY-MM-DD) for the current week
const getWeekDates = (): string[] => {
  const today = new Date();
  const currentDay = today.getDay();
  const mondayFirst = currentDay === 0 ? -6 : 1 - currentDay;

  const weekDates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + mondayFirst + i);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    weekDates.push(`${year}-${month}-${day}`);
  }

  return weekDates;
};

export const useProgressTrackerData = (
  onAdjustGoal: () => void
): Omit<ProgressTrackerProps, 'testID'> => {
  // Get data from stores using selectors
  const streakDays = useCurrentStreak();
  const goalMinutesPerDay = useGoalMinutes();
  const { minutes: minutesToday, freedMB: freedTodayMB } = useTodayProgress();
  const weeklyActivity = useWeeklyActivity();
  const lastProgress = useLastProgress();
  const { spaceReadyMB } = useHomeData();

  // Convert MB to bytes
  const freedTodayBytes = freedTodayMB * 1024 * 1024;
  const spaceReadyBytes = spaceReadyMB * 1024 * 1024;

  // Default goal schedule (weekdays on, weekends off)
  const goalSchedule = useMemo(() => [true, true, true, true, true, false, false], []);

  // Calculate days with activity for current week
  const daysWithActivity = useMemo(() => {
    const weekDates = getWeekDates();
    return weekDates.filter((_, index) => weeklyActivity[index]);
  }, [weeklyActivity]);

  return {
    streakDays,
    goalMinutesPerDay,
    minutesToday,
    percentReviewed: lastProgress,
    freedTodayBytes,
    spaceReadyBytes,
    goalSchedule,
    daysWithActivity,
    onAdjustGoal,
  };
};
