import { useEffect } from 'react';
import { getPendingCount } from '../features/pending/selectors';
import {
  usePendingCount as usePendingCountStore,
  useSetPendingCount,
} from '../store/usePendingStore';

export function usePendingCount() {
  const count = usePendingCountStore();
  const setPendingCount = useSetPendingCount();

  useEffect(() => {
    let mounted = true;

    // Fetch initial count from database
    async function fetchInitialCount() {
      const pendingCount = await getPendingCount();
      // Only update if component is still mounted
      if (mounted) {
        setPendingCount(pendingCount);
      }
    }

    fetchInitialCount();

    // Cleanup function to prevent memory leaks
    return () => {
      mounted = false;
    };
  }, [setPendingCount]);

  return count;
}
