import { useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import { useSettings } from '../store/useSettings';
import { useHistory } from '../store/useHistory';
import { addIntent, removeIntent } from '../db/helpers';
import { logger } from '../lib/logger';
import { analytics } from '../lib/analytics';

interface UseDeckDecisionsOptions {
  onDecisionComplete?: (assetId: string, action: 'delete' | 'keep') => void;
  onUndoComplete?: () => void;
}

export function useDeckDecisions({
  onDecisionComplete,
  onUndoComplete,
}: UseDeckDecisionsOptions = {}) {
  const { swipeLeftAction, swipeRightAction, hapticFeedback } = useSettings();
  const { pushAction, popAction } = useHistory();

  const makeDecision = useCallback(
    async (assetId: string, direction: 'left' | 'right') => {
      const action = direction === 'left' ? swipeLeftAction : swipeRightAction;

      try {
        if (hapticFeedback) {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }

        pushAction(assetId, action);
        await addIntent(assetId, action);

        // Track analytics
        analytics.track('swipe_decide', { action });

        onDecisionComplete?.(assetId, action);
      } catch (error) {
        logger.error('Failed to make decision', error);
        throw error;
      }
    },
    [swipeLeftAction, swipeRightAction, hapticFeedback, pushAction, onDecisionComplete]
  );

  const undoLastDecision = useCallback(async () => {
    const lastAction = popAction();
    if (!lastAction) return null;

    try {
      if (hapticFeedback) {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      await removeIntent(lastAction.assetId);

      // Track analytics
      analytics.track('undo');

      onUndoComplete?.();

      return lastAction;
    } catch (error) {
      logger.error('Failed to undo decision', error);
      throw error;
    }
  }, [popAction, hapticFeedback, onUndoComplete]);

  return {
    makeDecision,
    undoLastDecision,
    swipeLeftAction,
    swipeRightAction,
  };
}
