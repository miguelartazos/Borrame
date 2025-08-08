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

  setProgress: (total: number, indexed: number) => void;
  setRunning: (running: boolean) => void;
  setPaused: (paused: boolean) => void;
  setRunId: (runId?: string) => void;
  setLimitedScope: (limited: boolean) => void;
  setLimitedCount: (count: number) => void;
  setLastError: (error?: string) => void;
  setLastSuccessfulBatch: (timestamp: number) => void;
  resetRunState: () => void;
}

export const useIndexStore = create<IndexStore>((set) => ({
  total: 0,
  indexed: 0,
  running: false,
  paused: false,
  currentRunId: undefined,
  limitedScope: false,
  limitedCount: 0,
  lastError: undefined,
  lastSuccessfulBatchAt: undefined,

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
}));

// Selectors for UI to avoid re-render storms
export const useIndexProgress = () =>
  useIndexStore((s) => ({ running: s.running, total: s.total, indexed: s.indexed }));

export const useIndexStatus = () =>
  useIndexStore((s) => ({
    running: s.running,
    paused: s.paused,
    limitedScope: s.limitedScope,
    limitedCount: s.limitedCount,
  }));
