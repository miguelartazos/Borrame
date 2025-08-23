import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import * as MediaLibrary from 'expo-media-library';
import {
  getUndecidedAssets,
  getUndecidedCount,
  getTotalReviewedCount,
  type FilterType,
} from '../features/deck/selectors';
import { DECK_CONFIG } from '../features/deck/constants';
import { logger } from '../lib/logger';
import {
  useDeckGeneration,
  useDeckError,
  useDeckCacheRemovedAsset,
  useDeckGetCachedAsset,
  useDeckSetError,
} from '../store/useDeckStore';
import { useLastSuccessfulBatch } from '../store/useIndexStore';
import type { Asset } from '../db/schema';

interface UseDeckAssetsOptions {
  monthFilter?: string;
  sortOrder?: 'newest' | 'oldest';
  albumId?: string;
}

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

export function useDeckAssets(
  filter: FilterType,
  enabled: boolean = true,
  options?: UseDeckAssetsOptions
): UseDeckAssetsReturn {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [availableCount, setAvailableCount] = useState(0);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const monthFilter = options?.monthFilter;
  const sortOrder = options?.sortOrder;
  const albumId = options?.albumId;

  const generation = useDeckGeneration();
  const error = useDeckError();
  const cacheRemovedAsset = useDeckCacheRemovedAsset();
  const getCachedAsset = useDeckGetCachedAsset();
  const setError = useDeckSetError();
  const lastSuccessfulBatchAt = useLastSuccessfulBatch();
  const generationRef = useRef(generation);
  const lastRefreshRef = useRef(0);
  const pendingCacheQueueRef = useRef<Asset[]>([]);

  const loadInitialAssets = useCallback(async () => {
    if (!enabled) return;

    const currentGeneration = generation;
    generationRef.current = currentGeneration;
    setLoading(true);
    setError(null);

    try {
      if (albumId) {
        // Album-specific initial load: fetch pages from MediaLibrary until we accumulate INITIAL_BATCH_SIZE undecided
        let after: string | undefined = undefined;
        let accumulated: Asset[] = [];
        let hasNextPage = true;
        while (hasNextPage && accumulated.length < DECK_CONFIG.INITIAL_BATCH_SIZE) {
          const page = await MediaLibrary.getAssetsAsync({
            album: albumId as unknown as MediaLibrary.Album,
            mediaType: MediaLibrary.MediaType.photo,
            sortBy: [MediaLibrary.SortBy.creationTime],
            first: DECK_CONFIG.BATCH_SIZE * 2,
            after,
          });
          after = page.endCursor;
          hasNextPage = page.hasNextPage;
          // Ensure DB contains these assets
          const { ensureAssetsExist } = await import('../features/indexer/albumSync');
          await ensureAssetsExist(page.assets);
          // Map page to URIs then get undecided subset
          const { getUndecidedAssetsByUris } = await import('../features/deck/selectors');
          const undecided = await getUndecidedAssetsByUris(
            page.assets.map((a) => a.uri),
            sortOrder
          );
          accumulated = [...accumulated, ...undecided];
        }

        const reviewed = await getTotalReviewedCount();
        // Optimistic available count equals current undecided loaded; refine in background
        let available = accumulated.length;
        setAssets(accumulated.slice(0, DECK_CONFIG.INITIAL_BATCH_SIZE));
        setAvailableCount(available);
        setReviewedCount(reviewed);
        setOffset(accumulated.length);
        setHasMore(hasNextPage || accumulated.length >= DECK_CONFIG.INITIAL_BATCH_SIZE);

        // Background accurate count across entire album
        (async () => {
          try {
            // Traverse all album pages to gather URIs
            let endCursor: string | undefined = undefined;
            let hasMorePages = true;
            const allUris: string[] = [];
            while (hasMorePages) {
              const res = await MediaLibrary.getAssetsAsync({
                album: albumId as unknown as MediaLibrary.Album,
                mediaType: MediaLibrary.MediaType.photo,
                sortBy: [MediaLibrary.SortBy.creationTime],
                first: 400,
                after: endCursor,
              });
              allUris.push(...res.assets.map((a) => a.uri));
              endCursor = res.endCursor;
              hasMorePages = res.hasNextPage;
            }
            const { getUndecidedCountByUris } = await import('../features/deck/selectors');
            const trueCount = await getUndecidedCountByUris(allUris);
            if (generationRef.current === currentGeneration) {
              setAvailableCount(trueCount);
            }
          } catch {
            // Silent fail; counter stays optimistic
          }
        })();
      } else {
        const [newAssets, available, reviewed] = await Promise.all([
          getUndecidedAssets({
            filter,
            limit: DECK_CONFIG.INITIAL_BATCH_SIZE,
            offset: 0,
            monthFilter,
            sortOrder,
          }),
          getUndecidedCount(filter, monthFilter),
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
      }
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
  }, [filter, enabled, generation, setError, monthFilter, sortOrder, albumId]);

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore || loading) return;

    const currentGeneration = generation;
    setIsLoadingMore(true);

    try {
      if (albumId) {
        let after: string | undefined = undefined;
        // Try to extend based on how many we already fetched; not tracking cursor, so just continue paging until we fill batch
        let collected: Asset[] = [];
        let hasNextPage = true;
        while (hasNextPage && collected.length < DECK_CONFIG.BATCH_SIZE) {
          const page = await MediaLibrary.getAssetsAsync({
            album: albumId as unknown as MediaLibrary.Album,
            mediaType: MediaLibrary.MediaType.photo,
            sortBy: [MediaLibrary.SortBy.creationTime],
            first: DECK_CONFIG.BATCH_SIZE * 2,
            after,
          });
          after = page.endCursor;
          hasNextPage = page.hasNextPage;
          const { ensureAssetsExist } = await import('../features/indexer/albumSync');
          await ensureAssetsExist(page.assets);
          const { getUndecidedAssetsByUris } = await import('../features/deck/selectors');
          const undecided = await getUndecidedAssetsByUris(
            page.assets.map((a) => a.uri),
            sortOrder
          );
          collected = [...collected, ...undecided];
        }

        if (generationRef.current !== currentGeneration) return;

        if (collected.length > 0) {
          setAssets((prev) => [...prev, ...collected]);
          setOffset((prev) => prev + collected.length);
          setHasMore(hasNextPage);
        } else {
          setHasMore(false);
        }
      } else {
        const newAssets = await getUndecidedAssets({
          filter,
          limit: DECK_CONFIG.BATCH_SIZE,
          offset,
          monthFilter,
          sortOrder,
        });

        // Ignore stale responses from old filter
        if (generationRef.current !== currentGeneration) {
          return;
        }

        if (newAssets.length > 0) {
          setAssets((prev) => [...prev, ...newAssets]);
          setOffset((prev) => prev + newAssets.length);
          setHasMore(newAssets.length === DECK_CONFIG.BATCH_SIZE);
        } else {
          setHasMore(false);
        }
      }
    } catch (err) {
      // Only update state if response is current
      if (generationRef.current === currentGeneration) {
        logger.error('Failed to load more assets', err);
        setHasMore(false);
      }
    } finally {
      if (generationRef.current === currentGeneration) {
        setIsLoadingMore(false);
      }
    }
  }, [filter, offset, hasMore, isLoadingMore, loading, generation, monthFilter, sortOrder, albumId]);

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

  const removeAsset = useCallback((assetId: string) => {
    setAssets((prev) => {
      const assetToCache = prev.find((a) => a.id === assetId);
      if (assetToCache) {
        // Queue the asset for caching after render
        pendingCacheQueueRef.current.push(assetToCache);
      }
      return prev.filter((a) => a.id !== assetId);
    });
    setAvailableCount((prev) => Math.max(0, prev - 1));
    setReviewedCount((prev) => prev + 1);
  }, []);

  // Load initial assets when filter changes or enabled state changes
  useEffect(() => {
    loadInitialAssets();
  }, [loadInitialAssets]);

  // Process pending cache queue after render
  useEffect(() => {
    if (pendingCacheQueueRef.current.length > 0) {
      // Defer state updates to avoid render-time setState
      queueMicrotask(() => {
        // Cache all queued assets
        pendingCacheQueueRef.current.forEach((asset) => {
          cacheRemovedAsset(asset);
        });
        // Clear the queue
        pendingCacheQueueRef.current = [];
      });
    }
  });

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

  // Return a memoized object to keep stable reference unless a field actually changes
  return useMemo(
    () => ({
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
    }),
    [
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
    ]
  );
}
