import { renderHook, act } from '@testing-library/react-hooks';
import * as Haptics from 'expo-haptics';
import { useDeckDecisions } from './useDeckDecisions';
import { useSettings } from '../store/useSettings';
import { useHistory } from '../store/useHistory';
import { addIntent, removeIntent } from '../db/helpers';
import { logger } from '../lib/logger';

jest.mock('expo-haptics');
jest.mock('../store/useSettings');
jest.mock('../store/useHistory');
jest.mock('../db/helpers');
jest.mock('../lib/logger');

describe('useDeckDecisions', () => {
  const mockPushAction = jest.fn();
  const mockPopAction = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (useSettings as any).mockReturnValue({
      swipeLeftAction: 'delete',
      swipeRightAction: 'keep',
      hapticFeedback: true,
    });

    (useHistory as any).mockReturnValue({
      pushAction: mockPushAction,
      popAction: mockPopAction,
    });
  });

  describe('makeDecision', () => {
    it('should handle left swipe with delete action', async () => {
      const onDecisionComplete = jest.fn();
      const { result } = renderHook(() => useDeckDecisions({ onDecisionComplete }));

      await act(async () => {
        await result.current.makeDecision('asset_123', 'left');
      });

      expect(mockPushAction).toHaveBeenCalledWith('asset_123', 'delete');
      expect(addIntent).toHaveBeenCalledWith('asset_123', 'delete');
      expect(onDecisionComplete).toHaveBeenCalledWith('asset_123', 'delete');
    });

    it('should handle right swipe with keep action', async () => {
      const onDecisionComplete = jest.fn();
      const { result } = renderHook(() => useDeckDecisions({ onDecisionComplete }));

      await act(async () => {
        await result.current.makeDecision('asset_456', 'right');
      });

      expect(mockPushAction).toHaveBeenCalledWith('asset_456', 'keep');
      expect(addIntent).toHaveBeenCalledWith('asset_456', 'keep');
      expect(onDecisionComplete).toHaveBeenCalledWith('asset_456', 'keep');
    });

    it('should trigger haptic feedback when enabled', async () => {
      const { result } = renderHook(() => useDeckDecisions());

      await act(async () => {
        await result.current.makeDecision('asset_789', 'left');
      });

      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    });

    it('should not trigger haptic feedback when disabled', async () => {
      (useSettings as any).mockReturnValue({
        swipeLeftAction: 'delete',
        swipeRightAction: 'keep',
        hapticFeedback: false,
      });

      const { result } = renderHook(() => useDeckDecisions());

      await act(async () => {
        await result.current.makeDecision('asset_789', 'left');
      });

      expect(Haptics.impactAsync).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('DB Error');
      (addIntent as jest.Mock).mockRejectedValue(error);

      const { result } = renderHook(() => useDeckDecisions());

      await expect(result.current.makeDecision('asset_error', 'left')).rejects.toThrow('DB Error');

      expect(logger.error).toHaveBeenCalledWith('Failed to make decision', error);
    });
  });

  describe('undoLastDecision', () => {
    it('should undo last decision successfully', async () => {
      const lastAction = { assetId: 'asset_undo', action: 'delete', timestamp: Date.now() };
      mockPopAction.mockReturnValue(lastAction);

      const onUndoComplete = jest.fn();
      const { result } = renderHook(() => useDeckDecisions({ onUndoComplete }));

      let undoResult;
      await act(async () => {
        undoResult = await result.current.undoLastDecision();
      });

      expect(undoResult).toEqual(lastAction);
      expect(removeIntent).toHaveBeenCalledWith('asset_undo');
      expect(onUndoComplete).toHaveBeenCalled();
      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);
    });

    it('should return null when no action to undo', async () => {
      mockPopAction.mockReturnValue(undefined);

      const { result } = renderHook(() => useDeckDecisions());

      let undoResult;
      await act(async () => {
        undoResult = await result.current.undoLastDecision();
      });

      expect(undoResult).toBeNull();
      expect(removeIntent).not.toHaveBeenCalled();
    });

    it('should handle undo errors gracefully', async () => {
      const lastAction = { assetId: 'asset_error', action: 'keep', timestamp: Date.now() };
      mockPopAction.mockReturnValue(lastAction);

      const error = new Error('Undo Error');
      (removeIntent as jest.Mock).mockRejectedValue(error);

      const { result } = renderHook(() => useDeckDecisions());

      await expect(result.current.undoLastDecision()).rejects.toThrow('Undo Error');

      expect(logger.error).toHaveBeenCalledWith('Failed to undo decision', error);
    });
  });

  describe('swipe action configuration', () => {
    it('should respect custom swipe configurations', async () => {
      (useSettings as any).mockReturnValue({
        swipeLeftAction: 'keep',
        swipeRightAction: 'delete',
        hapticFeedback: true,
      });

      const { result } = renderHook(() => useDeckDecisions());

      await act(async () => {
        await result.current.makeDecision('asset_custom', 'left');
      });

      expect(addIntent).toHaveBeenCalledWith('asset_custom', 'keep');
    });
  });
});
