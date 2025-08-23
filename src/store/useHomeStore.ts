import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface HomeStore {
  lastProgress: number;
  lastProgressTimestamp: number;
  setProgress: (progress: number) => void;
  getProgress: () => number;
}

export const useHomeStore = create<HomeStore>()(
  persist(
    (set, get) => ({
      lastProgress: 0,
      lastProgressTimestamp: Date.now(),

      setProgress: (progress: number) => {
        // Validate progress is between 0 and 1
        const validProgress = Math.max(0, Math.min(1, progress));
        set({
          lastProgress: validProgress,
          lastProgressTimestamp: Date.now(),
        });
      },

      getProgress: () => get().lastProgress,
    }),
    {
      name: 'home-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        lastProgress: state.lastProgress,
        lastProgressTimestamp: state.lastProgressTimestamp,
      }),
      // Handle storage errors gracefully
      onRehydrateStorage: () => (_state, error) => {
        if (error) {
          console.warn('Failed to load home storage:', error);
          // Continue with default values
        }
      },
    }
  )
);

// Primitive selectors to avoid re-renders
export const useLastProgress = () => useHomeStore((s) => s.lastProgress);
export const useLastProgressTimestamp = () => useHomeStore((s) => s.lastProgressTimestamp);
