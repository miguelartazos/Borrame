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
  inviteTooltipShown: boolean;
  analyticsOptIn: boolean;
  hasSeenSwipeTutorial: boolean;
  hasSeenLeftSwipeTutorial: boolean;
  hasSeenRightSwipeTutorial: boolean;
  debugOverrides?: {
    offline?: boolean;
    loading?: boolean;
    error?: boolean;
  };

  setSwipeLeftAction: (action: 'delete' | 'keep') => void;
  setSwipeRightAction: (action: 'delete' | 'keep') => void;
  setHapticFeedback: (enabled: boolean) => void;
  setAutoPlayNext: (enabled: boolean) => void;
  setConfirmBeforeDelete: (enabled: boolean) => void;
  setLanguage: (lang: string) => void;
  setInviteTooltipShown: (shown: boolean) => void;
  setAnalyticsOptIn: (optIn: boolean) => void;
  setHasSeenSwipeTutorial: (seen: boolean) => void;
  setHasSeenLeftSwipeTutorial: (seen: boolean) => void;
  setHasSeenRightSwipeTutorial: (seen: boolean) => void;
  setDebugOverrides: (overrides: SettingsState['debugOverrides']) => void;
  isOffline: () => boolean;
  isLoading: () => boolean;
  hasError: () => boolean;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set, get) => ({
      swipeLeftAction: 'delete',
      swipeRightAction: 'keep',
      hapticFeedback: true,
      autoPlayNext: true,
      confirmBeforeDelete: true,
      language: 'en',
      inviteTooltipShown: false,
      analyticsOptIn: false,
      hasSeenSwipeTutorial: false,
      hasSeenLeftSwipeTutorial: false,
      hasSeenRightSwipeTutorial: false,
      debugOverrides: undefined,

      setSwipeLeftAction: (action) => set({ swipeLeftAction: action }),
      setSwipeRightAction: (action) => set({ swipeRightAction: action }),
      setHapticFeedback: (enabled) => set({ hapticFeedback: enabled }),
      setAutoPlayNext: (enabled) => set({ autoPlayNext: enabled }),
      setConfirmBeforeDelete: (enabled) => set({ confirmBeforeDelete: enabled }),
      setLanguage: (lang) => set({ language: lang }),
      setInviteTooltipShown: (shown) => set({ inviteTooltipShown: shown }),
      setAnalyticsOptIn: (optIn) => set({ analyticsOptIn: optIn }),
      setHasSeenSwipeTutorial: (seen) => set({ hasSeenSwipeTutorial: seen }),
      setHasSeenLeftSwipeTutorial: (seen) => set({ hasSeenLeftSwipeTutorial: seen }),
      setHasSeenRightSwipeTutorial: (seen) => set({ hasSeenRightSwipeTutorial: seen }),
      setDebugOverrides: (overrides) => set({ debugOverrides: overrides }),
      isOffline: () => get().debugOverrides?.offline ?? false,
      isLoading: () => get().debugOverrides?.loading ?? false,
      hasError: () => get().debugOverrides?.error ?? false,
    }),
    {
      name: 'swipeclean-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
