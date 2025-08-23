import { renderHook, act } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { useDeckDecisions } from './useDeckDecisions';
import { useSettings } from '../store/useSettings';
import { useHistory } from '../store/useHistory';
import * as dbHelpers from '../db/helpers';
import { analytics } from '../lib/analytics';

jest.mock('expo-haptics');
jest.mock('../store/useSettings');
jest.mock('../store/useHistory');
jest.mock('../db/helpers');
jest.mock('../lib/analytics', () => ({
  analytics: {
    track: jest.fn(),
  },
}));

const mockUseSettings = useSettings as jest.MockedFunction<typeof useSettings>;
const mockUseHistory = useHistory as jest.MockedFunction<typeof useHistory>;
const mockAddIntent = dbHelpers.addIntent as jest.MockedFunction<typeof dbHelpers.addIntent>;
const mockRemoveIntent = dbHelpers.removeIntent as jest.MockedFunction<
  typeof dbHelpers.removeIntent
>;

describe('useDeckDecisions', () => {
  const mockPushAction = jest.fn();
  const mockPopAction = jest.fn();
  const mockOnDecisionComplete = jest.fn();
  const mockOnUndoComplete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseSettings.mockReturnValue({
      swipeLeftAction: 'delete',
      swipeRightAction: 'keep',
      hapticFeedback: true,
    } as any);

    mockUseHistory.mockReturnValue({
      pushAction: mockPushAction,
      popAction: mockPopAction,
    } as any);

    mockAddIntent.mockResolvedValue(undefined);
    mockRemoveIntent.mockResolvedValue(undefined);
  });

  describe('makeDecision', () => {
    it('should make a decision with haptic feedback', async () => {
      const { result } = renderHook(() =>
        useDeckDecisions({
          onDecisionComplete: mockOnDecisionComplete,
        })
      );

      await act(async () => {
        await result.current.makeDecision('asset-1', 'left');
      });

      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
      expect(mockPushAction).toHaveBeenCalledWith('asset-1', 'delete');
      expect(mockAddIntent).toHaveBeenCalledWith('asset-1', 'delete');
      expect(analytics.track).toHaveBeenCalledWith('swipe_decide', { action: 'delete' });
      expect(mockOnDecisionComplete).toHaveBeenCalledWith('asset-1', 'delete');
    });

    it('should make a decision without haptic feedback when disabled', async () => {
      mockUseSettings.mockReturnValue({
        swipeLeftAction: 'delete',
        swipeRightAction: 'keep',
        hapticFeedback: false,
      } as any);

      const { result } = renderHook(() =>
        useDeckDecisions({
          onDecisionComplete: mockOnDecisionComplete,
        })
      );

      await act(async () => {
        await result.current.makeDecision('asset-1', 'right');
      });

      expect(Haptics.impactAsync).not.toHaveBeenCalled();
      expect(mockPushAction).toHaveBeenCalledWith('asset-1', 'keep');
      expect(mockAddIntent).toHaveBeenCalledWith('asset-1', 'keep');
      expect(analytics.track).toHaveBeenCalledWith('swipe_decide', { action: 'keep' });
      expect(mockOnDecisionComplete).toHaveBeenCalledWith('asset-1', 'keep');
    });

    it('should handle errors in makeDecision', async () => {
      const error = new Error('Database error');
      mockAddIntent.mockRejectedValue(error);

      const { result } = renderHook(() => useDeckDecisions());

      await expect(
        act(async () => {
          await result.current.makeDecision('asset-1', 'left');
        })
      ).rejects.toThrow('Database error');

      expect(mockPushAction).toHaveBeenCalled();
      // Analytics should still be tracked before the error
      expect(analytics.track).toHaveBeenCalledWith('swipe_decide', { action: 'delete' });
    });
  });

  describe('undoLastDecision', () => {
    it('should undo the last decision with haptic feedback', async () => {
      const lastAction = {
        assetId: 'asset-1',
        action: 'delete' as const,
        timestamp: Date.now(),
      };
      mockPopAction.mockReturnValue(lastAction);

      const { result } = renderHook(() =>
        useDeckDecisions({
          onUndoComplete: mockOnUndoComplete,
        })
      );

      const undone = await act(async () => {
        return await result.current.undoLastDecision();
      });

      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);
      expect(mockRemoveIntent).toHaveBeenCalledWith('asset-1');
      expect(analytics.track).toHaveBeenCalledWith('undo');
      expect(mockOnUndoComplete).toHaveBeenCalled();
      expect(undone).toEqual(lastAction);
    });

    it('should return null when there is nothing to undo', async () => {
      mockPopAction.mockReturnValue(undefined);

      const { result } = renderHook(() => useDeckDecisions());

      const undone = await act(async () => {
        return await result.current.undoLastDecision();
      });

      expect(undone).toBeNull();
      expect(mockRemoveIntent).not.toHaveBeenCalled();
      expect(analytics.track).not.toHaveBeenCalled();
      expect(Haptics.impactAsync).not.toHaveBeenCalled();
    });

    it('should handle errors in undoLastDecision', async () => {
      const lastAction = {
        assetId: 'asset-1',
        action: 'delete' as const,
        timestamp: Date.now(),
      };
      mockPopAction.mockReturnValue(lastAction);

      const error = new Error('Database error');
      mockRemoveIntent.mockRejectedValue(error);

      const { result } = renderHook(() => useDeckDecisions());

      await expect(
        act(async () => {
          await result.current.undoLastDecision();
        })
      ).rejects.toThrow('Database error');

      expect(mockPopAction).toHaveBeenCalled();
      expect(Haptics.impactAsync).toHaveBeenCalled();
      // Analytics should still be tracked before the error
      expect(analytics.track).toHaveBeenCalledWith('undo');
    });
  });

  describe('action configuration', () => {
    it('should expose current swipe actions', () => {
      const { result } = renderHook(() => useDeckDecisions());

      expect(result.current.swipeLeftAction).toBe('delete');
      expect(result.current.swipeRightAction).toBe('keep');
    });

    it('should update actions when settings change', () => {
      const { result, rerender } = renderHook(() => useDeckDecisions());

      expect(result.current.swipeLeftAction).toBe('delete');
      expect(result.current.swipeRightAction).toBe('keep');

      mockUseSettings.mockReturnValue({
        swipeLeftAction: 'keep',
        swipeRightAction: 'delete',
        hapticFeedback: true,
      } as any);

      rerender();

      expect(result.current.swipeLeftAction).toBe('keep');
      expect(result.current.swipeRightAction).toBe('delete');
    });
  });
});
