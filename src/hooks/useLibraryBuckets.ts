import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { getMonthBuckets, type MonthBucket } from '../features/library/selectors';
import type { LibraryFilterType, LibrarySortOrder } from '../features/library/selectors';
import { logger } from '../lib/logger';

interface UseLibraryBucketsOptions {
  filter: LibraryFilterType;
  sortOrder: LibrarySortOrder;
  pageSize?: number;
  maxRetries?: number;
}

interface UseLibraryBucketsResult {
  buckets: MonthBucket[];
  loading: boolean;
  refreshing: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  loadBuckets: (isRefresh?: boolean) => Promise<void>;
  loadMore: () => void;
  refresh: () => void;
  resetError: () => void;
}

interface LoadingState {
  loading: boolean;
  refreshing: boolean;
  loadingMore: boolean;
}

const EXPONENTIAL_BACKOFF_BASE = 1000; // 1 second
const MAX_BACKOFF_DELAY = 10000; // 10 seconds

export function useLibraryBuckets({
  filter,
  sortOrder,
  pageSize = 12,
  maxRetries = 3,
}: UseLibraryBucketsOptions): UseLibraryBucketsResult {
  const [buckets, setBuckets] = useState<MonthBucket[]>([]);
  const [loadingState, setLoadingState] = useState<LoadingState>({
    loading: true,
    refreshing: false,
    loadingMore: false,
  });
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const offsetRef = useRef(0);
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const filterRef = useRef(filter);
  const sortOrderRef = useRef(sortOrder);

  // Update refs when props change
  filterRef.current = filter;
  sortOrderRef.current = sortOrder;

  const calculateBackoffDelay = useCallback((retryCount: number) => {
    const delay = Math.min(EXPONENTIAL_BACKOFF_BASE * Math.pow(2, retryCount), MAX_BACKOFF_DELAY);
    return delay;
  }, []);

  const shouldRetry = useCallback(
    (errorMessage: string, currentRetryCount: number): boolean => {
      const isTransientError =
        !errorMessage.includes('ambiguous column name') && !errorMessage.includes('SQL syntax');
      return isTransientError && currentRetryCount < maxRetries;
    },
    [maxRetries]
  );

  // Track if component is mounted
  const isMountedRef = useRef(true);
  const loadBucketsRef = useRef<((isRefresh?: boolean) => Promise<void>) | undefined>(undefined);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadBuckets = useCallback(
    async (isRefresh = false) => {
      // Don't proceed if unmounted
      if (!isMountedRef.current) return;

      // Clear any pending retry timeout
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }

      // Check retry limit early return
      if (!isRefresh && retryCountRef.current > maxRetries) {
        logger.warn('Max retry limit reached for loading library buckets');
        setError('Unable to load library. Please try again later.');
        setLoadingState({ loading: false, refreshing: false, loadingMore: false });
        return;
      }

      // Setup loading state
      if (isRefresh) {
        offsetRef.current = 0;
        retryCountRef.current = 0;
        setError(null);
        setLoadingState((prev) => ({ ...prev, refreshing: true }));
      } else {
        setLoadingState((prev) => ({
          ...prev,
          loading: !prev.loadingMore && !prev.refreshing,
        }));
      }

      try {
        const newBuckets = await getMonthBuckets({
          filter: filterRef.current,
          sortOrder: sortOrderRef.current,
          limit: pageSize,
          offset: isRefresh ? 0 : offsetRef.current,
        });

        if (isRefresh) {
          setBuckets(newBuckets);
        } else {
          setBuckets((prev) => [...prev, ...newBuckets]);
        }

        offsetRef.current += newBuckets.length;
        setHasMore(newBuckets.length === pageSize);
        retryCountRef.current = 0;
        setError(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load library';
        logger.error('Failed to load library buckets', err);

        if (shouldRetry(errorMessage, retryCountRef.current)) {
          retryCountRef.current++;
          const delay = calculateBackoffDelay(retryCountRef.current);

          logger.info(
            `Retrying library load in ${delay}ms (attempt ${retryCountRef.current}/${maxRetries})`
          );

          retryTimeoutRef.current = setTimeout(() => {
            if (isMountedRef.current && loadBucketsRef.current) {
              loadBucketsRef.current(false);
            }
          }, delay);
        } else {
          setError(errorMessage);
        }
      } finally {
        setLoadingState({ loading: false, refreshing: false, loadingMore: false });
      }
    },
    [pageSize, maxRetries, calculateBackoffDelay, shouldRetry]
  );

  // Update ref with latest function
  loadBucketsRef.current = loadBuckets;

  const loadMore = useCallback(() => {
    setLoadingState((prev) => {
      // Early returns for cleaner logic
      if (prev.loadingMore || prev.loading || prev.refreshing) return prev;
      if (!hasMore || error) return prev;

      // Start loading more
      loadBuckets(false);
      return { ...prev, loadingMore: true };
    });
  }, [hasMore, error, loadBuckets]);

  const refresh = useCallback(() => {
    // Clear any pending retry before refresh
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    loadBuckets(true);
  }, [loadBuckets]);

  const resetError = useCallback(() => {
    setError(null);
    retryCountRef.current = 0;
  }, []);

  // Load data when filter/sort changes
  useEffect(() => {
    // Clear any pending retry when deps change
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    // Reset state for new filter/sort
    retryCountRef.current = 0;
    offsetRef.current = 0;
    setBuckets([]);
    setError(null);
    setHasMore(true);

    // Load with new filters
    loadBuckets(false);

    // Cleanup on unmount
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
  }, [filter, sortOrder, loadBuckets]);

  return useMemo(
    () => ({
      buckets,
      loading: loadingState.loading,
      refreshing: loadingState.refreshing,
      loadingMore: loadingState.loadingMore,
      hasMore,
      error,
      loadBuckets,
      loadMore,
      refresh,
      resetError,
    }),
    [buckets, loadingState, hasMore, error, loadBuckets, loadMore, refresh, resetError]
  );
}
