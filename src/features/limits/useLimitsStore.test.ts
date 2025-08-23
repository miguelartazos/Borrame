import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLimitsStore } from './useLimitsStore';
import { logger } from '../../lib/logger';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

jest.mock('../../lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
  },
}));

describe('useLimitsStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-15'));
    useLimitsStore.setState({
      deletesToday: 0,
      lastDate: '2024-01-15',
      isPro: false,
      remainingToday: 50,
      isLoading: true,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('loadLimits', () => {
    it('should load limits from storage', async () => {
      const mockLimits = { deletesToday: 10, lastDate: '2024-01-15' };
      const mockEntitlements = { isPro: false };

      (AsyncStorage.getItem as jest.Mock)
        .mockResolvedValueOnce(JSON.stringify(mockLimits))
        .mockResolvedValueOnce(JSON.stringify(mockEntitlements));

      await useLimitsStore.getState().loadLimits();

      expect(useLimitsStore.getState()).toMatchObject({
        deletesToday: 10,
        lastDate: '2024-01-15',
        isPro: false,
        remainingToday: 40,
        isLoading: false,
      });
    });

    it('should reset counts on day rollover', async () => {
      const mockLimits = { deletesToday: 30, lastDate: '2024-01-14' };
      const mockEntitlements = { isPro: false };

      (AsyncStorage.getItem as jest.Mock)
        .mockResolvedValueOnce(JSON.stringify(mockLimits))
        .mockResolvedValueOnce(JSON.stringify(mockEntitlements));

      await useLimitsStore.getState().loadLimits();

      expect(useLimitsStore.getState()).toMatchObject({
        deletesToday: 0,
        lastDate: '2024-01-15',
        remainingToday: 50,
      });

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@swipeclean/limits',
        JSON.stringify({ deletesToday: 0, lastDate: '2024-01-15' })
      );
    });

    it('should handle Pro users with unlimited deletes', async () => {
      const mockLimits = { deletesToday: 100, lastDate: '2024-01-15' };
      const mockEntitlements = { isPro: true };

      (AsyncStorage.getItem as jest.Mock)
        .mockResolvedValueOnce(JSON.stringify(mockLimits))
        .mockResolvedValueOnce(JSON.stringify(mockEntitlements));

      await useLimitsStore.getState().loadLimits();

      expect(useLimitsStore.getState()).toMatchObject({
        isPro: true,
        remainingToday: Infinity,
      });
    });
  });

  describe('recordDeletions', () => {
    it('should update deletion count for today', async () => {
      useLimitsStore.setState({
        deletesToday: 10,
        lastDate: '2024-01-15',
        isPro: false,
      });

      await useLimitsStore.getState().recordDeletions(5);

      expect(useLimitsStore.getState()).toMatchObject({
        deletesToday: 15,
        remainingToday: 35,
      });

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@swipeclean/limits',
        JSON.stringify({ deletesToday: 15, lastDate: '2024-01-15' })
      );
    });

    it('should handle day rollover when recording', async () => {
      useLimitsStore.setState({
        deletesToday: 10,
        lastDate: '2024-01-14',
        isPro: false,
      });

      await useLimitsStore.getState().recordDeletions(5);

      expect(useLimitsStore.getState()).toMatchObject({
        deletesToday: 5,
        lastDate: '2024-01-15',
        remainingToday: 45,
      });
    });
  });

  describe('canCommit', () => {
    it('should allow commits within limit for free users', () => {
      useLimitsStore.setState({
        isPro: false,
        remainingToday: 10,
      });

      expect(useLimitsStore.getState().canCommit(5)).toBe(true);
      expect(useLimitsStore.getState().canCommit(10)).toBe(true);
      expect(useLimitsStore.getState().canCommit(11)).toBe(false);
    });

    it('should allow unlimited commits for Pro users', () => {
      useLimitsStore.setState({
        isPro: true,
        remainingToday: Infinity,
      });

      expect(useLimitsStore.getState().canCommit(100)).toBe(true);
      expect(useLimitsStore.getState().canCommit(1000)).toBe(true);
    });
  });

  describe('unlockPro', () => {
    it('should set Pro status and save to storage', async () => {
      await useLimitsStore.getState().unlockPro();

      expect(useLimitsStore.getState()).toMatchObject({
        isPro: true,
        remainingToday: Infinity,
      });

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@swipeclean/entitlements',
        JSON.stringify({ isPro: true })
      );
    });
  });

  describe('edge cases', () => {
    it('should reject negative deletion counts', async () => {
      useLimitsStore.setState({
        deletesToday: 10,
        lastDate: '2024-01-15',
        isPro: false,
      });

      await useLimitsStore.getState().recordDeletions(-10);

      expect(useLimitsStore.getState().deletesToday).toBe(10); // Unchanged
      expect(useLimitsStore.getState().remainingToday).toBe(40); // Unchanged
      expect(logger.warn).toHaveBeenCalledWith('Attempted to record negative deletions:', -10);
    });

    it('should handle far future dates', async () => {
      jest.setSystemTime(new Date('2099-12-31'));

      const mockLimits = { deletesToday: 10, lastDate: '2099-12-30' };
      (AsyncStorage.getItem as jest.Mock)
        .mockResolvedValueOnce(JSON.stringify(mockLimits))
        .mockResolvedValueOnce(JSON.stringify({ isPro: false }));

      await useLimitsStore.getState().loadLimits();

      expect(useLimitsStore.getState().lastDate).toBe('2099-12-31');
      expect(useLimitsStore.getState().deletesToday).toBe(0);
    });

    it('should handle far past dates', async () => {
      jest.setSystemTime(new Date('2024-01-15'));

      const mockLimits = { deletesToday: 30, lastDate: '1970-01-01' };
      (AsyncStorage.getItem as jest.Mock)
        .mockResolvedValueOnce(JSON.stringify(mockLimits))
        .mockResolvedValueOnce(JSON.stringify({ isPro: false }));

      await useLimitsStore.getState().loadLimits();

      expect(useLimitsStore.getState().deletesToday).toBe(0);
      expect(useLimitsStore.getState().remainingToday).toBe(50);
    });

    it('should handle daylight saving time transitions', async () => {
      jest.setSystemTime(new Date('2024-03-10T07:00:00Z'));

      useLimitsStore.setState({
        deletesToday: 25,
        lastDate: '2024-03-09',
        isPro: false,
      });

      await useLimitsStore.getState().recordDeletions(5);

      expect(useLimitsStore.getState().lastDate).toBe('2024-03-10');
      expect(useLimitsStore.getState().deletesToday).toBe(5);
    });

    it('should cap remainingToday at 0 for free users', async () => {
      useLimitsStore.setState({
        deletesToday: 60,
        lastDate: '2024-01-15',
        isPro: false,
      });

      await useLimitsStore.getState().recordDeletions(10);

      expect(useLimitsStore.getState().remainingToday).toBe(0);
      expect(useLimitsStore.getState().canCommit(1)).toBe(false);
    });
  });
});
