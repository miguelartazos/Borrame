/**
 * ActionHeroCard Component
 * Compact action-focused card with CTA button, space ready indicator, and action chips
 */

import React, { memo, useCallback, useMemo, useEffect, useState, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  cancelAnimation,
  interpolate,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { theme } from '../../ui';
import { formatBytes } from '../../lib/formatters';
import { testID } from '../../lib/a11y';
import { useReducedMotion } from '../../hooks/useReducedMotion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface ChipData {
  id: 'todo' | 'screenshots' | 'blurry' | 'similar' | 'videos';
  label: string;
  count: number;
  loading?: boolean;
}

interface ActionHeroCardProps {
  spaceReady: number; // in bytes
  chips: ChipData[];
  onPress: () => void;
  onPressChip: (id: ChipData['id']) => void;
  testID?: string;
  scrollY?: Animated.SharedValue<number>;
}

// Category Chip Component
const CategoryChip = memo(
  ({
    chip,
    onPress,
    isSelected,
    scaleValue,
  }: {
    chip: ChipData;
    onPress: (id: ChipData['id']) => void;
    isSelected: boolean;
    scaleValue: Animated.SharedValue<number>;
  }) => {
    const reduceMotion = useReducedMotion();

    const handlePressIn = useCallback(() => {
      if (!reduceMotion) {
        scaleValue.value = withSpring(0.95, {
          damping: 15,
          stiffness: 400,
        });
      }
    }, [scaleValue, reduceMotion]);

    const handlePressOut = useCallback(() => {
      if (!reduceMotion) {
        scaleValue.value = withSpring(1, {
          damping: 15,
          stiffness: 400,
        });
      }
    }, [scaleValue, reduceMotion]);

    const handlePress = useCallback(() => {
      onPress(chip.id);
    }, [chip.id, onPress]);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scaleValue.value }],
    }));

    return (
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.chip, isSelected && styles.chipSelected, animatedStyle]}
        accessibilityRole="button"
        accessibilityLabel={`${chip.label}: ${chip.count}`}
        testID={testID('home', 'chip', chip.id)}
      >
        <Text style={[styles.chipLabel, isSelected && styles.chipLabelSelected]}>{chip.label}</Text>
        {chip.count > 0 && (
          <View style={[styles.chipBadge, isSelected && styles.chipBadgeSelected]}>
            <Text style={[styles.chipCount, isSelected && styles.chipCountSelected]}>
              {chip.count}
            </Text>
          </View>
        )}
      </AnimatedPressable>
    );
  }
);

CategoryChip.displayName = 'CategoryChip';

export const ActionHeroCard = memo<ActionHeroCardProps>(
  ({ spaceReady, chips, onPress, onPressChip, testID: testIdProp, scrollY }) => {
    const { t } = useTranslation();
    const scaleValue = useSharedValue(1);
    // Create individual scale values for each chip type to avoid dynamic hook calls
    const todoScale = useSharedValue(1);
    const screenshotsScale = useSharedValue(1);
    const blurryScale = useSharedValue(1);
    const similarScale = useSharedValue(1);
    const videosScale = useSharedValue(1);
    
    const chipScaleMap = useMemo(
      () => ({
        todo: todoScale,
        screenshots: screenshotsScale,
        blurry: blurryScale,
        similar: similarScale,
        videos: videosScale,
      }),
      [todoScale, screenshotsScale, blurryScale, similarScale, videosScale]
    );
    const [selectedChipId, setSelectedChipId] = useState<ChipData['id']>('todo');

    useEffect(() => {
      return () => {
        cancelAnimation(scaleValue);
        cancelAnimation(todoScale);
        cancelAnimation(screenshotsScale);
        cancelAnimation(blurryScale);
        cancelAnimation(similarScale);
        cancelAnimation(videosScale);
      };
    }, [scaleValue, todoScale, screenshotsScale, blurryScale, similarScale, videosScale]);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scaleValue.value }],
    }));

    const reduceMotion = useReducedMotion();
    const lastScrollValue = useRef(0);

    const handlePressIn = useCallback(() => {
      if (!reduceMotion) {
        scaleValue.value = withSpring(0.98, {
          damping: 15,
          stiffness: 400,
        });
      }
    }, [scaleValue, reduceMotion]);

    const handlePressOut = useCallback(() => {
      if (!reduceMotion) {
        scaleValue.value = withSpring(1, {
          damping: 15,
          stiffness: 400,
        });
      }
    }, [scaleValue, reduceMotion]);

    const formattedSpace = useMemo(() => formatBytes(spaceReady), [spaceReady]);
    const hasChips = chips && chips.length > 0;

    const handleChipPress = useCallback(
      (id: ChipData['id']) => {
        setSelectedChipId(id);
        onPressChip(id);
      },
      [onPressChip]
    );

    const parallaxStyle = useAnimatedStyle(() => {
      if (!scrollY || reduceMotion) return {};

      // Throttle updates by checking if scroll changed significantly
      const currentScroll = scrollY.value;
      const diff = Math.abs(currentScroll - lastScrollValue.current);

      // Only update if scroll changed by more than 2 pixels
      if (diff > 2) {
        lastScrollValue.current = currentScroll;
        const translateY = interpolate(currentScroll, [-100, 0, 100], [2, 0, -4], 'clamp');
        return {
          transform: [{ translateY }],
        };
      }

      return {
        transform: [
          { translateY: interpolate(lastScrollValue.current, [-100, 0, 100], [2, 0, -4], 'clamp') },
        ],
      };
    }, [scrollY, reduceMotion]);

    return (
      <Animated.View
        entering={FadeIn}
        style={[theme.card.base, styles.card, parallaxStyle]}
        testID={testIdProp}
      >
        <View style={styles.container}>
          {/* Main Action Row */}
          <View style={styles.actionRow}>
            {/* Space Ready Info */}
            <View style={styles.spaceInfo}>
              <Text style={styles.spaceValue}>{formattedSpace}</Text>
              <Text style={styles.spaceLabel}>{t('home.listos')}</Text>
            </View>

            {/* CTA Button */}
            <AnimatedPressable
              onPress={onPress}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              style={[styles.ctaButton, animatedStyle]}
              accessibilityRole="button"
              accessibilityLabel={t('home.ordenarAhora')}
              testID={testID('home', 'action', 'cta')}
            >
              <Text style={styles.ctaText}>{t('home.ordenarAhora')}</Text>
            </AnimatedPressable>
          </View>

          {/* Chips Section */}
          {hasChips && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsScrollContent}
              style={styles.chipsContainer}
            >
              {chips.map((chip) => (
                <CategoryChip
                  key={chip.id}
                  chip={chip}
                  onPress={handleChipPress}
                  isSelected={chip.id === selectedChipId}
                  scaleValue={chipScaleMap[chip.id] || scaleValue}
                />
              ))}
            </ScrollView>
          )}
        </View>
      </Animated.View>
    );
  }
);

ActionHeroCard.displayName = 'ActionHeroCard';

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  container: {
    padding: 16,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  spaceInfo: {
    flex: 1,
  },
  spaceValue: {
    fontSize: 24,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  spaceLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  ctaButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: theme.radii.xl,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.bg,
  },
  chipsContainer: {
    marginHorizontal: -16,
  },
  chipsScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    height: 36,
    paddingHorizontal: 12,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.textPrimary,
    marginRight: 6,
  },
  chipLabelSelected: {
    color: theme.colors.bg,
  },
  chipBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: theme.colors.card,
    minWidth: 20,
    alignItems: 'center',
  },
  chipBadgeSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  chipCount: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  chipCountSelected: {
    color: theme.colors.bg,
  },
});

export default ActionHeroCard;
