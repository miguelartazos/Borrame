import { Alert, Platform } from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import { DeletionService } from '../../services/DeletionService';
import { getPendingAssets, getPendingSpaceEstimate } from './selectors';
import { useLimitsStore } from '../limits/useLimitsStore';
import { analytics } from '../../lib/analytics';
import { formatBytes } from '../../lib/formatters';
import { logger } from '../../lib/logger';
import i18n from '../../i18n';

export interface CommitPreview {
  pendingCount: number;
  eligibleToCommit: number;
  willDefer: number;
  bytesEstimate: number;
  requiresDoubleConfirm: boolean;
}

const LARGE_DELETE_THRESHOLD = 200;
const LARGE_BYTES_THRESHOLD = 2 * 1024 * 1024 * 1024; // 2GB

export async function buildCommitPreview(
  limitsState = useLimitsStore.getState()
): Promise<CommitPreview> {
  const [assets, spaceEstimate] = await Promise.all([
    getPendingAssets(),
    getPendingSpaceEstimate(),
  ]);

  const { remainingToday, isPro } = limitsState;
  const pendingCount = assets.length;
  const eligibleToCommit = isPro ? pendingCount : Math.min(pendingCount, remainingToday);
  const willDefer = Math.max(0, pendingCount - eligibleToCommit);

  const requiresDoubleConfirm =
    eligibleToCommit >= LARGE_DELETE_THRESHOLD || spaceEstimate >= LARGE_BYTES_THRESHOLD;

  analytics.track('commit_preview_shown', {
    pendingCount,
    eligibleToCommit,
    willDefer,
    bytesEstimate: spaceEstimate,
    isPro,
  });

  return {
    pendingCount,
    eligibleToCommit,
    willDefer,
    bytesEstimate: spaceEstimate,
    requiresDoubleConfirm,
  };
}

export async function executeCommit(
  onProgress?: (message: string) => void
): Promise<{ success: boolean; message: string; permissionError?: boolean }> {
  try {
    logger.info('Starting commit execution');
    
    // First check permissions
    const permissionStatus = await MediaLibrary.getPermissionsAsync(false);
    logger.info('Permission status:', permissionStatus);
    
    if (permissionStatus.status !== 'granted') {
      logger.error('No media library permissions');
      return {
        success: false,
        message: i18n.t('pending.commit.permissionError'),
        permissionError: true,
      };
    }
    
    // On iOS, check for limited access
    if (Platform.OS === 'ios' && permissionStatus.accessPrivileges === 'limited') {
      logger.error('Limited photo access on iOS - cannot delete');
      Alert.alert(
        i18n.t('common.error'),
        'You have granted limited photo access. To delete photos, please grant full access in Settings.',
        [
          { text: i18n.t('common.cancel'), style: 'cancel' },
          {
            text: i18n.t('common.openSettings'),
            onPress: () => DeletionService.openPhotoSettings(),
          },
        ]
      );
      return {
        success: false,
        message: 'Full photo access required for deletion',
        permissionError: true,
      };
    }
    
    const preview = await buildCommitPreview();

    if (preview.eligibleToCommit === 0) {
      return {
        success: false,
        message: i18n.t('pending.commit.noItems'),
      };
    }

    onProgress?.(i18n.t('pending.commit.preparing'));

    const assets = await getPendingAssets();
    const assetsToDelete = assets.slice(0, preview.eligibleToCommit);
    
    logger.info(`Preparing to delete ${assetsToDelete.length} assets`);

    const deletionService = new DeletionService();
    logger.info('Calling DeletionService.executeDelete');
    
    const result = await deletionService.executeDelete(
      assetsToDelete.map((a) => ({
        id: a.id,
        size_bytes: a.size_bytes,
      }))
    );
    
    logger.info('Deletion result:', {
      successCount: result.successCount,
      failureCount: result.failureCount,
      permissionError: result.permissionError,
    });

    const { recordDeletions } = useLimitsStore.getState();
    await recordDeletions(result.successCount);

    analytics.track('commit_confirmed', {
      successCount: result.successCount,
      failureCount: result.failureCount,
      bytesFreed: result.totalBytes,
    });

    if (result.permissionError) {
      logger.error('Permission error during deletion');
      return {
        success: false,
        message: Platform.OS === 'ios' 
          ? 'Please grant full photo access in Settings to delete photos'
          : i18n.t('pending.commit.permissionError'),
        permissionError: true,
      };
    }
    
    if (result.failureCount > 0 && result.successCount === 0) {
      logger.error('All deletions failed');
      return {
        success: false,
        message: 'Failed to delete photos. Please check app permissions in Settings.',
        permissionError: true,
      };
    }
    
    if (result.failureCount > 0) {
      logger.warn(`Partial deletion: ${result.successCount} succeeded, ${result.failureCount} failed`);
      return {
        success: false,
        message: i18n.t('result.partial', {
          success: result.successCount,
          failed: result.failureCount,
        }),
      };
    }

    return {
      success: true,
      message: i18n.t('result.success', {
        count: result.successCount,
        size: formatBytes(result.totalBytes),
      }),
    };
  } catch (error) {
    logger.error('Commit execution error:', error);
    
    const errorMessage = (error as Error).message || '';
    if (errorMessage.includes('permission') || errorMessage.includes('PHPhotosErrorDomain')) {
      logger.error('Permission-related error detected');
      return {
        success: false,
        message: Platform.OS === 'ios'
          ? 'Please grant full photo access in Settings to delete photos'
          : i18n.t('pending.commit.permissionError'),
        permissionError: true,
      };
    }
    analytics.track('commit_error', { error: errorMessage });
    throw error;
  }
}

export function showCommitConfirmation(
  preview: CommitPreview,
  onConfirm: () => void,
  onCancel: () => void
) {
  const message = i18n.t('pending.commit.preview.message', {
    count: preview.eligibleToCommit,
    size: formatBytes(preview.bytesEstimate),
  });

  if (preview.requiresDoubleConfirm) {
    Alert.alert(
      i18n.t('pending.commit.confirm.title'),
      i18n.t('pending.commit.confirm.large', { message }),
      [
        {
          text: i18n.t('common.cancel'),
          style: 'cancel',
          onPress: onCancel,
        },
        {
          text: i18n.t('pending.commit.confirm.button'),
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              i18n.t('pending.commit.doubleConfirm.title'),
              i18n.t('pending.commit.doubleConfirm.message'),
              [
                {
                  text: i18n.t('common.cancel'),
                  style: 'cancel',
                  onPress: onCancel,
                },
                {
                  text: i18n.t('pending.commit.doubleConfirm.button'),
                  style: 'destructive',
                  onPress: onConfirm,
                },
              ]
            );
          },
        },
      ]
    );
  } else {
    Alert.alert(i18n.t('pending.commit.confirm.title'), message, [
      {
        text: i18n.t('common.cancel'),
        style: 'cancel',
        onPress: onCancel,
      },
      {
        text: i18n.t('pending.commit.confirm.button'),
        style: 'destructive',
        onPress: onConfirm,
      },
    ]);
  }
}
