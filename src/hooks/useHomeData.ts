/**
 * useHomeData Hook
 * Centralized home screen data management with performance optimizations
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { InteractionManager } from 'react-native';
import {
  type HomeData,
  simulateScan,
  getInstantMockData,
  generateHomeData,
} from '../data/homeMocks';
import type { ChipData } from '../components/home/HeroCleanCard';
import { formatSpace, formatCount, formatProgress } from '../lib/formatters';
import { useBundlesForGrid } from '../features/bundles/selectors';

export interface UseHomeDataReturn {
  // Data
  data: HomeData | null;
  progress: number;
  spaceReadyMB: number;
  spaceReadyFormatted: string;
  chips: ChipData[];
  activeChipId: ChipData['id'];
  bundles: HomeData['bundles'];
  months: HomeData['months'];

  // State
  isLoading: boolean;
  isScanning: boolean;
  error: Error | null;

  // Actions
  startScan: () => void;
  refreshData: () => void;
  selectChip: (id: ChipData['id']) => void;

  // Computed
  totalItemsCount: number;
  canClean: boolean;
}

/**
 * Main hook for home screen data
 */
export const useHomeData = (): UseHomeDataReturn => {
  const [data, setData] = useState<HomeData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [activeChipId, setActiveChipId] = useState<ChipData['id']>('todo');

  // Refs for cleanup
  const scanAbortRef = useRef<boolean>(false);
  const interactionHandleRef = useRef<ReturnType<
    typeof InteractionManager.runAfterInteractions
  > | null>(null);

  /**
   * Load initial data after interactions
   */
  useEffect(() => {
    let mounted = true;

    const loadInitialData = () => {
      if (!mounted) return;

      try {
        // Get instant mock data for fast initial render
        const initialData = getInstantMockData();
        setData(initialData);
        setError(null);
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    // Split heavy work with InteractionManager
    interactionHandleRef.current = InteractionManager.runAfterInteractions(() => {
      loadInitialData();
    });

    return () => {
      mounted = false;
      interactionHandleRef.current?.cancel();
    };
  }, []);

  /**
   * Handle scan progress updates
   */
  const handleScanProgress = useCallback((progress: number, updatedData: HomeData) => {
    if (scanAbortRef.current) return;

    setData({
      ...updatedData,
      progress: formatProgress(progress),
    });
  }, []);

  /**
   * Start scanning animation
   */
  const startScan = useCallback(async () => {
    if (isScanning) return;

    scanAbortRef.current = false;
    setIsScanning(true);
    setError(null);

    try {
      await simulateScan(handleScanProgress);

      if (!scanAbortRef.current) {
        const finalData = getInstantMockData();
        setData(finalData);
      }
    } catch (err) {
      if (!scanAbortRef.current) {
        setError(err as Error);
      }
    } finally {
      setIsScanning(false);
    }
  }, [isScanning, handleScanProgress]);

  /**
   * Refresh data without animation
   */
  const refreshData = useCallback(() => {
    setIsLoading(true);

    InteractionManager.runAfterInteractions(() => {
      try {
        const newData = generateHomeData();
        setData({
          ...newData,
          progress: 1.0,
          lastScanDate: new Date(),
        });
        setError(null);
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    });
  }, []);

  /**
   * Select active chip
   */
  const selectChip = useCallback((id: ChipData['id']) => {
    setActiveChipId(id);

    // Update chip active states
    setData((prevData) => {
      if (!prevData) return prevData;

      return {
        ...prevData,
        chips: prevData.chips.map((chip) => ({
          ...chip,
          active: chip.id === id,
        })),
      };
    });
  }, []);

  /**
   * Memoized computed values
   */
  const progress = useMemo(() => data?.progress ?? 0, [data?.progress]);

  const spaceReadyMB = useMemo(() => data?.spaceReadyMB ?? 0, [data?.spaceReadyMB]);

  const spaceReadyFormatted = useMemo(() => formatSpace(spaceReadyMB), [spaceReadyMB]);

  const chips = useMemo(() => {
    if (!data?.chips) return [];

    // Format chip counts for display
    return data.chips.map((chip) => ({
      ...chip,
      displayCount: formatCount(chip.count),
    }));
  }, [data?.chips]);

  // Use real bundle counts from database when available
  const realBundles = useBundlesForGrid();
  const bundles = useMemo(() => {
    // Use real bundles if we have indexed data, otherwise use mock data
    if (realBundles.some((b) => b.count > 0)) {
      return realBundles;
    }
    return data?.bundles ?? [];
  }, [data?.bundles, realBundles]);

  const months = useMemo(() => data?.months ?? [], [data?.months]);

  const totalItemsCount = useMemo(() => {
    if (!data?.chips) return 0;
    return data.chips.reduce((sum, chip) => sum + chip.count, 0);
  }, [data?.chips]);

  const canClean = useMemo(
    () => !isLoading && !isScanning && totalItemsCount > 0 && progress >= 1.0,
    [isLoading, isScanning, totalItemsCount, progress]
  );

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      scanAbortRef.current = true;
      interactionHandleRef.current?.cancel();
    };
  }, []);

  return {
    // Data
    data,
    progress,
    spaceReadyMB,
    spaceReadyFormatted,
    chips,
    activeChipId,
    bundles,
    months,

    // State
    isLoading,
    isScanning,
    error,

    // Actions
    startScan,
    refreshData,
    selectChip,

    // Computed
    totalItemsCount,
    canClean,
  };
};

export default useHomeData;
