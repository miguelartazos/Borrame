/**
 * Constants for progress tracking and activity calculations
 */

// Session detection
export const SESSION_GAP_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes gap = new session
export const MIN_SESSION_DURATION_MINUTES = 1; // Minimum duration for a session

// Progress updates
export const PROGRESS_DIFF_THRESHOLD = 0.01; // 1% difference threshold for updates
export const PROGRESS_CACHE_KEY = 'swipeclean-last-progress';

// Data loading
export const ACTIVITY_REFRESH_INTERVAL_MS = 60000; // Refresh activity data every minute
export const ACTIVITY_DEBOUNCE_MS = 500; // Debounce activity data loads
