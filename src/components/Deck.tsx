import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Dimensions, Pressable, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
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
import { SwipeTutorialOverlay } from './SwipeTutorialOverlay';
import { SWIPE_THRESHOLDS, DECK_CONFIG, SPRING_CONFIG } from '../features/deck/constants';
import { useHistory } from '../store/useHistory';
import { useSettings } from '../store/useSettings';
import {
  useMakeDecision,
  useSwipeLeftAction,
  useSwipeRightAction,
} from '../hooks/useDeckDecisions';
import { useImagePrefetch } from '../hooks/useImagePrefetch';
import { analytics } from '../lib/analytics';
import type { Asset } from '../db/schema';

const { width: screenWidth } = Dimensions.get('window');

interface DeckProps {
  assets: Asset[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  onDecide: (assetId: string, action: 'delete' | 'keep') => void;
  onLoadMore: () => void;
  onUndo: () => void;
  gestureEnabled?: boolean;
}

export function Deck({
  assets,
  currentIndex,
  onIndexChange,
  onDecide,
  onLoadMore,
  onUndo,
  gestureEnabled = true,
}: DeckProps) {
  const { t } = useTranslation();
  const canUndo = useHistory((s) => s.buffer.length > 0);

  const hasSeenLeftSwipe = useSettings((s) => s.hasSeenLeftSwipeTutorial);
  const hasSeenRightSwipe = useSettings((s) => s.hasSeenRightSwipeTutorial);
  const setHasSeenLeftSwipe = useSettings((s) => s.setHasSeenLeftSwipeTutorial);
  const setHasSeenRightSwipe = useSettings((s) => s.setHasSeenRightSwipeTutorial);

  const [showTutorial, setShowTutorial] = useState<{
    visible: boolean;
    direction: 'left' | 'right';
  }>({
    visible: false,
    direction: 'left',
  });
  const [pendingSwipeDirection, setPendingSwipeDirection] = useState<'left' | 'right' | null>(null);

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const swipeLeftAction = useSwipeLeftAction();
  const swipeRightAction = useSwipeRightAction();
  const makeDecision = useMakeDecision({
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
    translateX.value = withSpring(0, SPRING_CONFIG.SWIPE_BACK);
    translateY.value = withSpring(0, SPRING_CONFIG.SWIPE_BACK);
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

  const handleTutorialDone = useCallback(() => {
    const direction = showTutorial.direction;
    setShowTutorial({ visible: false, direction: 'left' });

    if (direction === 'left') {
      setHasSeenLeftSwipe(true);
      analytics.track('swipe_tutorial_dismissed', { direction: 'left' });
    } else {
      setHasSeenRightSwipe(true);
      analytics.track('swipe_tutorial_dismissed', { direction: 'right' });
    }

    // Complete the pending swipe if there was one
    if (pendingSwipeDirection) {
      animateCardOut(pendingSwipeDirection);
      setPendingSwipeDirection(null);
    }
  }, [
    showTutorial.direction,
    pendingSwipeDirection,
    setHasSeenLeftSwipe,
    setHasSeenRightSwipe,
    animateCardOut,
  ]);

  const checkAndShowTutorial = useCallback(
    (direction: 'left' | 'right') => {
      if (direction === 'left' && !hasSeenLeftSwipe) {
        setShowTutorial({ visible: true, direction: 'left' });
        setPendingSwipeDirection(direction);
        return;
      } else if (direction === 'right' && !hasSeenRightSwipe) {
        setShowTutorial({ visible: true, direction: 'right' });
        setPendingSwipeDirection(direction);
        return;
      }
      // If we've seen the tutorial, perform the swipe
      animateCardOut(direction);
    },
    [hasSeenLeftSwipe, hasSeenRightSwipe, animateCardOut]
  );

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY * 0.3;

      // Haptic feedback at swipe threshold
      if (Math.abs(event.translationX) > SWIPE_THRESHOLDS.TRANSLATE_X * 0.8) {
        if (!translateX.value || Math.abs(translateX.value) <= SWIPE_THRESHOLDS.TRANSLATE_X * 0.8) {
          runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
        }
      }
    })
    .onEnd((event) => {
      const shouldSwipeLeft =
        event.translationX < -SWIPE_THRESHOLDS.TRANSLATE_X ||
        event.velocityX < -SWIPE_THRESHOLDS.VELOCITY_X;

      const shouldSwipeRight =
        event.translationX > SWIPE_THRESHOLDS.TRANSLATE_X ||
        event.velocityX > SWIPE_THRESHOLDS.VELOCITY_X;

      if (shouldSwipeLeft) {
        runOnJS(checkAndShowTutorial)('left');
        resetPosition();
      } else if (shouldSwipeRight) {
        runOnJS(checkAndShowTutorial)('right');
        resetPosition();
      } else {
        resetPosition();
      }
    });

  const effectiveGesture = gestureEnabled ? panGesture : Gesture.Pan().enabled(false);

  const handleKeep = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const direction = swipeRightAction === 'keep' ? 'right' : 'left';
    checkAndShowTutorial(direction);
  };

  const handleDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const direction = swipeLeftAction === 'delete' ? 'left' : 'right';
    checkAndShowTutorial(direction);
  };

  const handleUndo = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
    <GestureHandlerRootView style={styles.container} testID="deckContainer">
      <Animated.View style={[styles.cardStack, stackAnimatedStyle]}>
        {visibleCards
          .slice(0)
          .reverse()
          .map((asset, index) => {
            const reversedIndex = visibleCards.length - 1 - index;
            const isTop = reversedIndex === 0;

            if (isTop) {
              return (
                <GestureDetector key={asset.id} gesture={effectiveGesture}>
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
        <View style={styles.actionButtonWrapper}>
          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              styles.deleteButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={handleDelete}
            accessibilityLabel={t('deck.deletePhoto')}
            accessibilityHint={t('deck.deletePhotoHint')}
            testID="deleteButton"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close" size={28} color="#000" />
          </Pressable>
          <Text style={styles.actionLabel}>{t('deck.delete')}</Text>
        </View>

        {canUndo && (
          <View style={styles.actionButtonWrapper}>
            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                styles.undoButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={handleUndo}
              accessibilityLabel={t('deck.undo')}
              testID="undoButton"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="arrow-undo" size={24} color="#000" />
            </Pressable>
            <Text style={styles.actionLabel}>{t('deck.undo')}</Text>
          </View>
        )}

        <View style={styles.actionButtonWrapper}>
          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              styles.keepButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={handleKeep}
            accessibilityLabel={t('deck.keepPhoto')}
            accessibilityHint={t('deck.keepPhotoHint')}
            testID="keepButton"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="checkmark" size={32} color="#000" />
          </Pressable>
          <Text style={styles.actionLabel}>{t('deck.keep')}</Text>
        </View>
      </View>

      {/* Swipe Tutorial Overlay */}
      <SwipeTutorialOverlay
        visible={showTutorial.visible}
        direction={showTutorial.direction}
        photoUri={visibleCards[0]?.uri}
        onDone={handleTutorialDone}
      />
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
    paddingHorizontal: 40,
    paddingBottom: 30,
    gap: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonWrapper: {
    alignItems: 'center',
    gap: 4,
  },
  actionButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#666',
    marginTop: 2,
  },
  deleteButton: {
    transform: [{ scale: 0.9 }],
  },
  keepButton: {
    transform: [{ scale: 1.1 }],
  },
  undoButton: {
    transform: [{ scale: 0.85 }],
  },
  buttonPressed: {
    transform: [{ scale: 0.92 }],
    opacity: 0.8,
  },
});
