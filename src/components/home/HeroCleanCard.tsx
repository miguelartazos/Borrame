/**
 * HeroCleanCard Component
 * Main call-to-action card with progress ring and category chips
 */

import React, { memo, useCallback, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import Animated, {
  FadeIn,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { ProgressRing } from '../../ui/ProgressRing';
import { theme } from '../../ui';
import { testID } from '../../lib/a11y';
import { formatBytes, formatCount } from '../../lib/formatters';
import { useHomeStore } from '../../store/useHomeStore';

// Types
export interface ChipData {
  id: 'todo' | 'screenshots' | 'blurry' | 'similar' | 'videos';
  label: string;
  count: number;
  loading?: boolean;
}

interface HeroCleanCardProps {
  progress: number; // 0 to 1
  spaceReady: number; // in bytes
  chips: ChipData[];
  loading?: boolean;
  onPress: () => void;
  onPressChip: (id: ChipData['id']) => void;
}

// Animation constants
const ANIMATION_CONFIG = {
  RING_DURATION: 600,
  CHIP_STAGGER_DELAY: 50,
  PRESS_SCALE: 0.98,
} as const;

// Skeleton Shimmer Component
const SkeletonShimmer = memo(() => {
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(
      withSequence(withTiming(1, { duration: 1000 }), withTiming(0.3, { duration: 1000 })),
      -1,
      false
    );

    return () => {
      cancelAnimation(shimmer);
    };
  }, [shimmer]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: shimmer.value,
  }));

  return (
    <View style={styles.container}>
      <View style={styles.topSection}>
        {/* Ring skeleton */}
        <Animated.View style={[styles.skeletonRing, animatedStyle]} />
        {/* Text skeleton */}
        <View style={styles.ctaSection}>
          <Animated.View style={[styles.skeletonTitle, animatedStyle]} />
          <Animated.View style={[styles.skeletonSubtitle, animatedStyle]} />
        </View>
      </View>
      {/* Chips skeleton */}
      <View style={styles.chipsContainer}>
        {[1, 2, 3, 4].map((i) => (
          <Animated.View key={i} style={[styles.skeletonChip, animatedStyle]} />
        ))}
      </View>
    </View>
  );
});

SkeletonShimmer.displayName = 'SkeletonShimmer';

// Category Chip Component
const CategoryChip = memo(
  ({
    chip,
    index,
    onPress,
  }: {
    chip: ChipData;
    index: number;
    onPress: (id: ChipData['id']) => void;
  }) => {
    const handlePress = useCallback(() => {
      onPress(chip.id);
    }, [chip.id, onPress]);

    return (
      <Animated.View
        entering={FadeInUp.delay(index * ANIMATION_CONFIG.CHIP_STAGGER_DELAY)
          .duration(300)
          .easing(Easing.inOut(Easing.ease))}
      >
        <Pressable
          onPress={handlePress}
          style={styles.chip}
          accessibilityRole="button"
          accessibilityLabel={`${chip.label}: ${chip.count}`}
          testID={testID('home', 'chip', chip.id)}
        >
          <Text style={styles.chipLabel}>{chip.label}</Text>
          <View style={styles.chipBadge}>
            <Text style={styles.chipCount}>{formatCount(chip.count)}</Text>
          </View>
        </Pressable>
      </Animated.View>
    );
  }
);

CategoryChip.displayName = 'CategoryChip';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Main Component
export const HeroCleanCard = memo(
  ({ progress, spaceReady, chips, loading = false, onPress, onPressChip }: HeroCleanCardProps) => {
    const { t } = useTranslation();
    const scaleValue = useSharedValue(1);
    // Use separate selectors to avoid creating new objects
    const setProgress = useHomeStore((s) => s.setProgress);
    const lastProgress = useHomeStore((s) => s.lastProgress);
    const animatedProgress = useSharedValue(lastProgress);

    // Animate progress from last value to current with 600ms timing on mount
    useEffect(() => {
      // Persist current progress
      setProgress(progress);

      // Animate from last persisted value to current
      animatedProgress.value = withTiming(progress, {
        duration: 600,
        easing: Easing.inOut(Easing.ease),
      });

      // Cleanup animation on unmount
      return () => {
        cancelAnimation(animatedProgress);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [progress, setProgress]); // animatedProgress intentionally omitted to prevent infinite loop

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scaleValue.value }],
    }));

    const handlePressIn = useCallback(() => {
      scaleValue.value = withSpring(ANIMATION_CONFIG.PRESS_SCALE, {
        damping: 15,
        stiffness: 400,
      });
    }, [scaleValue]);

    const handlePressOut = useCallback(() => {
      scaleValue.value = withSpring(1, {
        damping: 15,
        stiffness: 400,
      });
    }, [scaleValue]);

    // Memoize calculations (must be before conditional returns)
    const percentComplete = useMemo(() => Math.round(progress * 100), [progress]);
    const formattedSpace = useMemo(() => formatBytes(spaceReady), [spaceReady]);

    // Handle empty chips
    const hasChips = chips && chips.length > 0;

    if (loading) {
      return (
        <View style={[theme.card.base, styles.card]}>
          <SkeletonShimmer />
        </View>
      );
    }

    return (
      <Animated.View entering={FadeIn} style={[theme.card.base, styles.card]}>
        <View style={styles.container}>
          {/* Top Section: Progress Ring + CTA */}
          <AnimatedPressable
            onPress={onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            style={[styles.topSection, animatedStyle]}
            accessibilityRole="button"
            accessibilityLabel={t('home.ordenarAhora')}
            testID={testID('home', 'hero', 'cta')}
          >
            {/* Progress Ring */}
            <View style={styles.ringContainer}>
              <ProgressRing
                progress={animatedProgress}
                size={80}
                strokeWidth={6}
                centerLabel={`${percentComplete}%`}
                subLabel={t('home.revisado')}
                testID="hero_progressRing"
              />
            </View>

            {/* CTA Section */}
            <View style={styles.ctaSection}>
              <Text style={styles.ctaTitle}>{t('home.ordenarAhora')}</Text>
              <Text style={styles.ctaSubtitle}>
                ≈ {formattedSpace} {t('home.listos')}
              </Text>
            </View>
          </AnimatedPressable>

          {/* Chips Section */}
          {hasChips && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsScrollContent}
              style={styles.chipsContainer}
            >
              {chips.map((chip, index) => (
                <CategoryChip key={chip.id} chip={chip} index={index} onPress={onPressChip} />
              ))}
            </ScrollView>
          )}
        </View>
      </Animated.View>
    );
  }
);

HeroCleanCard.displayName = 'HeroCleanCard';

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  container: {
    padding: 16,
  },
  topSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  ringContainer: {
    marginRight: 16,
  },
  ctaSection: {
    flex: 1,
  },
  ctaTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.primary, // Orange accent for CTA
    marginBottom: 4,
  },
  ctaSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  chipsContainer: {
    marginHorizontal: -16,
  },
  chipsScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  chipLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textPrimary,
    marginRight: 8,
  },
  chipBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
  },
  chipCount: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  // Skeleton styles
  skeletonRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.surface,
    marginRight: 16,
  },
  skeletonTitle: {
    height: 20,
    width: 120,
    borderRadius: 8,
    backgroundColor: theme.colors.surface,
    marginBottom: 8,
  },
  skeletonSubtitle: {
    height: 16,
    width: 100,
    borderRadius: 6,
    backgroundColor: theme.colors.surface,
  },
  skeletonChip: {
    height: 44,
    width: 90,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    marginRight: 8,
  },
});

export default HeroCleanCard;
