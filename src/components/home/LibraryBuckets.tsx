import React, { memo } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { ChevronRight } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useLibraryBuckets } from '../../hooks/useLibraryBuckets';
import { formatCount } from '../../lib/formatters';
import type { LibraryFilterType, LibrarySortOrder } from '../../features/library/selectors';

interface LibraryBucketsProps {
  filter?: LibraryFilterType;
  sortOrder?: LibrarySortOrder;
  maxBuckets?: number;
  onBucketPress?: (bucketId?: string) => void;
  testID?: string;
}

export const LibraryBuckets = memo<LibraryBucketsProps>(
  ({ filter = 'all', sortOrder = 'newest', maxBuckets = 3, onBucketPress, testID }) => {
    const { t } = useTranslation();
    const { buckets } = useLibraryBuckets({
      filter,
      sortOrder,
      pageSize: maxBuckets,
    });

    const topBuckets = buckets.slice(0, 3);

    if (topBuckets.length === 0) {
      return null;
    }

    return (
      <View className="px-4 mb-6" testID={testID}>
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-white text-lg font-semibold" testID={`${testID}_title`}>
            {t('home.tuBiblioteca')}
          </Text>
          <Pressable
            onPress={() => onBucketPress?.()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            testID={`${testID}_seeAll`}
          >
            <Text className="text-primary text-sm">{t('home.verTodo')}</Text>
          </Pressable>
        </View>

        {topBuckets.map((bucket) => (
          <Pressable
            key={bucket.monthKey}
            onPress={() => onBucketPress?.(bucket.monthKey)}
            className="bg-dark-400 rounded-2xl mb-3 overflow-hidden"
            testID={`${testID}_bucket_${bucket.monthKey}`}
          >
            <View className="flex-row">
              <View className="flex-row w-24 h-24">
                {bucket.assets.slice(0, 4).map((asset, index) => (
                  <Image
                    key={asset.id}
                    source={{ uri: asset.uri }}
                    style={{
                      width: 48,
                      height: 48,
                      position: 'absolute',
                      left: index % 2 === 0 ? 0 : 48,
                      top: index < 2 ? 0 : 48,
                    }}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                  />
                ))}
              </View>

              <View className="flex-1 px-4 py-3 justify-center">
                <Text className="text-white font-semibold text-base">{bucket.label}</Text>
                <Text className="text-gray-400 text-sm">
                  {t('home.fotos', { n: formatCount(bucket.count) })}
                </Text>
              </View>

              <View className="justify-center pr-3">
                <ChevronRight size={20} color="#666" />
              </View>
            </View>
          </Pressable>
        ))}
      </View>
    );
  }
);

LibraryBuckets.displayName = 'LibraryBuckets';
