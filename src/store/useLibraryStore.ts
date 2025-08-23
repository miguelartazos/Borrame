import { create } from 'zustand';
import type { LibraryFilterType, LibrarySortOrder } from '../features/library/selectors';

interface LibraryStore {
  // Filter and sort state
  filter: LibraryFilterType;
  sortOrder: LibrarySortOrder;
  selectedMonthKey: string | null;

  // Actions
  setFilter: (filter: LibraryFilterType) => void;
  setSortOrder: (order: LibrarySortOrder) => void;
  setSelectedMonth: (monthKey: string | null) => void;
  resetFilters: () => void;
}

export const useLibraryStore = create<LibraryStore>((set) => ({
  // Initial state
  filter: 'all',
  sortOrder: 'newest',
  selectedMonthKey: null,

  // Actions
  setFilter: (filter) => set({ filter }),

  setSortOrder: (sortOrder) => set({ sortOrder }),

  setSelectedMonth: (selectedMonthKey) => set({ selectedMonthKey }),

  resetFilters: () =>
    set({
      filter: 'all',
      sortOrder: 'newest',
      selectedMonthKey: null,
    }),
}));

// Selectors
export const useLibraryFilter = () => useLibraryStore((s) => s.filter);
export const useLibrarySortOrder = () => useLibraryStore((s) => s.sortOrder);
export const useSelectedMonth = () => useLibraryStore((s) => s.selectedMonthKey);
