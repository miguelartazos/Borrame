import React from 'react';
import { View, Text, TouchableOpacity, Linking, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Camera } from 'lucide-react-native';
import { usePermissions } from '../store/usePermissions';
import { logger } from '../lib/logger';

export function RequestPhotos() {
  const { t } = useTranslation();
  const status = usePermissions((s) => s.status);
  const requestAccess = usePermissions((s) => s.requestAccess);

  const handleAllowAccess = async () => {
    try {
      const result = await requestAccess();
      if (result === 'limited') {
        Alert.alert(t('requestPhotos.title'), t('requestPhotos.limitedBanner'), [
          { text: t('common.ok') },
        ]);
      }
    } catch (error) {
      logger.error('Failed to request permissions:', error as Error);
      Alert.alert(t('common.error'), t('requestPhotos.error'));
    }
  };

  const handleOpenSettings = () => {
    Linking.openURL('app-settings:');
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      {status === 'limited' && (
        <Pressable
          onPress={handleOpenSettings}
          className="bg-yellow-50 border-b border-yellow-200 px-4 py-3"
        >
          <Text className="text-yellow-800 text-sm text-center">
            {t('requestPhotos.limitedBanner')}
          </Text>
        </Pressable>
      )}

      <View className="flex-1 justify-center items-center px-8">
        <Camera size={80} color="#007AFF" strokeWidth={1.5} />

        <Text className="text-3xl font-bold text-gray-900 mt-8">{t('requestPhotos.title')}</Text>

        <Text className="text-gray-600 text-center mt-4 text-base leading-6">
          {t('requestPhotos.subtitle')}
        </Text>

        <TouchableOpacity
          onPress={handleAllowAccess}
          className="bg-blue-500 px-8 py-4 rounded-full mt-12"
          activeOpacity={0.8}
          testID="allowAccessButton"
        >
          <Text className="text-white font-semibold text-lg">{t('requestPhotos.cta')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
