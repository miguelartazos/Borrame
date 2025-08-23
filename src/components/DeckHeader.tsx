import React, { memo } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { LimitedAccessBanner } from '../features/indexer/LimitedAccessBanner';

interface DeckHeaderProps {
  indexRunning: boolean;
  indexed: number;
  total: number;
  lastError?: string;
  onRetryIndexing: () => void;
}

export const DeckHeader = memo(
  ({ indexRunning, indexed, total, lastError, onRetryIndexing }: DeckHeaderProps) => {
    const { t } = useTranslation();

    return (
      <>
        <LimitedAccessBanner />

        <View className="px-4 pt-2">
          {indexRunning && (
            <View className="mb-3">
              <View className="flex-row items-center justify-center">
                <View className="w-2 h-2 bg-black rounded-full mr-2 opacity-60" />
                <Text className="text-xs text-gray-600 font-medium">
                  {t('deck.indexing.progress', { indexed, total })}
                </Text>
              </View>
            </View>
          )}

          {lastError && (
            <View className="bg-gray-50 p-3 rounded-xl mb-3 flex-row items-center justify-between">
              <Text className="text-sm text-gray-700 flex-1">{t('common.error')}</Text>
              <Pressable onPress={onRetryIndexing} className="px-3 py-1">
                <Text className="text-black text-sm font-semibold">{t('common.retry')}</Text>
              </Pressable>
            </View>
          )}
        </View>
      </>
    );
  }
);

DeckHeader.displayName = 'DeckHeader';
