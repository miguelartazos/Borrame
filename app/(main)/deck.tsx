import { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { usePermissions } from '../../src/store/usePermissions';
import { useIndexStore, useIndexProgress } from '../../src/store/useIndexStore';
import { useSettings } from '../../src/store/useSettings';
import { Deck } from '../../src/components/Deck';
import { FilterTabs } from '../../src/components/FilterTabs';
import { DeckHeader } from '../../src/components/DeckHeader';
import { EmptyState } from '../../src/components/EmptyState';
import { ErrorBoundary } from '../../src/components/ErrorBoundary';
import { useDeckDecisions } from '../../src/hooks/useDeckDecisions';
import { useDeckAssets } from '../../src/hooks/useDeckAssets';
import { useDeckStore } from '../../src/store/useDeckStore';
import { runInitialIndex } from '../../src/features/indexer/indexer';
import { migrate } from '../../src/db/migrate';
import { logger } from '../../src/lib/logger';
import { analytics } from '../../src/lib/analytics';
import type { FilterType } from '../../src/features/deck/selectors';

export default function DeckScreen() {
  const { t } = useTranslation();
  const { status } = usePermissions();
  const { lastError } = useIndexStore();
  const { running: indexRunning, total, indexed } = useIndexProgress();
  const { hapticFeedback } = useSettings();
  const { undoLastDecision } = useDeckDecisions();

  const [hasInitialized, setHasInitialized] = useState(false);
  const { filter, setFilter: setStoreFilter, currentIndex, setCurrentIndex } = useDeckStore();

  const canLoadAssets = status === 'granted' || status === 'limited';
  const {
    assets,
    loading,
    availableCount,
    reviewedCount,
    loadMore,
    refetch,
    removeAsset,
    reinsertAsset,
    error,
  } = useDeckAssets(filter, canLoadAssets && hasInitialized);

  const indexControlRef = useRef<{
    cancel: () => void;
    pause: () => void;
    resume: () => void;
    isCanceled: () => boolean;
    isPaused: () => boolean;
  } | null>(null);

  const handleFilterChange = useCallback(
    (newFilter: FilterType) => {
      if (hapticFeedback) {
        Haptics.selectionAsync();
      }
      analytics.track('filter_changed', { newFilter });
      setStoreFilter(newFilter);
    },
    [hapticFeedback, setStoreFilter]
  );

  const handleDecide = useCallback(
    (assetId: string, _action: 'delete' | 'keep') => {
      removeAsset(assetId);
      // Update currentIndex if needed
      if (currentIndex >= assets.length - 1 && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      }
    },
    [removeAsset, currentIndex, assets.length, setCurrentIndex]
  );

  const handleUndo = useCallback(async () => {
    const lastAction = await undoLastDecision();
    if (!lastAction) return;

    // Try to reinsert from cache first (avoids refetch)
    const reinserted = reinsertAsset(lastAction.assetId);
    if (!reinserted) {
      // Asset doesn't match current filter or isn't cached, just refetch
      await refetch();
    }
  }, [undoLastDecision, reinsertAsset, refetch]);

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
    async function initialize() {
      if (!canLoadAssets) return;

      try {
        await migrate();
        const control = await runInitialIndex();
        indexControlRef.current = control;
        setHasInitialized(true);
        analytics.track('deck_opened', { filter });
      } catch (err) {
        logger.error('Failed to initialize', err);
        setHasInitialized(true); // Still allow loading even if indexing fails
      }
    }

    initialize();

    return () => {
      if (indexControlRef.current) {
        indexControlRef.current.cancel();
        indexControlRef.current = null;
      }
    };
  }, [canLoadAssets, filter]);

  // Reload when indexing completes and we have no assets
  useEffect(() => {
    if (hasInitialized && !loading && !indexRunning && assets.length === 0) {
      refetch();
    }
  }, [indexRunning, loading, assets.length, hasInitialized, refetch]);

  if (status !== 'granted' && status !== 'limited') {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
        <Text className="text-lg text-gray-600 mb-4">{t('requestPhotos.title')}</Text>
        <Text className="text-sm text-gray-500 px-8 text-center">
          {t('requestPhotos.subtitle')}
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ErrorBoundary>
        <DeckHeader
          indexRunning={indexRunning}
          indexed={indexed}
          total={total}
          lastError={lastError}
          onRetryIndexing={handleRetryIndexing}
        />

        <View className="px-4">
          <FilterTabs
            filter={filter}
            onFilterChange={handleFilterChange}
            availableCount={availableCount}
            reviewedCount={reviewedCount}
          />
        </View>

        {error && (
          <View className="px-4 py-2 bg-red-100">
            <Text className="text-red-600 text-sm">{error}</Text>
          </View>
        )}

        <View className="flex-1">
          {loading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color="#3b82f6" />
            </View>
          ) : assets.length === 0 ? (
            <EmptyState ctaText={t('deck.empty.openPending')} ctaRoute="/pending" />
          ) : (
            <Deck
              assets={assets}
              currentIndex={currentIndex}
              onIndexChange={setCurrentIndex}
              onDecide={handleDecide}
              onLoadMore={loadMore}
              onUndo={handleUndo}
            />
          )}
        </View>
      </ErrorBoundary>
    </SafeAreaView>
  );
}
