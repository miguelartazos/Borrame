import { useEffect, useState, useCallback, useRef } from 'react';
import {
  getUndecidedAssets,
  getUndecidedCount,
  getTotalReviewedCount,
  type FilterType,
} from '../features/deck/selectors';
import { DECK_CONFIG } from '../features/deck/constants';
import { logger } from '../lib/logger';
import { useDeckStore } from '../store/useDeckStore';
import { useIndexStore } from '../store/useIndexStore';
import type { Asset } from '../db/schema';

interface UseDeckAssetsReturn {
  assets: Asset[];
  loading: boolean;
  availableCount: number;
  reviewedCount: number;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refetch: () => Promise<void>;
  removeAsset: (assetId: string) => void;
  reinsertAsset: (assetId: string) => boolean;
  error: string | null;
}

export function useDeckAssets(filter: FilterType, enabled: boolean = true): UseDeckAssetsReturn {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [availableCount, setAvailableCount] = useState(0);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const { generation, cacheRemovedAsset, getCachedAsset, error, setError } = useDeckStore();
  const { lastSuccessfulBatchAt } = useIndexStore();
  const generationRef = useRef(generation);
  const lastRefreshRef = useRef(0);

  const loadInitialAssets = useCallback(async () => {
    if (!enabled) return;

    const currentGeneration = generation;
    generationRef.current = currentGeneration;
    setLoading(true);
    setError(null);

    try {
      const [newAssets, available, reviewed] = await Promise.all([
        getUndecidedAssets({
          filter,
          limit: DECK_CONFIG.INITIAL_BATCH_SIZE,
          offset: 0,
        }),
        getUndecidedCount(filter),
        getTotalReviewedCount(),
      ]);

      // Ignore stale responses
      if (generationRef.current !== currentGeneration) {
        return;
      }

      setAssets(newAssets);
      setAvailableCount(available);
      setReviewedCount(reviewed);
      setOffset(DECK_CONFIG.INITIAL_BATCH_SIZE);
      setHasMore(newAssets.length === DECK_CONFIG.INITIAL_BATCH_SIZE);
    } catch (err) {
      // Only set error if response is current
      if (generationRef.current === currentGeneration) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to load assets';
        logger.error('Failed to load initial assets', err);
        setError(errorMsg);
        setAssets([]);
        setAvailableCount(0);
        setReviewedCount(0);
      }
    } finally {
      if (generationRef.current === currentGeneration) {
        setLoading(false);
      }
    }
  }, [filter, enabled, generation, setError]);

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore || loading) return;

    setIsLoadingMore(true);
    try {
      const newAssets = await getUndecidedAssets({
        filter,
        limit: DECK_CONFIG.BATCH_SIZE,
        offset,
      });

      if (newAssets.length > 0) {
        setAssets((prev) => [...prev, ...newAssets]);
        setOffset((prev) => prev + newAssets.length);
        setHasMore(newAssets.length === DECK_CONFIG.BATCH_SIZE);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      logger.error('Failed to load more assets', err);
      setHasMore(false);
    } finally {
      setIsLoadingMore(false);
    }
  }, [filter, offset, hasMore, isLoadingMore, loading]);

  const refetch = useCallback(async () => {
    await loadInitialAssets();
  }, [loadInitialAssets]);

  // Efficient undo that avoids refetch
  const reinsertAsset = useCallback(
    (assetId: string): boolean => {
      const cachedAsset = getCachedAsset(assetId);
      if (!cachedAsset) {
        return false;
      }

      // Check if asset matches current filter
      // For 'all' filter, always matches
      // For 'screenshots', check is_screenshot flag
      // For 'recent', check created_at
      if (filter === 'screenshots' && !cachedAsset.is_screenshot) {
        return false;
      }
      if (filter === 'recent') {
        const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
        if (cachedAsset.created_at < thirtyDaysAgo) {
          return false;
        }
      }

      // Reinsert at the beginning (most recent decision)
      setAssets((prev) => [cachedAsset, ...prev]);
      setAvailableCount((prev) => prev + 1);
      setReviewedCount((prev) => Math.max(0, prev - 1));
      return true;
    },
    [filter, getCachedAsset]
  );

  const removeAsset = useCallback(
    (assetId: string) => {
      setAssets((prev) => {
        const asset = prev.find((a) => a.id === assetId);
        if (asset) {
          cacheRemovedAsset(asset);
        }
        return prev.filter((a) => a.id !== assetId);
      });
      setAvailableCount((prev) => Math.max(0, prev - 1));
      setReviewedCount((prev) => prev + 1);
    },
    [cacheRemovedAsset]
  );

  // Load initial assets when filter changes or enabled state changes
  useEffect(() => {
    loadInitialAssets();
  }, [loadInitialAssets]);

  // Live refresh during indexing (coalesced)
  useEffect(() => {
    if (!enabled || !lastSuccessfulBatchAt || loading) return;

    // Coalesce refreshes - wait at least 2 seconds between refreshes
    const timeSinceLastRefresh = Date.now() - lastRefreshRef.current;
    if (timeSinceLastRefresh < 2000) return;

    // Only refresh if we have few assets left
    if (assets.length < 10) {
      lastRefreshRef.current = Date.now();
      loadMore();
    }
  }, [lastSuccessfulBatchAt, enabled, loading, assets.length, loadMore]);

  return {
    assets,
    loading,
    availableCount,
    reviewedCount,
    hasMore,
    loadMore,
    refetch,
    removeAsset,
    reinsertAsset,
    error,
  };
}
