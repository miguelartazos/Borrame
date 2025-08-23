import { useEffect, useRef } from 'react';
import { useGoalStore } from '../store/useGoalStore';
import { getTodayUTC } from '../lib/formatters';

/**
 * Hook that tracks goal progress based on app activity
 */
export function useTrackGoals() {
  const recordActivity = useGoalStore((state) => state.recordActivity);
  const resetDailyProgress = useGoalStore((state) => state.resetDailyProgress);
  const startSession = useGoalStore((state) => state.startSession);
  const endSession = useGoalStore((state) => state.endSession);
  const lastCheckRef = useRef<string | null>(null);

  useEffect(() => {
    // Check if it's a new day and reset progress
    const today = getTodayUTC();

    if (lastCheckRef.current !== today) {
      lastCheckRef.current = today;
      resetDailyProgress();
    }

    // Start session when hook mounts (user opens deck)
    startSession();

    // End session when component unmounts
    return () => {
      endSession();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run on mount/unmount

  return {
    recordCommit: (_deletedCount: number, freedMB: number) => {
      // Record freed MB when user commits deletions
      // Session time is tracked automatically
      recordActivity(0, freedMB);
    },
  };
}
