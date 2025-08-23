/**
 * CategoryTile Component
 * Individual tile for category grid with Pro badge and blur overlay
 */

import React, { memo, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { Star } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSettings } from '../../store/useSettings';
import { theme } from '../../ui';
import { useTranslation } from 'react-i18next';
import { testID as makeTestID } from '../../lib/a11y';
import { formatCount } from '../../lib/formatters';

export interface CategoryTileProps {
  id: string;
  title: string;
  icon: React.ReactNode;
  count: number;
  locked?: boolean;
  onPress: (id: string) => void;
  testID?: string;
  pressedTileId?: Animated.SharedValue<string | null>;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Animation constants
const ANIMATION_CONFIG = {
  PRESS_SCALE: 0.95,
  SPRING: { damping: 15, stiffness: 400 },
} as const;

export const CategoryTile = memo(
  ({
    id,
    title,
    icon,
    count,
    locked = false,
    onPress,
    testID,
    pressedTileId,
  }: CategoryTileProps) => {
    const { t } = useTranslation();
    const hapticFeedback = useSettings((s) => s.hapticFeedback);

    const animatedStyle = useAnimatedStyle(() => {
      // If no shared animation controller, no animation
      if (!pressedTileId) {
        return { transform: [{ scale: 1 }] };
      }

      const isPressed = pressedTileId.value === id;
      return {
        transform: [
          {
            scale: withSpring(
              isPressed ? ANIMATION_CONFIG.PRESS_SCALE : 1,
              ANIMATION_CONFIG.SPRING
            ),
          },
        ],
      };
    });

    const handlePressIn = useCallback(() => {
      'worklet';
      if (pressedTileId) {
        pressedTileId.value = id;
      }
    }, [id, pressedTileId]);

    const handlePressOut = useCallback(() => {
      'worklet';
      if (pressedTileId) {
        pressedTileId.value = null;
      }
    }, [pressedTileId]);

    const handlePress = useCallback(() => {
      // Fire haptic feedback asynchronously without blocking
      if (hapticFeedback) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {
          // Haptic feedback failed, continue silently
        });
      }
      onPress(id);
    }, [id, onPress, hapticFeedback]);

    return (
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.tile, animatedStyle]}
        accessibilityRole="button"
        accessibilityLabel={
          locked
            ? t('categories.tile_locked', { title, count })
            : t('categories.tile_unlocked', { title, count })
        }
        accessibilityState={{ disabled: locked }}
        testID={testID || makeTestID('home', 'bundle', id)}
      >
        <View style={[theme.card.base, styles.tileContent]}>
          {/* Icon */}
          <View style={styles.iconContainer}>{icon}</View>

          {/* Title */}
          <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
            {title}
          </Text>

          {/* Count */}
          <View style={styles.countContainer}>
            <Text style={styles.count}>{formatCount(count)}</Text>
          </View>

          {/* Pro Badge Overlay */}
          {locked && (
            <>
              <BlurView intensity={15} tint="light" style={StyleSheet.absoluteFillObject} />
              <View style={styles.proBadge}>
                <Star size={12} color="#FFD700" fill="#FFD700" />
              </View>
            </>
          )}
        </View>
      </AnimatedPressable>
    );
  }
);

CategoryTile.displayName = 'CategoryTile';

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    aspectRatio: 1,
    padding: 4,
  },
  tileContent: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  iconContainer: {
    width: 32,
    height: 32,
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  countContainer: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.radii.sm,
  },
  count: {
    fontSize: 11,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  proBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
});

export default CategoryTile;
