import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useLibraryBuckets } from './useLibraryBuckets';
import { getMonthBuckets, type MonthBucket } from '../features/library/selectors';
import type { LibraryFilterType, LibrarySortOrder } from '../features/library/selectors';

jest.mock('../features/library/selectors');
jest.mock('../lib/logger');

const mockedGetMonthBuckets = jest.mocked(getMonthBuckets);

describe('useLibraryBuckets', () => {
  const mockBuckets: MonthBucket[] = [
    {
      monthKey: '2024-01',
      label: 'enero 2024',
      count: 100,
      assets: [],
      year: 2024,
      month: 1,
    },
    {
      monthKey: '2024-02',
      label: 'febrero 2024',
      count: 50,
      assets: [],
      year: 2024,
      month: 2,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockedGetMonthBuckets.mockResolvedValue(mockBuckets);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Initial Load', () => {
    it('should load buckets on mount', async () => {
      const { result } = renderHook(() =>
        useLibraryBuckets({
          filter: 'all',
          sortOrder: 'newest',
        })
      );

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.buckets).toEqual(mockBuckets);
      expect(result.current.error).toBeNull();
    });

    it('should handle load errors', async () => {
      const error = new Error('Database error');
      mockedGetMonthBuckets.mockRejectedValue(error);

      const { result } = renderHook(() =>
        useLibraryBuckets({
          filter: 'all',
          sortOrder: 'newest',
          maxRetries: 1, // Simple test with 1 retry
        })
      );

      // Initial call fails
      await waitFor(() => {
        expect(mockedGetMonthBuckets).toHaveBeenCalledTimes(1);
      });

      // First retry (after 1 second)
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(mockedGetMonthBuckets).toHaveBeenCalledTimes(2);
      });

      // After max retries, error should be set
      await waitFor(() => {
        expect(result.current.error).toBe('Database error');
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.buckets).toEqual([]);
    });
  });

  describe('Exponential Backoff', () => {
    it('should retry with exponential backoff on transient errors', async () => {
      const transientError = new Error('Network timeout');
      mockedGetMonthBuckets
        .mockRejectedValueOnce(transientError)
        .mockResolvedValueOnce(mockBuckets);

      const { result } = renderHook(() =>
        useLibraryBuckets({
          filter: 'all',
          sortOrder: 'newest',
          maxRetries: 1,
        })
      );

      // Initial failure
      await waitFor(() => {
        expect(mockedGetMonthBuckets).toHaveBeenCalledTimes(1);
      });

      // First retry after 1 second
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(mockedGetMonthBuckets).toHaveBeenCalledTimes(2);
      });

      // Should succeed after retry
      expect(result.current.buckets).toEqual(mockBuckets);
      expect(result.current.error).toBeNull();
    });

    it('should not retry SQL syntax errors', async () => {
      const sqlError = new Error('ambiguous column name: created_at');
      mockedGetMonthBuckets.mockRejectedValue(sqlError);

      const { result } = renderHook(() =>
        useLibraryBuckets({
          filter: 'all',
          sortOrder: 'newest',
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should not retry
      act(() => {
        jest.advanceTimersByTime(10000);
      });

      expect(mockedGetMonthBuckets).toHaveBeenCalledTimes(1);
      expect(result.current.error).toContain('ambiguous column name');
    });

    it('should stop retrying after max retries', async () => {
      const error = new Error('Network error');
      mockedGetMonthBuckets.mockRejectedValue(error);

      const { result } = renderHook(() =>
        useLibraryBuckets({
          filter: 'all',
          sortOrder: 'newest',
          maxRetries: 1,
        })
      );

      // Initial failure
      await waitFor(() => {
        expect(mockedGetMonthBuckets).toHaveBeenCalledTimes(1);
      });

      // First retry
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(mockedGetMonthBuckets).toHaveBeenCalledTimes(2);
      });

      // Wait for error to be set
      await waitFor(() => {
        expect(result.current.error).toBe('Network error');
      });

      // No more retries
      act(() => {
        jest.advanceTimersByTime(10000);
      });

      expect(mockedGetMonthBuckets).toHaveBeenCalledTimes(2);
    });
  });

  describe('Filter/Sort Changes', () => {
    it('should cancel pending retry when filter changes', async () => {
      const error = new Error('Network error');
      mockedGetMonthBuckets.mockRejectedValueOnce(error).mockResolvedValue(mockBuckets);

      const { result, rerender } = renderHook(
        ({ filter, sortOrder }: { filter: LibraryFilterType; sortOrder: LibrarySortOrder }) =>
          useLibraryBuckets({
            filter,
            sortOrder,
          }),
        {
          initialProps: {
            filter: 'all' as LibraryFilterType,
            sortOrder: 'newest' as LibrarySortOrder,
          },
        }
      );

      // Initial failure triggers retry
      await waitFor(() => {
        expect(mockedGetMonthBuckets).toHaveBeenCalledTimes(1);
      });

      // Change filter before retry happens
      rerender({
        filter: 'screenshots' as LibraryFilterType,
        sortOrder: 'newest' as LibrarySortOrder,
      });

      // Advance time past when retry would have happened
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      // Should have made new call with new filter, not retry old one
      await waitFor(() => {
        expect(mockedGetMonthBuckets).toHaveBeenCalledTimes(2);
      });

      expect(mockedGetMonthBuckets).toHaveBeenLastCalledWith(
        expect.objectContaining({ filter: 'screenshots' })
      );
      expect(result.current.buckets).toEqual(mockBuckets);
    });

    it('should reset offset when filter changes', async () => {
      const { rerender } = renderHook(
        ({ filter }: { filter: LibraryFilterType }) =>
          useLibraryBuckets({
            filter,
            sortOrder: 'newest',
          }),
        {
          initialProps: { filter: 'all' as LibraryFilterType },
        }
      );

      await waitFor(() => {
        expect(mockedGetMonthBuckets).toHaveBeenCalledWith(expect.objectContaining({ offset: 0 }));
      });

      // Change filter
      rerender({ filter: 'videos' as LibraryFilterType });

      await waitFor(() => {
        expect(mockedGetMonthBuckets).toHaveBeenLastCalledWith(
          expect.objectContaining({ filter: 'videos', offset: 0 })
        );
      });
    });
  });

  describe('Concurrent Operations', () => {
    it('should prevent concurrent loadMore operations', async () => {
      mockedGetMonthBuckets.mockResolvedValue(mockBuckets);

      const { result } = renderHook(() =>
        useLibraryBuckets({
          filter: 'all',
          sortOrder: 'newest',
          pageSize: 2,
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.hasMore).toBe(true);
      });

      // Trigger multiple loadMore calls
      act(() => {
        result.current.loadMore();
        result.current.loadMore();
        result.current.loadMore();
      });

      await waitFor(() => {
        expect(result.current.loadingMore).toBe(false);
      });

      // Should only call once
      expect(mockedGetMonthBuckets).toHaveBeenCalledTimes(2); // Initial + 1 loadMore
    });

    it('should not loadMore while refreshing', async () => {
      const { result } = renderHook(() =>
        useLibraryBuckets({
          filter: 'all',
          sortOrder: 'newest',
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Start refresh
      act(() => {
        result.current.refresh();
      });

      // Try to loadMore while refreshing
      act(() => {
        result.current.loadMore();
      });

      // Should only have initial + refresh calls
      expect(mockedGetMonthBuckets).toHaveBeenCalledTimes(2);
    });

    it('should clear pending retry on refresh', async () => {
      const error = new Error('Network error');
      mockedGetMonthBuckets.mockRejectedValueOnce(error).mockResolvedValue(mockBuckets);

      const { result } = renderHook(() =>
        useLibraryBuckets({
          filter: 'all',
          sortOrder: 'newest',
        })
      );

      // Initial failure
      await waitFor(() => {
        expect(mockedGetMonthBuckets).toHaveBeenCalledTimes(1);
      });

      // Refresh immediately (clears retry)
      act(() => {
        result.current.refresh();
      });

      await waitFor(() => {
        expect(result.current.refreshing).toBe(false);
        expect(result.current.buckets).toEqual(mockBuckets);
      });

      // Advance time to verify no retry happens
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      // Should only have initial + refresh
      expect(mockedGetMonthBuckets).toHaveBeenCalledTimes(2);
    });
  });

  describe('Pagination', () => {
    it('should load more buckets with correct offset', async () => {
      const firstPage = mockBuckets.slice(0, 1);
      const secondPage = mockBuckets.slice(1, 2);

      (getMonthBuckets as jest.Mock)
        .mockResolvedValueOnce(firstPage)
        .mockResolvedValueOnce(secondPage);

      const { result } = renderHook(() =>
        useLibraryBuckets({
          filter: 'all',
          sortOrder: 'newest',
          pageSize: 1,
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.buckets).toEqual(firstPage);

      // Load more
      act(() => {
        result.current.loadMore();
      });

      await waitFor(() => {
        expect(result.current.loadingMore).toBe(false);
      });

      expect(result.current.buckets).toEqual(mockBuckets);
      expect(mockedGetMonthBuckets).toHaveBeenLastCalledWith(
        expect.objectContaining({ offset: 1 })
      );
    });

    it('should set hasMore correctly', async () => {
      (getMonthBuckets as jest.Mock).mockResolvedValue([mockBuckets[0]]);

      const { result } = renderHook(() =>
        useLibraryBuckets({
          filter: 'all',
          sortOrder: 'newest',
          pageSize: 2,
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Less than pageSize returned, no more items
      expect(result.current.hasMore).toBe(false);
    });
  });

  describe('Error Recovery', () => {
    it('should reset error on successful retry', async () => {
      const error = new Error('Temporary error');
      mockedGetMonthBuckets.mockRejectedValueOnce(error).mockResolvedValueOnce(mockBuckets);

      const { result } = renderHook(() =>
        useLibraryBuckets({
          filter: 'all',
          sortOrder: 'newest',
        })
      );

      // Initial failure
      await waitFor(() => {
        expect(mockedGetMonthBuckets).toHaveBeenCalledTimes(1);
      });

      // Retry after 1 second
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(mockedGetMonthBuckets).toHaveBeenCalledTimes(2);
      });

      // Verify success
      await waitFor(() => {
        expect(result.current.error).toBeNull();
        expect(result.current.buckets).toEqual(mockBuckets);
      });
    });

    it('should allow manual error reset', async () => {
      const error = new Error('ambiguous column name: id');
      mockedGetMonthBuckets.mockRejectedValue(error);

      const { result } = renderHook(() =>
        useLibraryBuckets({
          filter: 'all',
          sortOrder: 'newest',
        })
      );

      // Wait for error to be set (SQL errors don't retry)
      await waitFor(() => {
        expect(result.current.error).toContain('ambiguous column name');
      });

      // Reset error
      act(() => {
        result.current.resetError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('Cleanup', () => {
    it('should cleanup timeouts on unmount', async () => {
      const error = new Error('Network error');
      mockedGetMonthBuckets.mockRejectedValue(error);

      const { unmount } = renderHook(() =>
        useLibraryBuckets({
          filter: 'all',
          sortOrder: 'newest',
        })
      );

      await waitFor(() => {
        expect(mockedGetMonthBuckets).toHaveBeenCalledTimes(1);
      });

      // Unmount before retry
      unmount();

      // Advance time
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      // Should not have retried after unmount
      expect(mockedGetMonthBuckets).toHaveBeenCalledTimes(1);
    });
  });
});
