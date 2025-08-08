import React, { memo } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { IndexingProgress } from './IndexingProgress';
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

        <View className="px-4 pt-4">
          {indexRunning && (
            <View className="mb-4">
              <IndexingProgress />
              <Text className="text-xs text-gray-500 text-center mt-1">
                {t('deck.indexing.progress', { indexed, total })}
              </Text>
            </View>
          )}

          {lastError && (
            <View className="bg-yellow-50 p-3 rounded-lg mb-4 flex-row items-center justify-between">
              <Text className="text-sm text-yellow-800 flex-1">
                Indexing paused due to an error
              </Text>
              <Pressable onPress={onRetryIndexing} className="bg-yellow-600 px-3 py-1 rounded">
                <Text className="text-white text-sm font-medium">Retry</Text>
              </Pressable>
            </View>
          )}
        </View>
      </>
    );
  }
);

DeckHeader.displayName = 'DeckHeader';
