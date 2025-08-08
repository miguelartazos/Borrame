import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SettingsState {
  swipeLeftAction: 'delete' | 'keep';
  swipeRightAction: 'delete' | 'keep';
  hapticFeedback: boolean;
  autoPlayNext: boolean;
  confirmBeforeDelete: boolean;
  language: string;

  setSwipeLeftAction: (action: 'delete' | 'keep') => void;
  setSwipeRightAction: (action: 'delete' | 'keep') => void;
  setHapticFeedback: (enabled: boolean) => void;
  setAutoPlayNext: (enabled: boolean) => void;
  setConfirmBeforeDelete: (enabled: boolean) => void;
  setLanguage: (lang: string) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      swipeLeftAction: 'delete',
      swipeRightAction: 'keep',
      hapticFeedback: true,
      autoPlayNext: true,
      confirmBeforeDelete: true,
      language: 'en',

      setSwipeLeftAction: (action) => set({ swipeLeftAction: action }),
      setSwipeRightAction: (action) => set({ swipeRightAction: action }),
      setHapticFeedback: (enabled) => set({ hapticFeedback: enabled }),
      setAutoPlayNext: (enabled) => set({ autoPlayNext: enabled }),
      setConfirmBeforeDelete: (enabled) => set({ confirmBeforeDelete: enabled }),
      setLanguage: (lang) => set({ language: lang }),
    }),
    {
      name: 'swipeclean-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
