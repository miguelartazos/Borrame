import React, { memo, useEffect, useRef, useState } from 'react';
import { Pressable, Text, View, Platform } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSpring,
  interpolate,
  cancelAnimation,
  runOnJS,
  Extrapolate,
  Easing,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { shadows } from '../../ui/shadows';
import { colors } from '../../ui/tokens';
import { usePendingSpaceEstimate, useRefreshSpaceEstimate } from '../../store/usePendingStore';
import { useSettings } from '../../store/useSettings';
import { useFloatingButtonVisibility } from './useFloatingButtonVisibility';
// Analytics will be added when events are defined in analytics.ts

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Constants
const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 49 : 56;
const BUTTON_MARGIN = 16;
const SCROLL_HIDE_THRESHOLD = 50;
const IDLE_SHOW_DELAY = 10000; // 10 seconds
const INITIAL_SHOW_DELAY = 3000; // 3 seconds
const MIN_SPACE_MB = 10; // Only show if > 10MB ready

interface FloatingSwipeButtonProps {
  scrollY?: Animated.SharedValue<number>;
}

export const FloatingSwipeButton = memo(({ scrollY }: FloatingSwipeButtonProps) => {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const hapticFeedback = useSettings((s) => s.hapticFeedback);
  const spaceReady = usePendingSpaceEstimate();
  const refreshSpaceEstimate = useRefreshSpaceEstimate();

  const pulseAnimation = useSharedValue(0);
  const visibility = useSharedValue(0);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(100);
  const isScrolling = useSharedValue(false);
  const buttonInteractionRef = useRef(false);
  const [, setIsVisible] = useState(false);

  // Use visibility hook for cleaner logic
  const { dismiss } = useFloatingButtonVisibility({
    scrollY,
    visibility,
    translateY,
    isScrolling,
    spaceReady,
    minSpaceMB: MIN_SPACE_MB,
    scrollHideThreshold: SCROLL_HIDE_THRESHOLD,
    idleShowDelay: IDLE_SHOW_DELAY,
    initialShowDelay: INITIAL_SHOW_DELAY,
    onVisibilityChange: setIsVisible,
  });

  // Refresh space estimate on mount
  useEffect(() => {
    refreshSpaceEstimate();
  }, [refreshSpaceEstimate]);

  useEffect(() => {
    if (spaceReady > 0) {
      // Smooth pulse animation: scale 1→1.03 every 4s with sine easing
      pulseAnimation.value = withRepeat(
        withTiming(1, {
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
        }),
        -1,
        true // Reverse animation for smooth pulse
      );
    } else {
      cancelAnimation(pulseAnimation);
      pulseAnimation.value = 0;
    }

    return () => {
      cancelAnimation(pulseAnimation);
    };
  }, [spaceReady, pulseAnimation]);

  // Swipe to dismiss gesture
  const pan = Gesture.Pan()
    .onStart(() => {
      'worklet';
      runOnJS(() => {
        buttonInteractionRef.current = true;
      })();
    })
    .onUpdate((e) => {
      'worklet';
      if (e.translationX > 0) {
        translateX.value = e.translationX;
      }
    })
    .onEnd((e) => {
      'worklet';
      if (e.translationX > 100) {
        // Dismiss horizontally
        translateX.value = withTiming(300, { duration: 200 });
        visibility.value = withTiming(0, { duration: 200 });
        runOnJS(() => {
          dismiss(30 * 60 * 1000); // 30 minutes
          buttonInteractionRef.current = false;
          // Analytics tracking will be added when event is defined
        })();
      } else {
        // Snap back
        translateX.value = withSpring(0);
        runOnJS(() => {
          buttonInteractionRef.current = false;
        })();
      }
    });

  const animatedStyle = useAnimatedStyle(() => {
    // Subtle pulse: scale from 1 to 1.03
    const scale = interpolate(pulseAnimation.value, [0, 1], [1, 1.03], Extrapolate.CLAMP);
    const opacity = interpolate(visibility.value, [0, 1], [0, 1], Extrapolate.CLAMP);

    return {
      opacity,
      transform: [{ scale }, { translateX: translateX.value }, { translateY: translateY.value }],
    };
  });

  const handlePress = () => {
    buttonInteractionRef.current = true;
    if (hapticFeedback) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    // Analytics tracking will be added when event is defined
    router.push('/(main)/deck');
    // Reset interaction flag after navigation
    setTimeout(() => {
      buttonInteractionRef.current = false;
    }, 100);
  };

  // Don't render if not enough space
  if (spaceReady <= MIN_SPACE_MB) {
    return null;
  }

  const buttonStyle = {
    position: 'absolute' as const,
    bottom: insets.bottom + TAB_BAR_HEIGHT + BUTTON_MARGIN,
    right: BUTTON_MARGIN,
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    ...shadows.floating,
  };

  return (
    <GestureDetector gesture={pan}>
      <AnimatedPressable
        style={[buttonStyle, animatedStyle]}
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={t('home.ordenarAhora')}
        accessibilityHint={t('home.floatingButton_hint')}
        testID="home.hero.cta"
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text className="text-white font-semibold text-base">{t('home.ordenarAhora')}</Text>
          <ArrowRight size={20} color="white" />
        </View>
      </AnimatedPressable>
    </GestureDetector>
  );
});

FloatingSwipeButton.displayName = 'FloatingSwipeButton';

export default FloatingSwipeButton;
