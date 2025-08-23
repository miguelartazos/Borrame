import { create } from 'zustand';
import { subscribeWithSelector, persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getPendingSpaceEstimate } from '../features/pending/selectors';
import { logger } from '../lib/logger';

interface PendingStore {
  pendingCount: number;
  spaceEstimate: number;
  lastUpdated: number;
  setPendingCount: (count: number) => void;
  setSpaceEstimate: (bytes: number) => void;
  incrementPending: () => void;
  decrementPending: () => void;
  refreshSpaceEstimate: () => Promise<void>;
}

export const usePendingStore = create<PendingStore>()(
  persist(
    subscribeWithSelector((set, get) => ({
      pendingCount: 0,
      spaceEstimate: 0,
      lastUpdated: Date.now(),

      setPendingCount: (count) =>
        set({
          pendingCount: count,
          lastUpdated: Date.now(),
        }),

      setSpaceEstimate: (bytes) =>
        set({
          spaceEstimate: bytes,
        }),

      incrementPending: () => {
        set((state) => ({
          pendingCount: state.pendingCount + 1,
          lastUpdated: Date.now(),
        }));
        // Refresh space estimate after increment
        get().refreshSpaceEstimate();
      },

      decrementPending: () => {
        set((state) => ({
          pendingCount: Math.max(0, state.pendingCount - 1),
          lastUpdated: Date.now(),
        }));
        // Refresh space estimate after decrement
        get().refreshSpaceEstimate();
      },

      refreshSpaceEstimate: async () => {
        try {
          const bytes = await getPendingSpaceEstimate();
          set({ spaceEstimate: bytes });
        } catch (error) {
          logger.error('Failed to refresh space estimate:', error as Error);
        }
      },
    })),
    {
      name: 'pending-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ pendingCount: state.pendingCount }),
    }
  )
);

// Selectors
export const usePendingCount = () => usePendingStore((state) => state.pendingCount);
export const usePendingSpaceEstimate = () => usePendingStore((state) => state.spaceEstimate);
export const useSetPendingCount = () => usePendingStore((state) => state.setPendingCount);
export const useSetSpaceEstimate = () => usePendingStore((state) => state.setSpaceEstimate);
export const useIncrementPending = () => usePendingStore((state) => state.incrementPending);
export const useDecrementPending = () => usePendingStore((state) => state.decrementPending);
export const useRefreshSpaceEstimate = () => usePendingStore((state) => state.refreshSpaceEstimate);
