/**
 * useProgressTracker Hook
 * Combines library scan summary and user activity log to compute progress metrics
 */

import { useMemo, useEffect, useState, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ProgressTrackerProps } from '../components/home/ProgressTrackerCard';
import {
  useCurrentStreak,
  useGoalMinutes,
  useTodayProgress,
  useWeeklyActivity,
} from '../store/useGoalStore';
import { useLastProgress, useHomeStore } from '../store/useHomeStore';
import { useHomeData } from './useHomeData';
import { activityService, type ActivityEvent } from '../services/ActivityService';
import { logger } from '../lib/logger';
import {
  getCurrentWeekDates,
  getWeekActivityDates,
  getLocalISO as getLocalISOFromUtils,
} from '../lib/dateUtils';
import {
  SESSION_GAP_THRESHOLD_MS,
  MIN_SESSION_DURATION_MINUTES,
  PROGRESS_DIFF_THRESHOLD,
  PROGRESS_CACHE_KEY,
  ACTIVITY_REFRESH_INTERVAL_MS,
} from '../constants/progress';

// Re-export for backward compatibility
export const getLocalISO = getLocalISOFromUtils;

/**
 * Compute consecutive days ending today
 * @param daysWithActivity - Array of ISO date strings with activity
 * @returns Number of consecutive days with activity ending today
 */
export const computeStreak = (daysWithActivity: string[]): number => {
  if (daysWithActivity.length === 0) return 0;

  // Remove duplicates and filter out future dates
  const today = getLocalISO();
  const uniqueDates = [...new Set(daysWithActivity)].filter((date) => date <= today);

  // Sort dates in descending order
  const sortedDates = uniqueDates.sort((a, b) => b.localeCompare(a));

  // If no activity today, streak is 0
  if (sortedDates[0] !== today) {
    // Check if yesterday had activity for a potential streak that ended
    const yesterday = getLocalISO(new Date(Date.now() - 24 * 60 * 60 * 1000));
    if (sortedDates[0] === yesterday) {
      // Streak ended yesterday, return 0
      return 0;
    }
    return 0;
  }

  // Count consecutive days backwards from today
  let streak = 1;
  const currentDate = new Date();

  for (let i = 1; i < sortedDates.length; i++) {
    // Create new date to avoid mutation
    const checkDate = new Date(currentDate);
    checkDate.setDate(checkDate.getDate() - i);
    const expectedDate = getLocalISO(checkDate);

    if (sortedDates[i] === expectedDate) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
};

/**
 * Compute total review minutes for today
 * @param events - Array of decided action events with timestamps
 * @returns Total minutes spent reviewing today
 */
export const computeGoalTodayMinutes = (events: ActivityEvent[]): number => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayStartMs = todayStart.getTime();

  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);
  const todayEndMs = todayEnd.getTime();

  // Filter events for today
  const todayEvents = events.filter(
    (event) => event.timestamp >= todayStartMs && event.timestamp <= todayEndMs
  );

  if (todayEvents.length === 0) return 0;

  // Sort events by timestamp
  todayEvents.sort((a, b) => a.timestamp - b.timestamp);

  // Estimate review time: 5 seconds per decision + session overhead
  let totalMinutes = 0;
  let sessionStart = todayEvents[0].timestamp;
  let lastEventTime = todayEvents[0].timestamp;

  for (let i = 1; i < todayEvents.length; i++) {
    const event = todayEvents[i];
    const timeSinceLastEvent = event.timestamp - lastEventTime;

    if (timeSinceLastEvent > SESSION_GAP_THRESHOLD_MS) {
      // End previous session
      const sessionDuration = (lastEventTime - sessionStart) / 1000 / 60;
      totalMinutes += Math.max(MIN_SESSION_DURATION_MINUTES, sessionDuration + 1);

      // Start new session
      sessionStart = event.timestamp;
    }

    lastEventTime = event.timestamp;
  }

  // Add final session
  const finalSessionDuration = (lastEventTime - sessionStart) / 1000 / 60;
  totalMinutes += Math.max(MIN_SESSION_DURATION_MINUTES, finalSessionDuration + 1);

  return Math.round(totalMinutes);
};

/**
 * Main hook to gather progress tracker data
 */
export const useProgressTracker = (
  onAdjustGoal: () => void
): Omit<ProgressTrackerProps, 'testID'> => {
  // Get data from stores using selectors
  const streakDays = useCurrentStreak();
  const goalMinutesPerDay = useGoalMinutes();
  const { minutes: storeMinutesToday, freedMB: freedTodayMB } = useTodayProgress();
  const weeklyActivity = useWeeklyActivity();
  const lastProgress = useLastProgress();
  const setProgress = useHomeStore((state) => state.setProgress);
  const { spaceReadyMB } = useHomeData();

  // State for async data
  const [activityEvents, setActivityEvents] = useState<ActivityEvent[]>([]);
  const [daysWithActivityDB, setDaysWithActivityDB] = useState<string[]>([]);
  const [calculatedProgress, setCalculatedProgress] = useState(lastProgress);

  // Refs for cleanup
  const isMountedRef = useRef(true);
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load activity data with debouncing
  const loadActivityData = useCallback(async () => {
    try {
      const metrics = await activityService.loadActivityMetrics();

      // Only update if component is still mounted
      if (!isMountedRef.current) return;

      setActivityEvents(metrics.events);
      setDaysWithActivityDB(metrics.daysWithActivity);

      // Update progress if changed significantly
      if (Math.abs(metrics.percentReviewed - lastProgress) > PROGRESS_DIFF_THRESHOLD) {
        setCalculatedProgress(metrics.percentReviewed);
        setProgress(metrics.percentReviewed);

        // Persist to AsyncStorage for animation
        try {
          await AsyncStorage.setItem(
            PROGRESS_CACHE_KEY,
            JSON.stringify({
              value: metrics.percentReviewed,
              timestamp: Date.now(),
            })
          );
        } catch (error) {
          logger.error('Failed to persist progress', error);
        }
      } else {
        setCalculatedProgress(lastProgress);
      }
    } catch (error) {
      logger.error('Failed to load activity data', error);
    }
  }, [lastProgress, setProgress]);

  // Note: debouncedLoadData removed as it's not currently used
  // Can be added back if debouncing is needed for user-triggered refreshes

  // Load data on mount and set up refresh interval
  useEffect(() => {
    // Initial load
    loadActivityData();

    // Set up periodic refresh
    refreshIntervalRef.current = setInterval(() => {
      if (isMountedRef.current) {
        loadActivityData();
      }
    }, ACTIVITY_REFRESH_INTERVAL_MS);

    // Cleanup on unmount
    return () => {
      isMountedRef.current = false;

      const intervalId = refreshIntervalRef.current;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - only run on mount

  // Compute minutes from activity events
  const minutesToday = useMemo(() => {
    const computedMinutes = computeGoalTodayMinutes(activityEvents);
    // Use the max of computed and store minutes
    return Math.max(computedMinutes, storeMinutesToday);
  }, [activityEvents, storeMinutesToday]);

  // Compute streak from database activity
  const computedStreak = useMemo(() => {
    if (daysWithActivityDB.length > 0) {
      return computeStreak(daysWithActivityDB);
    }
    return streakDays; // Fallback to store value
  }, [daysWithActivityDB, streakDays]);

  // Convert MB to bytes
  const freedTodayBytes = freedTodayMB * 1024 * 1024;
  const spaceReadyBytes = spaceReadyMB * 1024 * 1024;

  // Default goal schedule (weekdays on, weekends off)
  const goalSchedule = useMemo(() => [true, true, true, true, true, false, false], []);

  // Calculate days with activity for current week
  const daysWithActivity = useMemo(() => {
    // Get current week dates once (cached function)
    const weekDates = getCurrentWeekDates();

    // Combine store weekly activity with database activity
    const combinedDays = new Set<string>();

    // Add dates from store weekly activity (boolean array)
    // This uses optimized function that only creates Date objects for active days
    const storeActivityDates = getWeekActivityDates(weeklyActivity);
    storeActivityDates.forEach((date) => combinedDays.add(date));

    // Add from database (only dates within current week)
    daysWithActivityDB.forEach((date) => {
      if (weekDates.includes(date)) {
        combinedDays.add(date);
      }
    });

    return Array.from(combinedDays);
  }, [weeklyActivity, daysWithActivityDB]);

  return {
    streakDays: computedStreak,
    goalMinutesPerDay,
    minutesToday,
    percentReviewed: calculatedProgress,
    freedTodayBytes,
    spaceReadyBytes,
    goalSchedule,
    daysWithActivity,
    onAdjustGoal,
  };
};
