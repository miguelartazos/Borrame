import { useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import { useSettings } from '../store/useSettings';
import { useHistory } from '../store/useHistory';
import { useIncrementPending, useDecrementPending } from '../store/usePendingStore';
import { addIntent, removeIntent } from '../db/helpers';
import { logger } from '../lib/logger';
import { analytics } from '../lib/analytics';

interface UseDeckDecisionsOptions {
  onDecisionComplete?: (assetId: string, action: 'delete' | 'keep') => void;
  onUndoComplete?: () => void;
}

// New primitive-returning hooks (preferred)
export function useSwipeLeftAction() {
  return useSettings((s) => s.swipeLeftAction);
}

export function useSwipeRightAction() {
  return useSettings((s) => s.swipeRightAction);
}

export function useMakeDecision({
  onDecisionComplete,
}: Pick<UseDeckDecisionsOptions, 'onDecisionComplete'> = {}) {
  const swipeLeftAction = useSettings((s) => s.swipeLeftAction);
  const swipeRightAction = useSettings((s) => s.swipeRightAction);
  const hapticFeedback = useSettings((s) => s.hapticFeedback);
  const pushAction = useHistory((s) => s.pushAction);
  const incrementPending = useIncrementPending();

  const makeDecision = useCallback(
    async (assetId: string, direction: 'left' | 'right') => {
      const action = direction === 'left' ? swipeLeftAction : swipeRightAction;

      try {
        if (hapticFeedback) {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }

        pushAction(assetId, action);
        await addIntent(assetId, action);

        // Update pending count if marking for deletion
        if (action === 'delete') {
          incrementPending();
        }

        analytics.track('swipe_decide', { action });

        onDecisionComplete?.(assetId, action);
      } catch (error) {
        logger.error('Failed to make decision', error);
        throw error;
      }
    },
    [
      swipeLeftAction,
      swipeRightAction,
      hapticFeedback,
      pushAction,
      incrementPending,
      onDecisionComplete,
    ]
  );

  return makeDecision;
}

export function useUndoLastDecision({
  onUndoComplete,
}: Pick<UseDeckDecisionsOptions, 'onUndoComplete'> = {}) {
  const hapticFeedback = useSettings((s) => s.hapticFeedback);
  const popAction = useHistory((s) => s.popAction);
  const decrementPending = useDecrementPending();

  const undoLastDecision = useCallback(async () => {
    const lastAction = popAction();
    if (!lastAction) return null;

    try {
      if (hapticFeedback) {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      // Remove from database first, then update count if successful
      await removeIntent(lastAction.assetId);

      // Update pending count only after successful DB operation
      if (lastAction.action === 'delete') {
        decrementPending();
      }

      analytics.track('undo');
      onUndoComplete?.();
      return lastAction;
    } catch (error) {
      logger.error('Failed to undo decision', error);
      throw error;
    }
  }, [popAction, hapticFeedback, decrementPending, onUndoComplete]);

  return undoLastDecision;
}

// Deprecated: legacy object-returning API. Avoid in new code.
export function useDeckDecisions({
  onDecisionComplete,
  onUndoComplete,
}: UseDeckDecisionsOptions = {}) {
  const makeDecision = useMakeDecision({ onDecisionComplete });
  const undoLastDecision = useUndoLastDecision({ onUndoComplete });
  const swipeLeftAction = useSwipeLeftAction();
  const swipeRightAction = useSwipeRightAction();

  return {
    makeDecision,
    undoLastDecision,
    swipeLeftAction,
    swipeRightAction,
  };
}
