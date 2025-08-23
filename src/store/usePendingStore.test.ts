import { renderHook, act } from '@testing-library/react-hooks';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  usePendingStore,
  usePendingCount,
  useSetPendingCount,
  useIncrementPending,
  useDecrementPending,
} from './usePendingStore';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe('usePendingStore', () => {
  beforeEach(() => {
    // Reset store state
    usePendingStore.setState({ pendingCount: 0, lastUpdated: Date.now() });
    jest.clearAllMocks();
  });

  describe('usePendingCount', () => {
    it('returns the current pending count', () => {
      const { result } = renderHook(() => usePendingCount());
      expect(result.current).toBe(0);
    });

    it('updates when count changes', () => {
      const { result, rerender } = renderHook(() => usePendingCount());

      act(() => {
        usePendingStore.setState({ pendingCount: 5, lastUpdated: Date.now() });
      });

      rerender();
      expect(result.current).toBe(5);
    });
  });

  describe('useSetPendingCount', () => {
    it('sets the pending count to a specific value', () => {
      const { result: setCount } = renderHook(() => useSetPendingCount());
      const { result: count } = renderHook(() => usePendingCount());

      act(() => {
        setCount.current(10);
      });

      expect(count.current).toBe(10);
    });

    it('updates lastUpdated timestamp', () => {
      const { result: setCount } = renderHook(() => useSetPendingCount());
      const initialTime = usePendingStore.getState().lastUpdated;

      // Wait a bit to ensure timestamp difference
      jest.advanceTimersByTime(100);

      act(() => {
        setCount.current(5);
      });

      const newTime = usePendingStore.getState().lastUpdated;
      expect(newTime).toBeGreaterThanOrEqual(initialTime);
    });
  });

  describe('useIncrementPending', () => {
    it('increments the pending count by 1', () => {
      const { result: increment } = renderHook(() => useIncrementPending());
      const { result: count } = renderHook(() => usePendingCount());

      act(() => {
        increment.current();
      });

      expect(count.current).toBe(1);

      act(() => {
        increment.current();
      });

      expect(count.current).toBe(2);
    });
  });

  describe('useDecrementPending', () => {
    it('decrements the pending count by 1', () => {
      const { result: decrement } = renderHook(() => useDecrementPending());
      const { result: setCount } = renderHook(() => useSetPendingCount());
      const { result: count } = renderHook(() => usePendingCount());

      // Set initial count
      act(() => {
        setCount.current(3);
      });

      act(() => {
        decrement.current();
      });

      expect(count.current).toBe(2);
    });

    it('does not go below 0', () => {
      const { result: decrement } = renderHook(() => useDecrementPending());
      const { result: count } = renderHook(() => usePendingCount());

      act(() => {
        decrement.current();
      });

      expect(count.current).toBe(0);

      act(() => {
        decrement.current();
      });

      expect(count.current).toBe(0);
    });
  });

  describe('persistence', () => {
    it('persists only pendingCount to AsyncStorage', async () => {
      const { result: setCount } = renderHook(() => useSetPendingCount());

      act(() => {
        setCount.current(7);
      });

      // Wait for persistence
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      // Check that AsyncStorage.setItem was called
      expect(AsyncStorage.setItem).toHaveBeenCalled();

      // Check the persisted data structure
      const calls = (AsyncStorage.setItem as jest.Mock).mock.calls;
      const lastCall = calls[calls.length - 1];
      const [key, value] = lastCall;

      expect(key).toBe('pending-storage');
      const parsed = JSON.parse(value);
      expect(parsed.state.pendingCount).toBe(7);
      // lastUpdated should not be persisted
      expect(parsed.state.lastUpdated).toBeUndefined();
    });
  });

  describe('subscriptions', () => {
    it('notifies subscribers when count changes', () => {
      const listener = jest.fn();

      const unsubscribe = usePendingStore.subscribe((state) => state.pendingCount, listener);

      act(() => {
        usePendingStore.setState({ pendingCount: 15, lastUpdated: Date.now() });
      });

      expect(listener).toHaveBeenCalledWith(15, 0);

      unsubscribe();
    });
  });
});
