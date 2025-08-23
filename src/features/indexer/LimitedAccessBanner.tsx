import React from 'react';
import { View, Text, TouchableOpacity, Linking } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AlertCircle } from 'lucide-react-native';
import { useIndexLimitedScope, useIndexLimitedCount } from '../../store/useIndexStore';

export function LimitedAccessBanner() {
  const { t } = useTranslation();
  const limitedScope = useIndexLimitedScope();
  const limitedCount = useIndexLimitedCount();

  if (!limitedScope) {
    return null;
  }

  const handleOpenSettings = () => {
    Linking.openSettings();
  };

  return (
    <View className="bg-yellow-50 border-b border-yellow-200 px-4 py-3">
      <View className="flex-row items-start">
        <AlertCircle size={20} color="#EAB308" className="mt-0.5 mr-3" />
        <View className="flex-1">
          <Text className="text-yellow-900 font-semibold mb-1">
            {t('indexer.limitedAccess.title')}
          </Text>
          <Text className="text-yellow-800 text-sm mb-2">
            {t('indexer.limitedAccess.body', { count: limitedCount })}
          </Text>
          <TouchableOpacity
            onPress={handleOpenSettings}
            className="self-start bg-yellow-600 px-3 py-1.5 rounded-md"
          >
            <Text className="text-white text-sm font-medium">{t('indexer.limitedAccess.cta')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
