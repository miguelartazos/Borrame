import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Share } from 'react-native';
import { analytics } from '../lib/analytics';

export interface ReferralTier {
  threshold: number;
  titleKey: string; // i18n key for the reward title
  subtitleKey?: string; // optional i18n key for subtitle/context
}

interface ReferralState {
  myCode: string | null;
  invitedCount: number; // total invitations sent
  joinedCount: number; // friends who joined using your code
  tiers: ReferralTier[];
  lastUpdated: number;

  fetchOrCreateCode: () => Promise<string>;
  shareInvite: () => Promise<void>;
  copyCode: () => Promise<void>;
  redeemCode: (code: string) => Promise<{ ok: boolean; error?: string }>;
  refreshProgress: () => Promise<void>;
}

// Simple offline-safe code generator
function generateCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

export const useReferralStore = create<ReferralState>()(
  persist(
    (set, get) => ({
      myCode: null,
      invitedCount: 0,
      joinedCount: 0,
      tiers: [
        { threshold: 1, titleKey: 'referrals.rewards.swipesPerFriend', subtitleKey: 'referrals.rewards.perFriend' },
        { threshold: 3, titleKey: 'referrals.rewards.monthPro', subtitleKey: 'referrals.rewards.forFriends' },
        { threshold: 8, titleKey: 'referrals.rewards.yearPro', subtitleKey: 'referrals.rewards.forFriends' },
      ],
      lastUpdated: Date.now(),

      fetchOrCreateCode: async () => {
        const current = get().myCode;
        if (current) return current;
        // In a future iteration, fetch from backend; for now, generate and persist
        const newCode = generateCode();
        set({ myCode: newCode, lastUpdated: Date.now() });
        analytics.track('referrals_code_created');
        return newCode;
      },

      shareInvite: async () => {
        const code = (await get().fetchOrCreateCode()) || '';
        const message = `Join me on SwipeClean! Use my code ${code}`;
        try {
          await Share.share({ message });
          set((s) => ({ invitedCount: s.invitedCount + 1, lastUpdated: Date.now() }));
          analytics.track('referrals_share_pressed');
        } catch {
          // Silent: user may cancel share sheet
        }
      },

      copyCode: async () => {
        const code = (await get().fetchOrCreateCode()) || '';
        try {
          const { setStringAsync } = await import('expo-clipboard');
          await setStringAsync(code);
          analytics.track('referrals_code_copied');
        } catch {
          // If native module is unavailable, fall back to sharing the code
          try {
            await Share.share({ message: code });
          } catch {
            // noop
          }
        }
      },

      redeemCode: async (code: string) => {
        // Placeholder client-side validation. Replace with service call later.
        const valid = /^[A-Z0-9]{5}$/i.test(code.trim());
        if (!valid) {
          analytics.track('referrals_redeem_failed');
          return { ok: false, error: 'invalid' };
        }
        // Optimistic: mark 1 friend joined for demo purposes
        set((s) => ({ joinedCount: Math.min(s.joinedCount + 1, 999), lastUpdated: Date.now() }));
        analytics.track('referrals_code_redeemed');
        return { ok: true };
      },

      refreshProgress: async () => {
        // If you later add a real service, poll here
        set({ lastUpdated: Date.now() });
      },
    }),
    {
      name: 'referrals-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ myCode: s.myCode, invitedCount: s.invitedCount, joinedCount: s.joinedCount }),
    }
  )
);

// Selectors
export const useInviteCode = () => useReferralStore((s) => s.myCode);
export const useInvitedCount = () => useReferralStore((s) => s.invitedCount);
export const useJoinedCount = () => useReferralStore((s) => s.joinedCount);
export const useReferralTiers = () => useReferralStore((s) => s.tiers);
export const useShareInvite = () => useReferralStore((s) => s.shareInvite);
export const useCopyInviteCode = () => useReferralStore((s) => s.copyCode);
export const useRedeemCode = () => useReferralStore((s) => s.redeemCode);
export const useFetchOrCreateCode = () => useReferralStore((s) => s.fetchOrCreateCode);

