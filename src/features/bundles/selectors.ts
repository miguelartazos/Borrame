/**
 * Bundle Selectors
 * React hooks for Smart Bundle counts
 * Separated from pure query functions for better testability
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { useIndexStore } from '../../store/useIndexStore';
import type { CategoryBundle } from '../../components/home/CategoryTilesGrid';
import { fetchBundleCounts, getDefaultCounts, type BundleCount } from './bundleQueries';

/**
 * Hook to get bundle counts with proper async handling
 * Fetches counts when indexing is not running
 */
export function useBundleCounts(): BundleCount[] {
  const [bundleCounts, setBundleCounts] = useState<BundleCount[]>(getDefaultCounts());
  const lastFetchRef = useRef<number>(0);
  const running = useIndexStore((s) => s.running);

  const REFRESH_INTERVAL = 10000; // 10 seconds

  useEffect(() => {
    // Don't fetch while indexing is running
    if (running) return;

    // Throttle fetches using ref to avoid dependency loop
    const now = Date.now();
    if (now - lastFetchRef.current < REFRESH_INTERVAL) return;

    let cancelled = false;

    fetchBundleCounts()
      .then((counts) => {
        if (!cancelled) {
          setBundleCounts(counts);
          lastFetchRef.current = now; // Update ref, not state
        }
      })
      .catch(() => {
        // Keep existing counts on error
        if (!cancelled) {
          lastFetchRef.current = now; // Still update timestamp to avoid rapid retries
        }
      });

    return () => {
      cancelled = true;
    };
  }, [running]); // Removed lastFetch from deps to fix infinite loop

  return bundleCounts;
}

/**
 * Convert bundle counts to CategoryBundle format for SmartBundlesGrid
 */
export function useBundlesForGrid(): CategoryBundle[] {
  const bundleCounts = useBundleCounts();

  return useMemo(() => {
    return bundleCounts.map((bundle) => ({
      key: bundle.key,
      title: '', // Will be filled by i18n in component
      count: bundle.count,
      locked: bundle.locked,
      icon: null, // Will be filled by component
    }));
  }, [bundleCounts]);
}
