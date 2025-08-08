import { act, renderHook } from '@testing-library/react-hooks';
import { useHistory } from './useHistory';
import { DECK_CONFIG } from '../features/deck/constants';

describe('useHistory', () => {
  beforeEach(() => {
    const { result } = renderHook(() => useHistory());
    act(() => {
      result.current.clearHistory();
    });
  });

  describe('pushAction', () => {
    it('should add action to buffer', () => {
      const { result } = renderHook(() => useHistory());

      act(() => {
        result.current.pushAction('asset_1', 'delete');
      });

      expect(result.current.buffer).toHaveLength(1);
      expect(result.current.buffer[0]).toMatchObject({
        assetId: 'asset_1',
        action: 'delete',
        timestamp: expect.any(Number),
      });
    });

    it('should maintain FIFO order', () => {
      const { result } = renderHook(() => useHistory());

      act(() => {
        result.current.pushAction('asset_1', 'delete');
        result.current.pushAction('asset_2', 'keep');
        result.current.pushAction('asset_3', 'delete');
      });

      expect(result.current.buffer).toHaveLength(3);
      expect(result.current.buffer[0].assetId).toBe('asset_1');
      expect(result.current.buffer[1].assetId).toBe('asset_2');
      expect(result.current.buffer[2].assetId).toBe('asset_3');
    });

    it('should cap buffer at UNDO_BUFFER_SIZE', () => {
      const { result } = renderHook(() => useHistory());

      act(() => {
        for (let i = 0; i < DECK_CONFIG.UNDO_BUFFER_SIZE + 10; i++) {
          result.current.pushAction(`asset_${i}`, i % 2 === 0 ? 'delete' : 'keep');
        }
      });

      expect(result.current.buffer).toHaveLength(DECK_CONFIG.UNDO_BUFFER_SIZE);
      expect(result.current.buffer[0].assetId).toBe('asset_10');
      expect(result.current.buffer[DECK_CONFIG.UNDO_BUFFER_SIZE - 1].assetId).toBe('asset_109');
    });
  });

  describe('popAction', () => {
    it('should return and remove last action', () => {
      const { result } = renderHook(() => useHistory());

      act(() => {
        result.current.pushAction('asset_1', 'delete');
        result.current.pushAction('asset_2', 'keep');
      });

      let lastAction;
      act(() => {
        lastAction = result.current.popAction();
      });

      expect(lastAction).toMatchObject({
        assetId: 'asset_2',
        action: 'keep',
      });
      expect(result.current.buffer).toHaveLength(1);
      expect(result.current.buffer[0].assetId).toBe('asset_1');
    });

    it('should return undefined when buffer is empty', () => {
      const { result } = renderHook(() => useHistory());

      let lastAction;
      act(() => {
        lastAction = result.current.popAction();
      });

      expect(lastAction).toBeUndefined();
      expect(result.current.buffer).toHaveLength(0);
    });

    it('should work correctly with multiple pops', () => {
      const { result } = renderHook(() => useHistory());

      act(() => {
        result.current.pushAction('asset_1', 'delete');
        result.current.pushAction('asset_2', 'keep');
        result.current.pushAction('asset_3', 'delete');
      });

      act(() => {
        result.current.popAction();
        result.current.popAction();
      });

      expect(result.current.buffer).toHaveLength(1);
      expect(result.current.buffer[0].assetId).toBe('asset_1');
    });
  });

  describe('canUndo', () => {
    it('should return false when buffer is empty', () => {
      const { result } = renderHook(() => useHistory());

      expect(result.current.canUndo()).toBe(false);
    });

    it('should return true when buffer has actions', () => {
      const { result } = renderHook(() => useHistory());

      act(() => {
        result.current.pushAction('asset_1', 'delete');
      });

      expect(result.current.canUndo()).toBe(true);
    });

    it('should update correctly after pop', () => {
      const { result } = renderHook(() => useHistory());

      act(() => {
        result.current.pushAction('asset_1', 'delete');
      });

      expect(result.current.canUndo()).toBe(true);

      act(() => {
        result.current.popAction();
      });

      expect(result.current.canUndo()).toBe(false);
    });
  });

  describe('clearHistory', () => {
    it('should empty the buffer', () => {
      const { result } = renderHook(() => useHistory());

      act(() => {
        result.current.pushAction('asset_1', 'delete');
        result.current.pushAction('asset_2', 'keep');
        result.current.clearHistory();
      });

      expect(result.current.buffer).toHaveLength(0);
      expect(result.current.canUndo()).toBe(false);
    });
  });

  describe('invariants', () => {
    it('should maintain timestamp ordering', () => {
      const { result } = renderHook(() => useHistory());

      act(() => {
        result.current.pushAction('asset_1', 'delete');
      });

      const time1 = result.current.buffer[0].timestamp;

      act(() => {
        result.current.pushAction('asset_2', 'keep');
      });

      const time2 = result.current.buffer[1].timestamp;

      expect(time2).toBeGreaterThanOrEqual(time1);
    });

    it('should preserve action types correctly', () => {
      const { result } = renderHook(() => useHistory());

      const actions: Array<'delete' | 'keep'> = ['delete', 'keep', 'delete', 'keep'];

      act(() => {
        actions.forEach((action, i) => {
          result.current.pushAction(`asset_${i}`, action);
        });
      });

      result.current.buffer.forEach((item, i) => {
        expect(item.action).toBe(actions[i]);
      });
    });
  });
});
