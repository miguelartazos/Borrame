import * as MediaLibrary from 'expo-media-library';
import { InteractionManager, Linking, Platform } from 'react-native';
import { logger } from '../lib/logger';
import { removePendingIntents } from '../features/pending/selectors';
import { analytics } from '../lib/analytics';
import { markAssetsCommitting, clearCommittedAssets, markAssetsFailed } from '../db/commitLog';
import { getDatabase } from '../db';

export interface DeletionResult {
  successCount: number;
  failureCount: number;
  failedIds: string[];
  totalBytes: number;
  permissionError?: boolean;
}

interface AssetToDelete {
  id: string;
  size_bytes: number | null;
}

const CHUNK_SIZE = 50;

export class DeletionService {
  private async verifyPermissions(): Promise<boolean> {
    try {
      // Check current permissions
      const { status, accessPrivileges } = await MediaLibrary.getPermissionsAsync(false);
      
      logger.info('Current permission status:', status, 'Access privileges:', accessPrivileges);
      
      if (status !== 'granted') {
        logger.error('Media library permission not granted:', status);
        return false;
      }
      
      // On iOS, we need full access to delete photos
      if (Platform.OS === 'ios' && accessPrivileges !== 'all') {
        logger.error('Limited photo access detected. Need full access to delete photos. Current:', accessPrivileges);
        return false;
      }
      
      return true;
    } catch (error) {
      logger.error('Failed to check permissions:', error);
      return false;
    }
  }
  
  private async verifyAssetsDeletion(assetIds: string[]): Promise<string[]> {
    try {
      // Verify assets are actually deleted by trying to fetch them
      const assets = await MediaLibrary.getAssetsAsync({
        first: assetIds.length,
        mediaType: ['photo', 'video'],
      });
      
      const remainingAssetIds = assets.assets.map(a => a.id);
      const actuallyDeleted = assetIds.filter(id => !remainingAssetIds.includes(id));
      
      logger.info(`Verification: ${actuallyDeleted.length}/${assetIds.length} assets actually deleted`);
      
      return actuallyDeleted;
    } catch (error) {
      logger.error('Failed to verify deletion:', error);
      return [];
    }
  }
  
  private async deleteChunk(assetIds: string[]): Promise<{
    success: string[];
    failed: string[];
    permissionError?: boolean;
  }> {
    try {
      logger.info(`Attempting to delete ${assetIds.length} assets...`);
      
      // Double-check permissions before each deletion
      const hasPermission = await this.verifyPermissions();
      if (!hasPermission) {
        logger.error('Permission check failed before deletion');
        return { success: [], failed: assetIds, permissionError: true };
      }
      
      // Call the deletion API
      const deleteResult = await MediaLibrary.deleteAssetsAsync(assetIds);
      
      logger.info(`MediaLibrary.deleteAssetsAsync returned:`, deleteResult);
      
      if (!deleteResult) {
        logger.error('Deletion failed - API returned false');
        return { success: [], failed: assetIds };
      }
      
      // On iOS, verify the assets were actually deleted
      // The API might return true but assets might still exist due to permission issues
      if (Platform.OS === 'ios') {
        await new Promise(resolve => setTimeout(resolve, 500)); // Small delay for iOS to process
        const actuallyDeleted = await this.verifyAssetsDeletion(assetIds);
        const failed = assetIds.filter(id => !actuallyDeleted.includes(id));
        
        if (failed.length > 0) {
          logger.error(`${failed.length} assets were not actually deleted despite API returning success`);
          return { success: actuallyDeleted, failed };
        }
      }
      
      logger.info(`Successfully deleted ${assetIds.length} assets`);
      return { success: assetIds, failed: [] };
    } catch (error) {
      logger.error(`Failed to delete chunk of ${assetIds.length} assets:`, error);
      logger.error('Error details:', JSON.stringify(error));
      
      const errorMessage = (error as Error)?.message || '';
      
      if (errorMessage.includes('permission') || errorMessage.includes('PHPhotosErrorDomain')) {
        logger.error('Permission error detected in deletion');
        return { success: [], failed: assetIds, permissionError: true };
      }
      
      return { success: [], failed: assetIds };
    }
  }

  private async yieldToUI(): Promise<void> {
    return new Promise((resolve) => {
      InteractionManager.runAfterInteractions(() => {
        resolve();
      });
    });
  }

  async executeDelete(assets: AssetToDelete[]): Promise<DeletionResult> {
    logger.info(`Starting deletion of ${assets.length} assets`);
    
    const result: DeletionResult = {
      successCount: 0,
      failureCount: 0,
      failedIds: [],
      totalBytes: 0,
    };

    // First, verify we have proper permissions
    const hasPermission = await this.verifyPermissions();
    if (!hasPermission) {
      logger.error('Initial permission check failed - aborting deletion');
      result.permissionError = true;
      result.failureCount = assets.length;
      result.failedIds = assets.map(a => a.id);
      return result;
    }

    const allAssetIds = assets.map((a) => a.id);

    try {
      const db = await getDatabase();
      await markAssetsCommitting(db, allAssetIds);
    } catch (error) {
      logger.error('Failed to mark assets as committing', error);
    }

    const chunks: AssetToDelete[][] = [];
    for (let i = 0; i < assets.length; i += CHUNK_SIZE) {
      chunks.push(assets.slice(i, i + CHUNK_SIZE));
    }

    for (const [index, chunk] of chunks.entries()) {
      logger.info(`Processing chunk ${index + 1}/${chunks.length}`);
      
      const assetIds = chunk.map((a) => a.id);
      const { success, failed, permissionError } = await this.deleteChunk(assetIds);

      if (permissionError) {
        logger.error('Permission error encountered - stopping deletion process');
        result.permissionError = true;
        result.failureCount += failed.length;
        result.failedIds.push(...failed);
        const db = await getDatabase();
        await markAssetsFailed(db, failed);
        
        // Add remaining unprocessed assets to failed list
        for (let i = index + 1; i < chunks.length; i++) {
          const remainingIds = chunks[i].map(a => a.id);
          result.failureCount += remainingIds.length;
          result.failedIds.push(...remainingIds);
          await markAssetsFailed(db, remainingIds);
        }
        break; // Stop processing on permission error
      }

      result.successCount += success.length;
      result.failureCount += failed.length;
      result.failedIds.push(...failed);

      const successfulAssets = chunk.filter((a) => success.includes(a.id));
      result.totalBytes += successfulAssets.reduce((sum, a) => sum + (a.size_bytes || 0), 0);

      if (success.length > 0) {
        logger.info(`Removing ${success.length} assets from pending intents`);
        await removePendingIntents(success);
        const db = await getDatabase();
        await clearCommittedAssets(db, success);
      }

      if (failed.length > 0) {
        logger.error(`Marking ${failed.length} assets as failed`);
        const db = await getDatabase();
        await markAssetsFailed(db, failed);
      }

      await this.yieldToUI();
    }

    logger.info(`Deletion complete. Success: ${result.successCount}, Failed: ${result.failureCount}`);
    
    analytics.track('commit_completed', {
      successCount: result.successCount,
      failureCount: result.failureCount,
      totalBytes: result.totalBytes,
      permissionError: result.permissionError || false,
    });

    return result;
  }

  async retryFailed(assetIds: string[]): Promise<DeletionResult> {
    const assets = assetIds.map((id) => ({ id, size_bytes: null }));
    return this.executeDelete(assets);
  }

  static openPhotoSettings(): void {
    Linking.openSettings();
  }
}
