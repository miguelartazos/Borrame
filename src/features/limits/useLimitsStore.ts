import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../../lib/logger';
import { EntitlementsService } from '../../services/EntitlementsService';

interface LimitsState {
  deletesToday: number;
  lastDate: string;
  isPro: boolean;
  remainingToday: number;
  isLoading: boolean;
  lastValidation: string | null;
  loadLimits: () => Promise<void>;
  recordDeletions: (count: number) => Promise<void>;
  canCommit: (count: number) => boolean;
  unlockPro: () => Promise<void>;
  validateProStatus: () => Promise<boolean>;
}

const DAILY_LIMIT = 50;
const LIMITS_KEY = '@swipeclean/limits';
const ENTITLEMENTS_KEY = '@swipeclean/entitlements';

function getTodayString(): string {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

export const useLimitsStore = create<LimitsState>((set, get) => ({
  deletesToday: 0,
  lastDate: getTodayString(),
  isPro: false,
  remainingToday: DAILY_LIMIT,
  isLoading: true,
  lastValidation: null,

  loadLimits: async () => {
    try {
      const today = getTodayString();

      const [limitsData, entitlementsData] = await Promise.all([
        AsyncStorage.getItem(LIMITS_KEY),
        AsyncStorage.getItem(ENTITLEMENTS_KEY),
      ]);

      const limits = limitsData ? JSON.parse(limitsData) : { deletesToday: 0, lastDate: today };
      const entitlements = entitlementsData ? JSON.parse(entitlementsData) : { isPro: false };

      // Validate Pro status if it's been more than 1 hour since last check
      let validatedPro = entitlements.isPro;
      if (entitlements.isPro && !__DEV__) {
        const { lastValidation } = get();
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

        if (!lastValidation || lastValidation < oneHourAgo) {
          validatedPro = await get().validateProStatus();
        }
      }

      const deletesToday = limits.lastDate === today ? limits.deletesToday : 0;
      const remainingToday = entitlements.isPro
        ? Infinity
        : Math.max(0, DAILY_LIMIT - deletesToday);

      set({
        deletesToday,
        lastDate: today,
        isPro: validatedPro,
        remainingToday: validatedPro ? Infinity : remainingToday,
        isLoading: false,
      });

      if (limits.lastDate !== today) {
        await AsyncStorage.setItem(
          LIMITS_KEY,
          JSON.stringify({ deletesToday: 0, lastDate: today })
        );
      }
    } catch (error) {
      logger.error('Failed to load limits', error);
      set({
        deletesToday: 0,
        lastDate: getTodayString(),
        isPro: false,
        remainingToday: DAILY_LIMIT,
        isLoading: false,
      });
    }
  },

  recordDeletions: async (count: number) => {
    if (count < 0) {
      logger.warn('Attempted to record negative deletions:', count);
      return;
    }

    const { deletesToday, lastDate, isPro } = get();
    const today = getTodayString();

    const newDeletesToday = Math.max(0, lastDate === today ? deletesToday + count : count);
    const remainingToday = isPro ? Infinity : Math.max(0, DAILY_LIMIT - newDeletesToday);

    set({
      deletesToday: newDeletesToday,
      lastDate: today,
      remainingToday,
    });

    try {
      await AsyncStorage.setItem(
        LIMITS_KEY,
        JSON.stringify({ deletesToday: newDeletesToday, lastDate: today })
      );
    } catch (error) {
      logger.error('Failed to save deletion count', error);
    }
  },

  canCommit: (count: number) => {
    const { isPro, remainingToday } = get();
    return isPro || count <= remainingToday;
  },

  unlockPro: async () => {
    try {
      const entitlements = await EntitlementsService.purchasePro();
      if (entitlements?.isPro) {
        set({ isPro: true, remainingToday: Infinity });
      }
    } catch (error) {
      throw error;
    }
  },

  validateProStatus: async () => {
    try {
      const isValid = await EntitlementsService.validate();
      if (!isValid) {
        set({ isPro: false, remainingToday: DAILY_LIMIT - get().deletesToday });
      } else {
        set({ isPro: true, remainingToday: Infinity });
      }
      set({ lastValidation: new Date().toISOString() });
      return isValid;
    } catch (error) {
      logger.error('Failed to validate Pro status', error);
      return get().isPro;
    }
  },
}));
