import { create } from 'zustand';

interface IndexStore {
  total: number;
  indexed: number;
  running: boolean;
  paused: boolean;
  currentRunId?: string;
  limitedScope: boolean;
  limitedCount: number;
  lastError?: string;
  lastSuccessfulBatchAt?: number;
  debugOverrides?: {
    running?: boolean;
    paused?: boolean;
    total?: number;
    indexed?: number;
  };

  setProgress: (total: number, indexed: number) => void;
  setRunning: (running: boolean) => void;
  setPaused: (paused: boolean) => void;
  setRunId: (runId?: string) => void;
  setLimitedScope: (limited: boolean) => void;
  setLimitedCount: (count: number) => void;
  setLastError: (error?: string) => void;
  setLastSuccessfulBatch: (timestamp: number) => void;
  resetRunState: () => void;
  setDebugOverrides: (overrides: IndexStore['debugOverrides']) => void;
  getRunning: () => boolean;
  getPaused: () => boolean;
  getTotal: () => number;
  getIndexed: () => number;
}

export const useIndexStore = create<IndexStore>((set, get) => ({
  total: 0,
  indexed: 0,
  running: false,
  paused: false,
  currentRunId: undefined,
  limitedScope: false,
  limitedCount: 0,
  lastError: undefined,
  lastSuccessfulBatchAt: undefined,
  debugOverrides: undefined,

  setProgress: (total, indexed) => set({ total, indexed }),
  setRunning: (running) => set({ running }),
  setPaused: (paused) => set({ paused }),
  setRunId: (runId) => set({ currentRunId: runId }),
  setLimitedScope: (limited) => set({ limitedScope: limited }),
  setLimitedCount: (count) => set({ limitedCount: count }),
  setLastError: (error) => set({ lastError: error }),
  setLastSuccessfulBatch: (timestamp) => set({ lastSuccessfulBatchAt: timestamp }),
  resetRunState: () =>
    set({
      running: false,
      paused: false,
      currentRunId: undefined,
      total: 0,
      indexed: 0,
      limitedCount: 0,
      lastError: undefined,
    }),
  setDebugOverrides: (overrides) => set({ debugOverrides: overrides }),
  getRunning: () => {
    const state = get();
    return state.debugOverrides?.running ?? state.running;
  },
  getPaused: () => {
    const state = get();
    return state.debugOverrides?.paused ?? state.paused;
  },
  getTotal: () => {
    const state = get();
    return state.debugOverrides?.total ?? state.total;
  },
  getIndexed: () => {
    const state = get();
    return state.debugOverrides?.indexed ?? state.indexed;
  },
}));

// Individual primitive selectors to avoid re-render storms
// For useIndexProgress - split into individual selectors
export const useIndexRunning = () => useIndexStore((s) => s.running);
export const useIndexTotal = () => useIndexStore((s) => s.total);
export const useIndexIndexed = () => useIndexStore((s) => s.indexed);

// For useIndexStatus - split into individual selectors
export const useIndexPaused = () => useIndexStore((s) => s.paused);
export const useIndexLimitedScope = () => useIndexStore((s) => s.limitedScope);
export const useIndexLimitedCount = () => useIndexStore((s) => s.limitedCount);

// Other primitive selectors
export const useLastError = () => useIndexStore((s) => s.lastError);
export const useLastSuccessfulBatch = () => useIndexStore((s) => s.lastSuccessfulBatchAt);
