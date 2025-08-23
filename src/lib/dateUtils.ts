/**
 * Date utilities with caching and memoization for performance
 * Avoids creating Date objects during render cycles
 */

// Constants
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DAYS_IN_WEEK = 7;
const CACHE_DURATION = 60000; // 1 minute cache for current day index

// Cache for current day index
let cachedDayIndex: number | null = null;
let cacheTimestamp = 0;

// For testing - allow cache to be cleared
export const clearDayIndexCache = () => {
  cachedDayIndex = null;
  cacheTimestamp = 0;
};

/**
 * Get current day index (0 = Monday, 6 = Sunday)
 * Cached to avoid creating Date objects on every call
 */
export const getCurrentDayIndex = (): number => {
  const now = Date.now();

  // Return cached value if still valid
  if (cachedDayIndex !== null && now - cacheTimestamp < CACHE_DURATION) {
    return cachedDayIndex;
  }

  // Calculate and cache new value
  const day = new Date(now).getDay();
  cachedDayIndex = day === 0 ? 6 : day - 1; // Convert Sunday (0) to 6, others shift down by 1
  cacheTimestamp = now;

  return cachedDayIndex;
};

/**
 * Get local ISO date string (YYYY-MM-DD) in device timezone
 * Optimized to avoid unnecessary object creation
 */
export const getLocalISO = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Get local date string without creating Date objects
 * Used for formatting existing date components
 */
export const getLocalDateString = (year: number, month: number, day: number): string => {
  const monthStr = String(month).padStart(2, '0');
  const dayStr = String(day).padStart(2, '0');
  return `${year}-${monthStr}-${dayStr}`;
};

/**
 * Get array of ISO date strings for the current week
 * Optimized to only create dates when necessary
 */
export const getCurrentWeekDates = (): string[] => {
  const today = new Date();
  const currentDay = today.getDay();
  const mondayFirst = currentDay === 0 ? -6 : 1 - currentDay;

  const weekDates: string[] = [];
  const baseTime = today.getTime();

  for (let i = 0; i < DAYS_IN_WEEK; i++) {
    const offsetDays = mondayFirst + i;
    const dateTime = baseTime + offsetDays * MS_PER_DAY;
    const date = new Date(dateTime);
    weekDates.push(getLocalISO(date));
  }

  return weekDates;
};

/**
 * Map weekly activity boolean array to actual date strings
 * Only creates dates for days with activity
 */
export const getWeekActivityDates = (weeklyActivity: boolean[]): string[] => {
  if (!weeklyActivity || weeklyActivity.length === 0) {
    return [];
  }

  const today = new Date();
  const currentDay = today.getDay();
  const mondayFirst = currentDay === 0 ? -6 : 1 - currentDay;
  const baseTime = today.getTime();

  const activeDates: string[] = [];

  for (let i = 0; i < weeklyActivity.length; i++) {
    if (weeklyActivity[i]) {
      const offsetDays = mondayFirst + i;
      const dateTime = baseTime + offsetDays * MS_PER_DAY;
      const date = new Date(dateTime);
      activeDates.push(getLocalISO(date));
    }
  }

  return activeDates;
};

/**
 * Check if a specific weekday index has activity
 * Optimized version that works with pre-calculated activity map
 */
export const hasActivityOnDayOptimized = (
  dayIndex: number,
  weekActivityMap: Map<number, boolean>
): boolean => {
  return weekActivityMap.get(dayIndex) || false;
};

/**
 * Create a map of weekday indices to activity status
 * Pre-calculates all activity states in one pass
 */
export const createWeekActivityMap = (daysWithActivity: string[]): Map<number, boolean> => {
  const activityMap = new Map<number, boolean>();

  const currentDayIndex = getCurrentDayIndex();
  const today = new Date();
  const baseTime = today.getTime();

  // Pre-calculate all week dates and initialize all days
  for (let i = 0; i < DAYS_IN_WEEK; i++) {
    const daysFromToday = i - currentDayIndex;
    const targetTime = baseTime + daysFromToday * MS_PER_DAY;
    const targetDate = new Date(targetTime);
    const targetDateStr = getLocalISO(targetDate);

    // Set activity status for this day (false if no activity data)
    activityMap.set(i, daysWithActivity.includes(targetDateStr));
  }

  return activityMap;
};

// Export constants for use in other modules
export { MS_PER_DAY, DAYS_IN_WEEK };
