import * as MediaLibrary from 'expo-media-library';
import { Platform, Alert, Linking } from 'react-native';
import { logger } from '../../lib/logger';
import i18n from '../../i18n';

export interface PermissionCheckResult {
  hasPermission: boolean;
  isLimited: boolean;
  needsUpgrade: boolean;
  message?: string;
}

export async function checkDeletionPermissions(): Promise<PermissionCheckResult> {
  try {
    // Request permissions with writeOnly = false to get full read/write access
    const permissionResult = await MediaLibrary.getPermissionsAsync(false);
    
    logger.info('Permission check result:', {
      status: permissionResult.status,
      accessPrivileges: permissionResult.accessPrivileges,
      canAskAgain: permissionResult.canAskAgain,
    });
    
    if (permissionResult.status !== 'granted') {
      logger.warn('Media library permission not granted');
      
      if (permissionResult.canAskAgain) {
        // Try to request permissions
        const requestResult = await MediaLibrary.requestPermissionsAsync(false);
        
        if (requestResult.status === 'granted') {
          return checkGrantedPermissions(requestResult);
        }
      }
      
      return {
        hasPermission: false,
        isLimited: false,
        needsUpgrade: false,
        message: 'Photo library access denied',
      };
    }
    
    return checkGrantedPermissions(permissionResult);
  } catch (error) {
    logger.error('Error checking permissions:', error);
    return {
      hasPermission: false,
      isLimited: false,
      needsUpgrade: false,
      message: 'Failed to check permissions',
    };
  }
}

function checkGrantedPermissions(permissionResult: MediaLibrary.PermissionResponse): PermissionCheckResult {
  const { accessPrivileges } = permissionResult;
  
  // On iOS, we need to check if we have full access
  if (Platform.OS === 'ios') {
    if (accessPrivileges === 'limited') {
      logger.warn('Limited photo access on iOS - deletion will not work');
      return {
        hasPermission: false,
        isLimited: true,
        needsUpgrade: true,
        message: 'Limited photo access. Full access required to delete photos.',
      };
    }
    
    if (accessPrivileges === 'none') {
      logger.warn('No photo access on iOS');
      return {
        hasPermission: false,
        isLimited: false,
        needsUpgrade: true,
        message: 'No photo access. Please grant access in Settings.',
      };
    }
  }
  
  // Android or iOS with full access
  return {
    hasPermission: true,
    isLimited: false,
    needsUpgrade: false,
  };
}

export async function requestFullPhotoAccess(): Promise<boolean> {
  try {
    logger.info('Requesting full photo access');
    
    // On iOS 14+, we can prompt the user to upgrade from limited to full access
    if (Platform.OS === 'ios') {
      const currentPermission = await MediaLibrary.getPermissionsAsync(false);
      
      if (currentPermission.accessPrivileges === 'limited') {
        // Show alert explaining why we need full access
        return new Promise((resolve) => {
          Alert.alert(
            'Full Photo Access Required',
            'To delete photos, the app needs full access to your photo library. You currently have limited access.',
            [
              {
                text: 'Cancel',
                style: 'cancel',
                onPress: () => resolve(false),
              },
              {
                text: 'Open Settings',
                onPress: () => {
                  Linking.openSettings();
                  resolve(false); // User needs to manually change in settings
                },
              },
            ]
          );
        });
      }
    }
    
    // For Android or first-time iOS requests
    const result = await MediaLibrary.requestPermissionsAsync(false);
    return result.status === 'granted' && result.accessPrivileges !== 'limited';
  } catch (error) {
    logger.error('Error requesting permissions:', error);
    return false;
  }
}

export function showPermissionErrorAlert(permissionResult: PermissionCheckResult): void {
  let title = i18n.t('common.error');
  let message = permissionResult.message || i18n.t('pending.commit.permissionError');
  
  if (permissionResult.isLimited && Platform.OS === 'ios') {
    title = 'Limited Photo Access';
    message = 'You have granted limited photo access. To delete photos, please grant full access to your photo library in Settings.';
  }
  
  Alert.alert(title, message, [
    {
      text: i18n.t('common.cancel'),
      style: 'cancel',
    },
    {
      text: i18n.t('common.openSettings'),
      onPress: () => Linking.openSettings(),
    },
  ]);
}