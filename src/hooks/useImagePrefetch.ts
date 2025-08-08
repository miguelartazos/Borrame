import { useEffect, useRef, useMemo, useCallback } from 'react';
import { Image } from 'react-native';
import { logger } from '../lib/logger';
import type { Asset } from '../db/schema';

const MAX_CONCURRENT_PREFETCH = 3;
const PREFETCH_AHEAD = 2;
const PREFETCH_BEHIND = 1;

interface PrefetchState {
  uri: string;
  status: 'pending' | 'loading' | 'success' | 'error';
  timestamp: number;
}

export function useImagePrefetch(assets: Asset[], currentIndex: number) {
  // Use WeakMap for automatic memory cleanup when assets are removed
  const prefetchCache = useMemo(() => new WeakMap<Asset, PrefetchState>(), []);
  const activePrefetchesRef = useRef(0);
  const mountedRef = useRef(true);

  const prefetchImage = useCallback(
    (asset: Asset) => {
      // Check cache first
      const cached = prefetchCache.get(asset);
      if (cached && (cached.status === 'loading' || cached.status === 'success')) {
        return; // Already prefetching or prefetched
      }

      if (activePrefetchesRef.current >= MAX_CONCURRENT_PREFETCH) {
        return; // Wait for current prefetches to complete
      }

      // Mark as loading
      prefetchCache.set(asset, {
        uri: asset.uri,
        status: 'loading',
        timestamp: Date.now(),
      });
      activePrefetchesRef.current++;

      // Fire and forget - we don't await this
      Image.prefetch(asset.uri)
        .then(() => {
          if (mountedRef.current) {
            prefetchCache.set(asset, {
              uri: asset.uri,
              status: 'success',
              timestamp: Date.now(),
            });
            logger.debug('Prefetched image:', asset.uri);
          }
        })
        .catch((error) => {
          if (mountedRef.current) {
            prefetchCache.set(asset, {
              uri: asset.uri,
              status: 'error',
              timestamp: Date.now(),
            });
            logger.debug('Failed to prefetch image:', asset.uri, error);
          }
        })
        .finally(() => {
          if (mountedRef.current) {
            activePrefetchesRef.current = Math.max(0, activePrefetchesRef.current - 1);
          }
        });
    },
    [prefetchCache]
  );

  useEffect(() => {
    mountedRef.current = true;

    // Calculate prefetch window (current + next few + previous one)
    const endIndex = Math.min(currentIndex + PREFETCH_AHEAD + 1, assets.length);

    // Prioritize: current first, then next, then previous
    const toPrefetch: Asset[] = [];

    // Current image (highest priority)
    if (assets[currentIndex]) {
      toPrefetch.push(assets[currentIndex]);
    }

    // Next images
    for (let i = currentIndex + 1; i < endIndex; i++) {
      if (assets[i]) toPrefetch.push(assets[i]);
    }

    // Previous image (for undo)
    const prevIndex = currentIndex - PREFETCH_BEHIND;
    if (prevIndex >= 0 && assets[prevIndex]) {
      toPrefetch.push(assets[prevIndex]);
    }

    // Start prefetching
    toPrefetch.forEach((asset) => {
      prefetchImage(asset);
    });

    return () => {
      mountedRef.current = false;
      // WeakMap will automatically clean up when assets are removed
      activePrefetchesRef.current = 0;
    };
  }, [assets, currentIndex, prefetchImage]);

  return {
    prefetchQueueSize: activePrefetchesRef.current,
    isPrefetching: activePrefetchesRef.current > 0,
  };
}
