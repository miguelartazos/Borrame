/**
 * ParallaxHeroCard Component
 * Hero card with parallax scroll effect
 */

import React, { memo, useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  interpolate,
  Extrapolate,
  FadeIn,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles, ArrowRight } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useReducedMotion } from '../hooks/useReducedMotion';

interface ParallaxHeroCardProps {
  progress: number;
  spaceReadyMB: number;
  onPress?: () => void;
  scrollY?: Animated.SharedValue<number>;
}

export const ParallaxHeroCard = memo(
  ({ progress, spaceReadyMB, onPress, scrollY }: ParallaxHeroCardProps) => {
    const { t } = useTranslation();
    const reduceMotion = useReducedMotion();
    const localScrollY = useSharedValue(0);
    const animatedScrollY = scrollY || localScrollY;

    // Bridge React state to SharedValue for safe worklet access
    const reducedMotionValue = useSharedValue(reduceMotion);

    // Keep SharedValue in sync with React state
    useEffect(() => {
      reducedMotionValue.value = reduceMotion;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reduceMotion]);

    const parallaxStyle = useAnimatedStyle(() => {
      'worklet';
      // Skip parallax if reduced motion is enabled
      if (reducedMotionValue.value) {
        return {};
      }

      const translateY = interpolate(animatedScrollY.value, [0, 200], [0, -30], Extrapolate.CLAMP);

      const scale = interpolate(animatedScrollY.value, [0, 200], [1, 0.95], Extrapolate.CLAMP);

      const opacity = interpolate(animatedScrollY.value, [0, 300], [1, 0.8], Extrapolate.CLAMP);

      return {
        transform: [{ translateY }, { scale }],
        opacity,
      };
    });

    // Use simple fade in if reduced motion is enabled
    const enteringAnimation = reduceMotion ? FadeIn : undefined;

    return (
      <Animated.View entering={enteringAnimation} style={[parallaxStyle]} className="px-4 mb-4">
        <Pressable onPress={onPress}>
          <LinearGradient
            colors={['#FF7A1A', '#FF9F4A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="rounded-2xl p-5"
          >
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center">
                <Sparkles size={24} color="white" />
                <Text className="text-white text-lg font-bold ml-2">
                  {t('heroCard.spaceReady')} {spaceReadyMB} MB
                </Text>
              </View>
              <View className="bg-white/20 px-3 py-1 rounded-full">
                <Text className="text-white text-sm font-semibold">
                  {Math.round(progress * 100)}%
                </Text>
              </View>
            </View>

            <View className="bg-white/10 h-2 rounded-full mb-3">
              <View className="bg-white h-2 rounded-full" style={{ width: `${progress * 100}%` }} />
            </View>

            <View className="flex-row items-center justify-between">
              <Text className="text-white/90 text-sm">{t('heroCard.swipeHint')}</Text>
              <ArrowRight size={20} color="white" />
            </View>
          </LinearGradient>
        </Pressable>
      </Animated.View>
    );
  }
);

ParallaxHeroCard.displayName = 'ParallaxHeroCard';

// Hook to create scroll handler for parallax effect
export const useParallaxScrollHandler = () => {
  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  return { scrollY, scrollHandler };
};
