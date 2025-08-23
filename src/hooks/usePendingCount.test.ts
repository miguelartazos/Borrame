import { renderHook, waitFor } from '@testing-library/react-hooks';
import { usePendingCount } from './usePendingCount';
import * as selectors from '../features/pending/selectors';
import { usePendingStore } from '../store/usePendingStore';

// Mock the selectors module
jest.mock('../features/pending/selectors', () => ({
  getPendingCount: jest.fn(),
}));

describe('usePendingCount', () => {
  beforeEach(() => {
    // Reset store state
    usePendingStore.setState({ pendingCount: 0, lastUpdated: Date.now() });
    jest.clearAllMocks();
  });

  it('returns the current pending count from store', () => {
    // Set initial store value
    usePendingStore.setState({ pendingCount: 5, lastUpdated: Date.now() });

    const { result } = renderHook(() => usePendingCount());

    expect(result.current).toBe(5);
  });

  it('fetches initial count from database on mount', async () => {
    const mockGetPendingCount = jest.mocked(selectors.getPendingCount);
    mockGetPendingCount.mockResolvedValue(10);

    const { result } = renderHook(() => usePendingCount());

    // Wait for async effect to complete
    await waitFor(() => {
      expect(mockGetPendingCount).toHaveBeenCalledTimes(1);
    });

    // Count should be updated from database
    expect(result.current).toBe(10);
  });

  it('only fetches from database once on mount', async () => {
    const mockGetPendingCount = jest.mocked(selectors.getPendingCount);
    mockGetPendingCount.mockResolvedValue(7);

    const { rerender } = renderHook(() => usePendingCount());

    await waitFor(() => {
      expect(mockGetPendingCount).toHaveBeenCalledTimes(1);
    });

    // Rerender should not trigger another fetch
    rerender();

    expect(mockGetPendingCount).toHaveBeenCalledTimes(1);
  });

  it('handles database fetch errors gracefully', async () => {
    const mockGetPendingCount = jest.mocked(selectors.getPendingCount);
    mockGetPendingCount.mockRejectedValue(new Error('DB Error'));

    const { result } = renderHook(() => usePendingCount());

    // Should not throw and should return default value
    expect(result.current).toBe(0);

    await waitFor(() => {
      expect(mockGetPendingCount).toHaveBeenCalledTimes(1);
    });
  });

  it('does not update state if component unmounts during fetch', async () => {
    const mockGetPendingCount = jest.mocked(selectors.getPendingCount);

    // Create a delayed promise to simulate slow DB fetch
    let resolvePromise: (value: number) => void;
    const delayedPromise = new Promise<number>((resolve) => {
      resolvePromise = resolve;
    });
    mockGetPendingCount.mockReturnValue(delayedPromise);

    const { result, unmount } = renderHook(() => usePendingCount());

    // Initial count should be 0
    expect(result.current).toBe(0);

    // Unmount before promise resolves
    unmount();

    // Resolve the promise after unmount
    resolvePromise!(15);

    // Wait a bit to ensure no state updates happen
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Store should not be updated since component unmounted
    expect(usePendingStore.getState().pendingCount).toBe(0);
  });

  it('updates when store state changes', () => {
    const { result, rerender } = renderHook(() => usePendingCount());

    expect(result.current).toBe(0);

    // Update store state
    usePendingStore.setState({ pendingCount: 20, lastUpdated: Date.now() });

    rerender();
    expect(result.current).toBe(20);
  });

  it('uses memoized setPendingCount function', async () => {
    const mockGetPendingCount = jest.mocked(selectors.getPendingCount);
    mockGetPendingCount.mockResolvedValue(5);

    const { rerender } = renderHook(() => usePendingCount());

    await waitFor(() => {
      expect(mockGetPendingCount).toHaveBeenCalledTimes(1);
    });

    // Multiple rerenders should not cause additional fetches
    rerender();
    rerender();
    rerender();

    expect(mockGetPendingCount).toHaveBeenCalledTimes(1);
  });
});
