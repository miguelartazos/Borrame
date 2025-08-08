import { create } from 'zustand';
import { DECK_CONFIG } from '../features/deck/constants';

export interface HistoryAction {
  assetId: string;
  action: 'delete' | 'keep';
  timestamp: number;
}

interface HistoryStore {
  buffer: HistoryAction[];

  pushAction: (assetId: string, action: 'delete' | 'keep') => void;
  popAction: () => HistoryAction | undefined;
  clearHistory: () => void;
  canUndo: () => boolean;
}

export const useHistory = create<HistoryStore>((set, get) => ({
  buffer: [],

  pushAction: (assetId, action) => {
    set((state) => {
      const newAction: HistoryAction = {
        assetId,
        action,
        timestamp: Date.now(),
      };

      const newBuffer = [...state.buffer, newAction];

      if (newBuffer.length > DECK_CONFIG.UNDO_BUFFER_SIZE) {
        newBuffer.shift();
      }

      return { buffer: newBuffer };
    });
  },

  popAction: () => {
    const currentState = get();
    if (currentState.buffer.length === 0) {
      return undefined;
    }

    const lastAction = currentState.buffer[currentState.buffer.length - 1];
    set((state) => ({
      buffer: state.buffer.slice(0, -1),
    }));

    return lastAction;
  },

  clearHistory: () => set({ buffer: [] }),

  canUndo: () => get().buffer.length > 0,
}));
