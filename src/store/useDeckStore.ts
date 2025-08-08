import { create } from 'zustand';
import type { Asset } from '../db/schema';
import type { FilterType } from '../features/deck/selectors';

interface DeckStore {
  // Core deck state
  currentIndex: number;
  filter: FilterType;
  generation: number;
  removedAssetsCache: Map<string, Asset>;
  error: string | null;

  // Actions
  setCurrentIndex: (index: number) => void;
  setFilter: (filter: FilterType) => void;
  incrementGeneration: () => void;
  cacheRemovedAsset: (asset: Asset) => void;
  getCachedAsset: (id: string) => Asset | undefined;
  clearCache: () => void;
  setError: (error: string | null) => void;
  resetDeck: () => void;
}

export const useDeckStore = create<DeckStore>((set, get) => ({
  // Initial state
  currentIndex: 0,
  filter: 'all',
  generation: 0,
  removedAssetsCache: new Map(),
  error: null,

  // Actions
  setCurrentIndex: (index) => set({ currentIndex: index }),

  setFilter: (filter) =>
    set((state) => ({
      filter,
      currentIndex: 0,
      generation: state.generation + 1,
      error: null,
    })),

  incrementGeneration: () =>
    set((state) => ({
      generation: state.generation + 1,
    })),

  cacheRemovedAsset: (asset) =>
    set((state) => {
      const newCache = new Map(state.removedAssetsCache);
      newCache.set(asset.id, asset);
      // Keep cache size reasonable (last 10 removed items)
      if (newCache.size > 10) {
        const firstKey = newCache.keys().next().value;
        if (firstKey) {
          newCache.delete(firstKey);
        }
      }
      return { removedAssetsCache: newCache };
    }),

  getCachedAsset: (id) => {
    return get().removedAssetsCache.get(id);
  },

  clearCache: () => set({ removedAssetsCache: new Map() }),

  setError: (error) => set({ error }),

  resetDeck: () =>
    set({
      currentIndex: 0,
      generation: 0,
      removedAssetsCache: new Map(),
      error: null,
    }),
}));
