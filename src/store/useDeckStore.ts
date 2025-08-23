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

  // Album selection (optional filtering via MediaLibrary album)
  selectedAlbumId: string | null;
  selectedAlbumTitle: string | null;

  // Actions
  setCurrentIndex: (index: number) => void;
  setFilter: (filter: FilterType) => void;
  incrementGeneration: () => void;
  cacheRemovedAsset: (asset: Asset) => void;
  getCachedAsset: (id: string) => Asset | undefined;
  clearCache: () => void;
  setError: (error: string | null) => void;
  resetDeck: () => void;
  setSelectedAlbum: (id: string | null, title?: string | null) => void;
}

export const useDeckStore = create<DeckStore>((set, get) => ({
  // Initial state
  currentIndex: 0,
  filter: 'all',
  generation: 0,
  removedAssetsCache: new Map(),
  error: null,
  selectedAlbumId: null,
  selectedAlbumTitle: null,

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

  setSelectedAlbum: (id, title) =>
    set((state) => ({
      selectedAlbumId: id,
      selectedAlbumTitle: title ?? (id ? state.selectedAlbumTitle : null),
      // Changing album should reset deck pagination/generation
      currentIndex: 0,
      generation: state.generation + 1,
    })),
}));

// Stable selectors for state values (primitives only)
export const useDeckFilter = () => useDeckStore((s) => s.filter);
export const useDeckCurrentIndex = () => useDeckStore((s) => s.currentIndex);
export const useDeckGeneration = () => useDeckStore((s) => s.generation);
export const useDeckError = () => useDeckStore((s) => s.error);

// Individual action selectors (actions are stable functions)
export const useDeckSetFilter = () => useDeckStore((s) => s.setFilter);
export const useDeckSetCurrentIndex = () => useDeckStore((s) => s.setCurrentIndex);
export const useDeckIncrementGeneration = () => useDeckStore((s) => s.incrementGeneration);
export const useDeckCacheRemovedAsset = () => useDeckStore((s) => s.cacheRemovedAsset);
export const useDeckGetCachedAsset = () => useDeckStore((s) => s.getCachedAsset);
export const useDeckClearCache = () => useDeckStore((s) => s.clearCache);
export const useDeckSetError = () => useDeckStore((s) => s.setError);
export const useDeckResetDeck = () => useDeckStore((s) => s.resetDeck);
export const useDeckSelectedAlbumId = () => useDeckStore((s) => s.selectedAlbumId);
export const useDeckSelectedAlbumTitle = () => useDeckStore((s) => s.selectedAlbumTitle);
export const useDeckSetSelectedAlbum = () => useDeckStore((s) => s.setSelectedAlbum);
