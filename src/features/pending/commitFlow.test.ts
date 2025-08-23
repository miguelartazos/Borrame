import { Alert } from 'react-native';
import { buildCommitPreview, executeCommit, showCommitConfirmation } from './commitFlow';
import { DeletionService } from '../../services/DeletionService';
import { getPendingAssets, getPendingSpaceEstimate } from './selectors';
import { useLimitsStore } from '../limits/useLimitsStore';

jest.mock('./selectors');
jest.mock('../../services/DeletionService');
jest.mock('../limits/useLimitsStore');
jest.mock('react-native', () => ({
  Alert: { alert: jest.fn() },
}));
jest.mock('../../lib/analytics', () => ({
  analytics: { track: jest.fn() },
}));
jest.mock('../../i18n', () => ({
  default: { t: (key: string) => key },
}));

describe('commitFlow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('buildCommitPreview', () => {
    it('should build preview for free user within limit', async () => {
      const mockAssets = Array(30).fill({ id: 'asset', size_bytes: 1000 });
      (getPendingAssets as jest.Mock).mockResolvedValue(mockAssets);
      (getPendingSpaceEstimate as jest.Mock).mockResolvedValue(30000);
      (useLimitsStore.getState as jest.Mock).mockReturnValue({
        remainingToday: 50,
        isPro: false,
      });

      const preview = await buildCommitPreview();

      expect(preview).toEqual({
        pendingCount: 30,
        eligibleToCommit: 30,
        willDefer: 0,
        bytesEstimate: 30000,
        requiresDoubleConfirm: false,
      });
    });

    it('should handle partial commit for free user over limit', async () => {
      const mockAssets = Array(60).fill({ id: 'asset', size_bytes: 1000 });
      (getPendingAssets as jest.Mock).mockResolvedValue(mockAssets);
      (getPendingSpaceEstimate as jest.Mock).mockResolvedValue(60000);
      (useLimitsStore.getState as jest.Mock).mockReturnValue({
        remainingToday: 20,
        isPro: false,
      });

      const preview = await buildCommitPreview();

      expect(preview).toEqual({
        pendingCount: 60,
        eligibleToCommit: 20,
        willDefer: 40,
        bytesEstimate: 60000,
        requiresDoubleConfirm: false,
      });
    });

    it('should allow unlimited for Pro users', async () => {
      const mockAssets = Array(500).fill({ id: 'asset', size_bytes: 1000 });
      (getPendingAssets as jest.Mock).mockResolvedValue(mockAssets);
      (getPendingSpaceEstimate as jest.Mock).mockResolvedValue(500000);
      (useLimitsStore.getState as jest.Mock).mockReturnValue({
        remainingToday: 50,
        isPro: true,
      });

      const preview = await buildCommitPreview();

      expect(preview).toEqual({
        pendingCount: 500,
        eligibleToCommit: 500,
        willDefer: 0,
        bytesEstimate: 500000,
        requiresDoubleConfirm: true, // >200 items
      });
    });

    it('should require double confirm for large deletes', async () => {
      const mockAssets = Array(250).fill({ id: 'asset', size_bytes: 1000 });
      (getPendingAssets as jest.Mock).mockResolvedValue(mockAssets);
      (getPendingSpaceEstimate as jest.Mock).mockResolvedValue(250000);
      (useLimitsStore.getState as jest.Mock).mockReturnValue({
        remainingToday: 300,
        isPro: true,
      });

      const preview = await buildCommitPreview();

      expect(preview.requiresDoubleConfirm).toBe(true);
    });

    it('should require double confirm for large bytes', async () => {
      const mockAssets = [{ id: 'asset', size_bytes: 3 * 1024 * 1024 * 1024 }];
      (getPendingAssets as jest.Mock).mockResolvedValue(mockAssets);
      (getPendingSpaceEstimate as jest.Mock).mockResolvedValue(3 * 1024 * 1024 * 1024);
      (useLimitsStore.getState as jest.Mock).mockReturnValue({
        remainingToday: 50,
        isPro: true,
      });

      const preview = await buildCommitPreview();

      expect(preview.requiresDoubleConfirm).toBe(true);
    });
  });

  describe('executeCommit', () => {
    it('should successfully commit deletions', async () => {
      const mockAssets = [
        { id: 'asset-1', size_bytes: 1000 },
        { id: 'asset-2', size_bytes: 2000 },
      ];

      (buildCommitPreview as jest.Mock) = jest.fn().mockResolvedValue({
        eligibleToCommit: 2,
      });
      (getPendingAssets as jest.Mock).mockResolvedValue(mockAssets);

      const mockDeletionService = {
        executeDelete: jest.fn().mockResolvedValue({
          successCount: 2,
          failureCount: 0,
          failedIds: [],
          totalBytes: 3000,
        }),
      };
      (DeletionService as jest.Mock).mockImplementation(() => mockDeletionService);

      const mockRecordDeletions = jest.fn();
      (useLimitsStore.getState as jest.Mock).mockReturnValue({
        recordDeletions: mockRecordDeletions,
      });

      const result = await executeCommit();

      expect(mockDeletionService.executeDelete).toHaveBeenCalledWith([
        { id: 'asset-1', size_bytes: 1000 },
        { id: 'asset-2', size_bytes: 2000 },
      ]);
      expect(mockRecordDeletions).toHaveBeenCalledWith(2);
      expect(result.success).toBe(true);
    });

    it('should handle partial failures', async () => {
      const mockAssets = [
        { id: 'asset-1', size_bytes: 1000 },
        { id: 'asset-2', size_bytes: 2000 },
      ];

      (buildCommitPreview as jest.Mock) = jest.fn().mockResolvedValue({
        eligibleToCommit: 2,
      });
      (getPendingAssets as jest.Mock).mockResolvedValue(mockAssets);

      const mockDeletionService = {
        executeDelete: jest.fn().mockResolvedValue({
          successCount: 1,
          failureCount: 1,
          failedIds: ['asset-2'],
          totalBytes: 1000,
        }),
      };
      (DeletionService as jest.Mock).mockImplementation(() => mockDeletionService);

      const mockRecordDeletions = jest.fn();
      (useLimitsStore.getState as jest.Mock).mockReturnValue({
        recordDeletions: mockRecordDeletions,
      });

      const result = await executeCommit();

      expect(mockRecordDeletions).toHaveBeenCalledWith(1);
      expect(result.success).toBe(false);
      expect(result.message).toContain('result.partial');
    });

    it('should handle no items to commit', async () => {
      (buildCommitPreview as jest.Mock) = jest.fn().mockResolvedValue({
        eligibleToCommit: 0,
      });

      const result = await executeCommit();

      expect(result.success).toBe(false);
      expect(result.message).toBe('pending.commit.noItems');
    });
  });

  describe('showCommitConfirmation', () => {
    it('should show single confirmation for small deletes', () => {
      const preview = {
        pendingCount: 10,
        eligibleToCommit: 10,
        willDefer: 0,
        bytesEstimate: 10000,
        requiresDoubleConfirm: false,
      };

      const onConfirm = jest.fn();
      const onCancel = jest.fn();

      showCommitConfirmation(preview, onConfirm, onCancel);

      expect(Alert.alert).toHaveBeenCalledTimes(1);
      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      expect(alertCall[0]).toBe('pending.commit.confirm.title');
      expect(alertCall[2]).toHaveLength(2);
    });

    it('should show double confirmation for large deletes', () => {
      const preview = {
        pendingCount: 300,
        eligibleToCommit: 300,
        willDefer: 0,
        bytesEstimate: 300000,
        requiresDoubleConfirm: true,
      };

      const onConfirm = jest.fn();
      const onCancel = jest.fn();

      showCommitConfirmation(preview, onConfirm, onCancel);

      const firstAlert = (Alert.alert as jest.Mock).mock.calls[0];
      const confirmButton = firstAlert[2][1];

      confirmButton.onPress();

      expect(Alert.alert).toHaveBeenCalledTimes(2);
      const secondAlert = (Alert.alert as jest.Mock).mock.calls[1];
      expect(secondAlert[0]).toBe('pending.commit.doubleConfirm.title');
    });
  });
});
