/**
 * ActionHeroSkeleton Component
 * Skeleton loader for ActionHeroCard during initial load
 */

import React, { memo } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { theme } from '../../ui';

const SkeletonPulse = memo(
  ({
    width,
    height,
    style,
  }: {
    width: number | string;
    height: number;
    style?: StyleProp<ViewStyle>;
  }) => {
    const opacity = useSharedValue(0.3);

    React.useEffect(() => {
      opacity.value = withRepeat(
        withSequence(
          withTiming(0.6, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.3, { duration: 800, easing: Easing.inOut(Easing.ease) })
        ),
        -1
      );

      return () => {
        cancelAnimation(opacity);
      };
    }, [opacity]);

    const animatedStyle = useAnimatedStyle(() => ({
      opacity: opacity.value,
    }));

    return (
      <Animated.View
        style={[
          styles.skeletonBase,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          { width: width as any, height },
          animatedStyle,
          style,
        ]}
      />
    );
  }
);

SkeletonPulse.displayName = 'SkeletonPulse';

export const ActionHeroSkeleton = memo(() => {
  return (
    <View style={[theme.card.base, styles.card]}>
      <View style={styles.container}>
        {/* Main Action Row */}
        <View style={styles.actionRow}>
          {/* Space Ready Info */}
          <View style={styles.spaceInfo}>
            <SkeletonPulse width={120} height={28} />
            <SkeletonPulse width={60} height={16} style={styles.spaceLabel} />
          </View>

          {/* CTA Button */}
          <SkeletonPulse width={140} height={48} style={styles.ctaButton} />
        </View>

        {/* Chips Section */}
        <View style={styles.chipsContainer}>
          <SkeletonPulse width={80} height={36} style={styles.chip} />
          <SkeletonPulse width={100} height={36} style={styles.chip} />
          <SkeletonPulse width={90} height={36} style={styles.chip} />
        </View>
      </View>
    </View>
  );
});

ActionHeroSkeleton.displayName = 'ActionHeroSkeleton';

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  container: {
    padding: 16,
  },
  skeletonBase: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.sm,
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
  spaceLabel: {
    marginTop: 4,
  },
  ctaButton: {
    borderRadius: theme.radii.xl,
  },
  chipsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    borderRadius: theme.radii.md,
  },
});

export default ActionHeroSkeleton;
