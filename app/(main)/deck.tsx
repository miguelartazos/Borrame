import { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  AppState,
  StatusBar,
  Pressable,
  InteractionManager,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { usePermissions } from '../../src/store/usePermissions';
import {
  useIndexRunning,
  useIndexTotal,
  useIndexIndexed,
  useLastError,
} from '../../src/store/useIndexStore';
import type { FilterType } from '../../src/features/deck/selectors';
import { DeckHeader } from '../../src/components/DeckHeader';
import { Deck } from '../../src/components/Deck';
import { EmptyState } from '../../src/components/EmptyState';
import { ErrorBoundary } from '../../src/components/ErrorBoundary';
import { HomeHeader } from '../../src/components/HomeHeader';
import { StreakCard } from '../../src/components/StreakCard';
import { StreakModal } from '../../src/components/StreakModal';
import { PhotoCarousel } from '../../src/components/PhotoCarousel';
import { StatsRow } from '../../src/components/StatsRow';
import { SortingGrid } from '../../src/components/SortingGrid';
import { useParallaxScrollHandler } from '../../src/components/ParallaxHeroCard';
import { ConfettiAnimation } from '../../src/components/ConfettiAnimation';
import { FloatingSwipeButton } from '../../src/components/home/FloatingSwipeButton';
import { useDeckAssets } from '../../src/hooks/useDeckAssets';
import { useUndoLastDecision } from '../../src/hooks/useDeckDecisions';
// import { usePendingCount } from '../../src/hooks/usePendingCount';
import { usePendingSpaceEstimate } from '../../src/store/usePendingStore';
import { LimitedAccessBanner } from '../../src/features/indexer/LimitedAccessBanner';
import { useDeckFilter } from '../../src/store/useDeckStore';
import { useGoalError, useGoalStore, useCurrentStreak } from '../../src/store/useGoalStore';
import { runInitialIndex } from '../../src/features/indexer/indexer';
import { migrate } from '../../src/db/migrate';
import { logger } from '../../src/lib/logger';
import { analytics } from '../../src/lib/analytics';
// Removed modal in favor of inline list
import { AlbumList } from '../../src/components/library/AlbumList';
import { useDeckSelectedAlbumId, useDeckSelectedAlbumTitle, useDeckSetSelectedAlbum } from '../../src/store/useDeckStore';
import { useSettings } from '../../src/store/useSettings';

export default function DeckScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{
    monthFilter?: string;
    filter?: string;
    sortOrder?: string;
  }>();

  const status = usePermissions((s) => s.status);
  const refreshStatus = usePermissions((s) => s.refreshStatus);
  const lastError = useLastError();
  const indexRunning = useIndexRunning();
  const total = useIndexTotal();
  const indexed = useIndexIndexed();
  const hapticFeedback = useSettings((s) => s.hapticFeedback);
  // const pendingCount = usePendingCount();
  const goalError = useGoalError();
  const spaceEstimate = usePendingSpaceEstimate();
  const startSession = useGoalStore((s) => s.startSession);
  const endSession = useGoalStore((s) => s.endSession);
  const recordActivity = useGoalStore((s) => s.recordActivity);
  const todayFreedMB = useGoalStore((s) => s.todayFreedMB);
  const hasShownConfettiToday = useGoalStore((s) => s.hasShownConfettiToday);
  const markConfettiShown = useGoalStore((s) => s.markConfettiShown);

  const [hasInitialized, setHasInitialized] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showDeck, setShowDeck] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [streakModalVisible, setStreakModalVisible] = useState(false);
  // inline album list; no modal state

  // Use params filter if provided, otherwise use store filter
  const storeFilter = useDeckFilter();
  const filter = params.filter || storeFilter;

  const { scrollY, scrollHandler } = useParallaxScrollHandler();
  const selectedAlbumId = useDeckSelectedAlbumId();
  const selectedAlbumTitle = useDeckSelectedAlbumTitle();
  const setSelectedAlbum = useDeckSetSelectedAlbum();

  const canLoadAssets = status === 'granted' || status === 'limited';
  const {
    assets,
    loading,
    availableCount,
    reviewedCount,
    refetch,
    error,
    loadMore,
    removeAsset,
    reinsertAsset,
  } = useDeckAssets((params.filter || storeFilter) as FilterType, canLoadAssets && hasInitialized, {
    monthFilter: params.monthFilter,
    sortOrder: params.sortOrder as 'newest' | 'oldest' | undefined,
    albumId: selectedAlbumId || undefined,
  });

  const undoLastDecision = useUndoLastDecision();

  const indexControlRef = useRef<{
    cancel: () => void;
    pause: () => void;
    resume: () => void;
    isCanceled: () => boolean;
    isPaused: () => boolean;
  } | null>(null);

  // Track component mount status to prevent memory leaks
  const isMountedRef = useRef(true);

  // Use ref to store timeout ID to prevent memory leaks
  const milestoneTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Debounced milestone check to prevent rapid triggers
  const checkMilestone = useCallback(
    (freedMB: number) => {
      // Clear existing timeout if any
      if (milestoneTimeoutRef.current) {
        clearTimeout(milestoneTimeoutRef.current);
      }

      milestoneTimeoutRef.current = setTimeout(() => {
        if (freedMB >= 500 && !hasShownConfettiToday()) {
          setShowConfetti(true);
          markConfettiShown();

          // Haptic feedback after interactions complete
          InteractionManager.runAfterInteractions(() => {
            if (hapticFeedback) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
          });
        }
      }, 500);
    },
    [hasShownConfettiToday, markConfettiShown, hapticFeedback]
  );

  // Handle card decision (swipe or button press)
  const handleDecide = useCallback(
    (assetId: string, action: 'delete' | 'keep') => {
      // Get asset BEFORE removing it to avoid race condition
      const asset = assets.find((a) => a.id === assetId);

      // Remove from UI
      removeAsset(assetId);

      // Track space freed if deleting and asset was found
      if (action === 'delete' && asset?.size_bytes) {
        const freedMB = asset.size_bytes / (1024 * 1024);
        recordActivity(0, freedMB);

        // Trigger milestone check (debounced)
        checkMilestone(todayFreedMB + freedMB);
      }
    },
    [removeAsset, assets, recordActivity, todayFreedMB, checkMilestone]
  );

  // Handle undo action
  const handleUndo = useCallback(async () => {
    try {
      const lastAction = await undoLastDecision();
      if (lastAction) {
        const reinserted = reinsertAsset(lastAction.assetId);
        if (reinserted) {
          // Use functional setState to avoid stale closure
          setCurrentIndex((prev) => Math.max(0, prev - 1));
        }
      }
    } catch (err) {
      logger.error('Failed to undo', err);
    }
  }, [undoLastDecision, reinsertAsset]);

  // Handle entering/exiting deck mode
  const toggleDeckView = useCallback(() => {
    if (!showDeck) {
      startSession();
      // Track deck opened with current filter
      analytics.track('deck_opened', { filter });
    } else {
      endSession();
      // Track session end (no specific event for this yet)
    }
    setShowDeck(!showDeck);
    setCurrentIndex(0);
  }, [showDeck, startSession, endSession, filter]);

  const handleRetryIndexing = useCallback(async () => {
    if (indexControlRef.current) {
      indexControlRef.current.resume();
    } else {
      const control = await runInitialIndex();
      indexControlRef.current = control;
    }
  }, []);

  // Initialize database and indexing
  useEffect(() => {
    isMountedRef.current = true;

    async function initialize() {
      if (!canLoadAssets) return;

      try {
        await migrate();
        const control = await runInitialIndex();
        if (isMountedRef.current) {
          indexControlRef.current = control;
          setHasInitialized(true);
          analytics.track('deck_opened', { filter });
        }
      } catch (err) {
        logger.error('Failed to initialize', err);
        if (isMountedRef.current) {
          setHasInitialized(true); // Still allow loading even if indexing fails
        }
      }
    }

    initialize();

    return () => {
      isMountedRef.current = false;
      if (indexControlRef.current) {
        indexControlRef.current.cancel();
        indexControlRef.current = null;
      }
      // Clean up milestone timeout
      if (milestoneTimeoutRef.current) {
        clearTimeout(milestoneTimeoutRef.current);
      }
    };
  }, [canLoadAssets, filter]);

  // Reload when indexing completes and we have no assets
  useEffect(() => {
    if (hasInitialized && !loading && !indexRunning && assets.length === 0) {
      refetch();
    }
  }, [indexRunning, loading, assets.length, hasInitialized, refetch]);

  // Refresh permissions when app comes to foreground (user may have changed in Settings)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        refreshStatus();
      }
    });

    return () => {
      subscription.remove();
    };
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

  // Mock data for photo groups - replace with real data
  const photoGroups =
    assets.length > 0
      ? [
          {
            date: '2024-08-12',
            label: 'ago 12',
            count: 27,
            assets: assets.slice(0, 10).map((a) => ({
              id: a.id,
              uri: a.uri,
            })),
          },
          {
            date: '2023-08-12',
            label: '1 year ago',
            count: 15,
            assets: assets.slice(10, 20).map((a) => ({
              id: a.id,
              uri: a.uri,
            })),
          },
        ].filter((g) => g.assets.length > 0)
      : [];

  // Use all hooks before any conditional returns
  const currentStreak = useCurrentStreak();
  
  // Calculate stats
  const sortedPercentage = Math.round((reviewedCount / Math.max(availableCount, 1)) * 100);
  const spaceToClear = Math.max(0, Math.round(spaceEstimate / (1024 * 1024)));

  // Show deck view when user taps "Clean now" or any action button
  if (showDeck) {
    // Handle loading state
    if (loading) {
      return (
        <SafeAreaView className="flex-1 bg-dark-100" edges={['top', 'left', 'right']}>
          <StatusBar barStyle="light-content" />
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#FF7A1A" />
            <Text className="text-gray-400 mt-4">
              {t('deck.indexing.progress', { indexed: 0, total: 0 })}
            </Text>
          </View>
        </SafeAreaView>
      );
    }

    // Handle empty state
    if (assets.length === 0) {
      return (
        <SafeAreaView className="flex-1 bg-dark-100" edges={['top', 'left', 'right']}>
          <StatusBar barStyle="light-content" />
          <View className="flex-1">
            <View className="px-4 py-3">
              <Pressable
                onPress={toggleDeckView}
                className="p-2"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text className="text-white text-base">{t('common.done') || 'Done'}</Text>
              </Pressable>
            </View>
            <View className="flex-1 items-center justify-center px-8">
              <EmptyState ctaText={t('deck.empty.openPending')} ctaRoute="/pending" />
            </View>
          </View>
        </SafeAreaView>
      );
    }

    // Handle error state
    if (error) {
      return (
        <SafeAreaView className="flex-1 bg-dark-100" edges={['top', 'left', 'right']}>
          <StatusBar barStyle="light-content" />
          <View className="flex-1">
            <View className="px-4 py-3">
              <Pressable
                onPress={toggleDeckView}
                className="p-2"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text className="text-white text-base">{t('common.done') || 'Done'}</Text>
              </Pressable>
            </View>
            <View className="flex-1 items-center justify-center px-8">
              <Text className="text-danger text-lg mb-2">{t('common.error')}</Text>
              <Text className="text-gray-400 text-center">{error}</Text>
              <Pressable onPress={refetch} className="mt-4 px-6 py-3 bg-primary rounded-xl">
                <Text className="text-dark-100 font-semibold">{t('common.retry')}</Text>
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      );
    }

    // Normal deck view
    return (
      <SafeAreaView className="flex-1 bg-dark-100" edges={['top', 'left', 'right']}>
        <StatusBar barStyle="light-content" />
        <ErrorBoundary>
          <View className="flex-1">
            {/* Header with back button and counter */}
            <View className="px-4 py-3 flex-row items-center justify-between">
              <Pressable
                onPress={toggleDeckView}
                className="p-2"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text className="text-white text-base">{t('common.done') || 'Done'}</Text>
              </Pressable>
              <Text className="text-gray-400 text-sm">
                {t('deck.counter', { reviewed: reviewedCount, available: availableCount })}
              </Text>
            </View>

            {/* Selected album chip */}
            {selectedAlbumId && (
              <View className="px-4 pb-2">
                <Pressable
                  className="self-start bg-dark-400 rounded-full px-3 py-1"
                  onPress={() => {
                    analytics.track('album_cleared');
                    setSelectedAlbum(null, undefined);
                  }}
                >
                  <Text className="text-gray-300 text-xs">{t('deck.albumChip.selected', { title: selectedAlbumTitle || 'Album' })}</Text>
                </Pressable>
              </View>
            )}

            {/* Deck component */}
            <Deck
              assets={assets}
              currentIndex={currentIndex}
              onIndexChange={setCurrentIndex}
              onDecide={handleDecide}
              onLoadMore={() => {
                // Only load more if component is still mounted
                if (isMountedRef.current) {
                  loadMore();
                }
              }}
              onUndo={handleUndo}
            />
          </View>
        </ErrorBoundary>
      </SafeAreaView>
    );
  }

  // Home view (updated top layout)
  return (
    <SafeAreaView className="flex-1 bg-dark-100" edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" />
      <ErrorBoundary>
        <Animated.ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
        >
          <View className="pt-2">
            {/* Limited access banner */}
            <LimitedAccessBanner />
            <HomeHeader
              onInvitePress={() => {
                if (hapticFeedback) Haptics.selectionAsync();
                analytics.track('invite_pressed');
              }}
            />

            {/* Streak / Goal Card */}
            <StreakCard
              currentStreak={currentStreak}
              onPressGoal={() => setStreakModalVisible(true)}
            />

            {/* On This Day carousel directly under streak card */}
            <PhotoCarousel
              photoGroups={photoGroups}
              onGroupPress={(group) => {
                if (hapticFeedback) Haptics.selectionAsync();
                analytics.track('photo_group_pressed', { date: group.date });
                if (assets.length > 0) {
                  toggleDeckView();
                }
              }}
            />

            {/* Stats summary row: sorted % and to delete */}
            <StatsRow sortedPercentage={sortedPercentage} spaceToClear={spaceToClear} />

            {/* Inline albums list */}
            <View className="mt-2">
              <AlbumList
                selectedId={selectedAlbumId || null}
                onSelect={(id, title) => {
                  if (!id) {
                    analytics.track('album_cleared');
                  } else {
                    analytics.track('album_selected', { albumId: id, title: title ?? undefined });
                  }
                  setSelectedAlbum(id, title ?? undefined);
                  // Open deck view immediately to show selected album's photos
                  toggleDeckView();
                }}
              />
            </View>

            {goalError && (
              <View className="px-4 py-2 mb-2">
                <View className="bg-danger/20 rounded-xl p-3">
                  <Text className="text-danger text-sm">{goalError}</Text>
                </View>
              </View>
            )}

            {indexRunning && (
              <View className="px-4 mb-4">
                <View className="bg-dark-400 rounded-xl p-3">
                  <DeckHeader
                    indexRunning={indexRunning}
                    indexed={indexed}
                    total={total}
                    lastError={lastError}
                    onRetryIndexing={handleRetryIndexing}
                  />
                </View>
              </View>
            )}

            {error && (
              <View className="px-4 py-2 mb-4">
                <View className="bg-danger/20 rounded-xl p-3">
                  <Text className="text-danger text-sm">{error}</Text>
                </View>
              </View>
            )}

            {loading ? (
              <View className="h-64 items-center justify-center">
                <ActivityIndicator size="large" color="#FF7A1A" />
              </View>
            ) : assets.length === 0 ? (
              <View className="px-4">
                <EmptyState ctaText={t('deck.empty.openPending')} ctaRoute="/pending" />
              </View>
            ) : (
              <View>
                <SortingGrid
                  assets={assets.slice(0, 9).map((a) => ({
                    id: a.id,
                    uri: a.uri,
                    modificationTime: a.created_at,
                  }))}
                  totalCount={availableCount}
                  onAssetPress={(asset) => {
                    if (hapticFeedback) Haptics.selectionAsync();
                    analytics.track('grid_asset_pressed', { id: asset.id });
                    // Start reviewing when an asset is pressed
                    toggleDeckView();
                  }}
                  onFilterPress={() => {
                    if (hapticFeedback) Haptics.selectionAsync();
                    analytics.track('filter_pressed');
                  }}
                />
              </View>
            )}
          </View>
        </Animated.ScrollView>

        {/* Floating CTA Button */}
        {availableCount > 0 && !showDeck && <FloatingSwipeButton scrollY={scrollY} />}

        {/* Streak modal */}
        <StreakModal visible={streakModalVisible} onClose={() => setStreakModalVisible(false)} />

        {/* Confetti Animation */}
        <ConfettiAnimation visible={showConfetti} onComplete={() => setShowConfetti(false)} />

        {/* Modal removed */}
      </ErrorBoundary>
    </SafeAreaView>
  );
}
