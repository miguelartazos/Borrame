import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Filter, Calendar } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { usePermissions } from '../../src/store/usePermissions';
import { useSettings } from '../../src/store/useSettings';
import { LibraryBucket } from '../../src/components/library/LibraryBucket';
import { QuickActionsSheet } from '../../src/components/library/QuickActionsSheet';
import { FilterBottomSheet } from '../../src/components/library/FilterBottomSheet';
import type { MonthBucket } from '../../src/features/library/selectors';
import { useLibraryStore } from '../../src/store/useLibraryStore';
import { FloatingSwipeButton } from '../../src/components/home';
import { analytics } from '../../src/lib/analytics';
import { useLibraryBuckets } from '../../src/hooks/useLibraryBuckets';
import { LimitedAccessBanner } from '../../src/features/indexer/LimitedAccessBanner';

const PAGE_SIZE = 12; // Load 12 months at a time
const ITEM_HEIGHT = 260; // Fixed height for each bucket card

export default function LibraryScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const status = usePermissions((s) => s.status);
  const refreshStatus = usePermissions((s) => s.refreshStatus);
  const hapticFeedback = useSettings((s) => s.hapticFeedback);

  const [sheetVisible, setSheetVisible] = useState(false);
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);
  const [selectedBucket, setSelectedBucket] = useState<MonthBucket | null>(null);

  const filter = useLibraryStore((s) => s.filter);
  const sortOrder = useLibraryStore((s) => s.sortOrder);

  const { buckets, loading, refreshing, loadingMore, error, loadMore, refresh, resetError } =
    useLibraryBuckets({
      filter,
      sortOrder,
      pageSize: PAGE_SIZE,
    });

  const handleBucketPress = useCallback(
    (bucket: MonthBucket) => {
      if (hapticFeedback) Haptics.selectionAsync();
      analytics.track('library_bucket_pressed', {
        monthKey: bucket.monthKey,
        count: bucket.count,
      });
      // Navigate to deck with month filter
      router.push({
        pathname: '/(main)/deck',
        params: { monthFilter: bucket.monthKey },
      });
    },
    [hapticFeedback, router]
  );

  const handleBucketLongPress = useCallback(
    (bucket: MonthBucket) => {
      if (hapticFeedback) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setSelectedBucket(bucket);
      setSheetVisible(true);
      analytics.track('library_long_press', { monthKey: bucket.monthKey });
    },
    [hapticFeedback]
  );

  const handleDuplicates = useCallback(() => {
    if (!selectedBucket) return;
    analytics.track('library_filter_duplicates', { monthKey: selectedBucket.monthKey });
    router.push({
      pathname: '/(main)/deck',
      params: {
        monthFilter: selectedBucket.monthKey,
        filter: 'duplicates',
      },
    });
  }, [selectedBucket, router]);

  const handleVideosOnly = useCallback(() => {
    if (!selectedBucket) return;
    analytics.track('library_filter_videos', { monthKey: selectedBucket.monthKey });
    router.push({
      pathname: '/(main)/deck',
      params: {
        monthFilter: selectedBucket.monthKey,
        filter: 'videos',
      },
    });
  }, [selectedBucket, router]);

  const handleOldestFirst = useCallback(() => {
    if (!selectedBucket) return;
    analytics.track('library_sort_oldest', { monthKey: selectedBucket.monthKey });
    router.push({
      pathname: '/(main)/deck',
      params: {
        monthFilter: selectedBucket.monthKey,
        sortOrder: 'oldest',
      },
    });
  }, [selectedBucket, router]);

  const handleFilterPress = useCallback(() => {
    if (hapticFeedback) Haptics.selectionAsync();
    analytics.track('library_filter_pressed');
    setFilterSheetVisible(true);
  }, [hapticFeedback]);

  // Refresh permissions when app comes to foreground
  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  if (status !== 'granted' && status !== 'limited') {
    return (
      <SafeAreaView className="flex-1 bg-dark-100 items-center justify-center">
        <StatusBar barStyle="light-content" />
        <Text className="text-lg text-white mb-4">{t('requestPhotos.title')}</Text>
        <Text className="text-sm text-gray-400 px-8 text-center">
          {t('requestPhotos.subtitle')}
        </Text>
      </SafeAreaView>
    );
  }

  const renderBucket = ({ item }: { item: MonthBucket }) => (
    <LibraryBucket
      bucket={item}
      onPress={() => handleBucketPress(item)}
      onLongPress={() => handleBucketLongPress(item)}
    />
  );

  const renderHeader = () => {
    // Get total unique months count
    const totalMonths = buckets.length;

    return (
      <View className="px-4 py-3 flex-row items-center justify-between bg-dark-100">
        <Text className="text-2xl font-bold text-white">
          {t('home.tuBiblioteca')} · {t('home.meses', { n: totalMonths })}
        </Text>
        <Pressable
          onPress={handleFilterPress}
          className="p-2"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Filter size={24} color="#FFFFFF" />
        </Pressable>
      </View>
    );
  };

  const renderEmpty = () => {
    // Show error state if there's an error and no data
    if (error && buckets.length === 0) {
      return (
        <View className="flex-1 items-center justify-center px-8 py-32">
          <Calendar size={48} color="#EF4444" />
          <Text className="text-xl font-semibold text-white mt-4 mb-2">{t('common.error')}</Text>
          <Text className="text-gray-400 text-center mb-4">{error}</Text>
          <Pressable
            onPress={() => {
              resetError();
              refresh();
            }}
            className="bg-primary-500 px-6 py-3 rounded-lg"
          >
            <Text className="text-white font-semibold">{t('common.retry')}</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <View className="flex-1 items-center justify-center px-8 py-32">
        <Calendar size={48} color="#6B7280" />
        <Text className="text-xl font-semibold text-white mt-4 mb-2">
          {t('library.empty.title')}
        </Text>
        <Text className="text-gray-400 text-center">{t('library.empty.subtitle')}</Text>
      </View>
    );
  };

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View className="py-4">
        <ActivityIndicator size="small" color="#FF7A1A" />
      </View>
    );
  };

  const getItemLayout = (_: ArrayLike<MonthBucket> | null | undefined, index: number) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  });

  return (
    <SafeAreaView className="flex-1 bg-dark-100" edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" />
      {renderHeader()}
      <LimitedAccessBanner />

      {loading && buckets.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#FF7A1A" />
        </View>
      ) : (
        <FlatList
          data={buckets}
          renderItem={renderBucket}
          keyExtractor={(item) => item.monthKey}
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#FF7A1A" />
          }
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          getItemLayout={getItemLayout}
          initialNumToRender={5}
          maxToRenderPerBatch={10}
          windowSize={10}
          removeClippedSubviews={true}
        />
      )}
      <FloatingSwipeButton />

      <QuickActionsSheet
        visible={sheetVisible}
        onDuplicates={handleDuplicates}
        onVideosOnly={handleVideosOnly}
        onOldestFirst={handleOldestFirst}
        onClose={() => setSheetVisible(false)}
      />

      <FilterBottomSheet
        visible={filterSheetVisible}
        onClose={() => setFilterSheetVisible(false)}
      />
    </SafeAreaView>
  );
}
