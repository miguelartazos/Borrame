import React, { useCallback, useEffect, useMemo } from 'react';
import { View, StyleSheet, Dimensions, Pressable, Text } from 'react-native';
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  withTiming,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { PhotoCard } from './PhotoCard';
import { SWIPE_THRESHOLDS, DECK_CONFIG } from '../features/deck/constants';
import { useHistory } from '../store/useHistory';
import { useDeckDecisions } from '../hooks/useDeckDecisions';
import { useImagePrefetch } from '../hooks/useImagePrefetch';
import type { Asset } from '../db/schema';

const { width: screenWidth } = Dimensions.get('window');

interface DeckProps {
  assets: Asset[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  onDecide: (assetId: string, action: 'delete' | 'keep') => void;
  onLoadMore: () => void;
  onUndo: () => void;
}

export function Deck({
  assets,
  currentIndex,
  onIndexChange,
  onDecide,
  onLoadMore,
  onUndo,
}: DeckProps) {
  const { t } = useTranslation();
  const { canUndo } = useHistory();

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const { makeDecision, swipeLeftAction, swipeRightAction } = useDeckDecisions({
    onDecisionComplete: (assetId, action) => {
      onDecide(assetId, action);
      onIndexChange(Math.min(currentIndex + 1, assets.length - 1));
    },
  });

  useImagePrefetch(assets, currentIndex);

  const visibleCards = useMemo(() => {
    return assets.slice(currentIndex, currentIndex + DECK_CONFIG.VISIBLE_CARDS);
  }, [assets, currentIndex]);

  const remainingCards = assets.length - currentIndex;

  useEffect(() => {
    if (remainingCards < DECK_CONFIG.PRELOAD_THRESHOLD) {
      onLoadMore();
    }
  }, [remainingCards, onLoadMore]);

  const handleSwipeDecision = useCallback(
    async (direction: 'left' | 'right') => {
      const currentCard = visibleCards[0];
      if (!currentCard) return;

      await makeDecision(currentCard.id, direction);
    },
    [visibleCards, makeDecision]
  );

  const resetPosition = useCallback(() => {
    'worklet';
    translateX.value = withSpring(0, {
      damping: 20,
      stiffness: 300,
    });
    translateY.value = withSpring(0, {
      damping: 20,
      stiffness: 300,
    });
  }, [translateX, translateY]);

  const animateCardOut = useCallback(
    (direction: 'left' | 'right') => {
      'worklet';
      const exitX = direction === 'left' ? -screenWidth : screenWidth;
      translateX.value = withTiming(exitX, { duration: DECK_CONFIG.ANIMATION_DURATION }, () => {
        runOnJS(handleSwipeDecision)(direction);
        translateX.value = 0;
        translateY.value = 0;
      });
    },
    [translateX, translateY, handleSwipeDecision]
  );

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY * 0.3;
    })
    .onEnd((event) => {
      const shouldSwipeLeft =
        event.translationX < -SWIPE_THRESHOLDS.TRANSLATE_X ||
        event.velocityX < -SWIPE_THRESHOLDS.VELOCITY_X;

      const shouldSwipeRight =
        event.translationX > SWIPE_THRESHOLDS.TRANSLATE_X ||
        event.velocityX > SWIPE_THRESHOLDS.VELOCITY_X;

      if (shouldSwipeLeft) {
        animateCardOut('left');
      } else if (shouldSwipeRight) {
        animateCardOut('right');
      } else {
        resetPosition();
      }
    });

  const handleKeep = () => {
    animateCardOut(swipeRightAction === 'keep' ? 'right' : 'left');
  };

  const handleDelete = () => {
    animateCardOut(swipeLeftAction === 'delete' ? 'left' : 'right');
  };

  const handleUndo = () => {
    onUndo();
    if (currentIndex > 0) {
      onIndexChange(currentIndex - 1);
    }
  };

  const stackAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: interpolate(
          Math.abs(translateX.value),
          [0, SWIPE_THRESHOLDS.TRANSLATE_X * 2],
          [1, 0.95],
          Extrapolation.CLAMP
        ),
      },
    ],
  }));

  if (visibleCards.length === 0) {
    return null;
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <Animated.View style={[styles.cardStack, stackAnimatedStyle]}>
        {visibleCards
          .slice(0)
          .reverse()
          .map((asset, index) => {
            const reversedIndex = visibleCards.length - 1 - index;
            const isTop = reversedIndex === 0;

            if (isTop) {
              return (
                <GestureDetector key={asset.id} gesture={panGesture}>
                  <PhotoCard
                    asset={asset}
                    translateX={translateX}
                    translateY={translateY}
                    isTop={true}
                  />
                </GestureDetector>
              );
            }

            return (
              <Animated.View
                key={asset.id}
                style={[
                  styles.card,
                  {
                    zIndex: -reversedIndex,
                    transform: [
                      { scale: 1 - reversedIndex * 0.03 },
                      { translateY: reversedIndex * -10 },
                    ],
                  },
                ]}
              >
                <PhotoCard
                  asset={asset}
                  translateX={translateX}
                  translateY={translateY}
                  isTop={false}
                />
              </Animated.View>
            );
          })}
      </Animated.View>

      <View style={styles.buttonContainer}>
        <Pressable
          style={[styles.actionButton, styles.deleteButton]}
          onPress={handleDelete}
          accessibilityLabel={t('deck.deletePhoto')}
          accessibilityHint={t('deck.deletePhotoHint')}
        >
          <Text style={styles.buttonText}>{t('deck.delete')}</Text>
        </Pressable>

        {canUndo() && (
          <Pressable
            style={[styles.actionButton, styles.undoButton]}
            onPress={handleUndo}
            accessibilityLabel={t('deck.undo')}
            testID="UndoButton"
          >
            <Text style={styles.buttonText}>{t('deck.undo')}</Text>
          </Pressable>
        )}

        <Pressable
          style={[styles.actionButton, styles.keepButton]}
          onPress={handleKeep}
          accessibilityLabel={t('deck.keepPhoto')}
          accessibilityHint={t('deck.keepPhotoHint')}
        >
          <Text style={styles.buttonText}>{t('deck.keep')}</Text>
        </Pressable>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardStack: {
    width: screenWidth,
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  card: {
    position: 'absolute',
    width: '90%',
    aspectRatio: 1,
  },
  buttonContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    backgroundColor: '#ef4444',
  },
  keepButton: {
    backgroundColor: '#22c55e',
  },
  undoButton: {
    backgroundColor: '#6b7280',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
