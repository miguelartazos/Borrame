import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../lib/logger';

const ENTITLEMENTS_KEY = '@swipeclean/entitlements';

export interface Entitlements {
  isPro: boolean;
  devMode?: boolean;
  unlockedAt?: string;
  productId?: string;
  receipt?: string;
  userId?: string;
}

export class EntitlementsService {
  static async getEntitlements(): Promise<Entitlements | null> {
    try {
      const data = await AsyncStorage.getItem(ENTITLEMENTS_KEY);
      return data ? (JSON.parse(data) as Entitlements) : null;
    } catch (error) {
      logger.error('Failed to get entitlements', error);
      return null;
    }
  }

  static async purchasePro(): Promise<Entitlements> {
    if (!__DEV__) {
      // Secure purchase flow not implemented; enforce server validation before enabling in prod
      const error = new Error('Purchase flow not implemented for production.');
      logger.error('SECURITY: Attempted to purchase Pro without server-side validation');
      throw error;
    }

    const entitlements: Entitlements = {
      isPro: true,
      devMode: true,
      unlockedAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(ENTITLEMENTS_KEY, JSON.stringify(entitlements));
    return entitlements;
  }

  static async restorePro(): Promise<Entitlements | null> {
    const entitlements = await this.getEntitlements();
    return entitlements;
  }

  static async validate(): Promise<boolean> {
    try {
      const entitlements = await this.getEntitlements();
      if (!entitlements) return false;
      if (entitlements.devMode) {
        logger.warn('Dev-mode entitlements present during validation');
        return false;
      }
      // TODO: call backend to validate receipt and productId
      return Boolean(entitlements.isPro);
    } catch (error) {
      logger.error('Failed to validate entitlements', error);
      return false;
    }
  }
}
