/**
 * ProgressTrackerSkeleton Component
 * Skeleton loader for ProgressTrackerCard during initial load
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

export const ProgressTrackerSkeleton = memo(() => {
  return (
    <View style={styles.container}>
      {/* Top Row: Title + Streak */}
      <View style={styles.topRow}>
        <View style={styles.streakSection}>
          <SkeletonPulse width={80} height={34} />
          <SkeletonPulse width={40} height={34} />
        </View>
        <SkeletonPulse width={100} height={24} />
      </View>

      {/* Weekly Dots */}
      <View style={styles.weeklyDots}>
        {[0, 1, 2, 3, 4, 5, 6].map((index) => (
          <View key={index} style={styles.dotContainer}>
            <SkeletonPulse width={28} height={28} style={styles.dot} />
            <SkeletonPulse width={12} height={12} style={styles.dotLabel} />
          </View>
        ))}
      </View>

      {/* Goal Meter */}
      <View style={styles.goalMeter}>
        <SkeletonPulse width={120} height={16} />
        <SkeletonPulse width="100%" height={8} style={styles.progressBar} />
      </View>

      {/* Bottom Stats */}
      <View style={styles.statsRow}>
        <SkeletonPulse width={90} height={32} style={styles.statChip} />
        <SkeletonPulse width={90} height={32} style={styles.statChip} />
        <SkeletonPulse width={90} height={32} style={styles.statChip} />
      </View>
    </View>
  );
});

ProgressTrackerSkeleton.displayName = 'ProgressTrackerSkeleton';

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.xl,
    padding: 16,
    shadowColor: theme.colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  skeletonBase: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.sm,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  streakSection: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  weeklyDots: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  dotContainer: {
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    borderRadius: 14,
  },
  dotLabel: {
    marginTop: 4,
  },
  goalMeter: {
    marginBottom: 16,
    gap: 8,
  },
  progressBar: {
    borderRadius: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statChip: {
    borderRadius: 12,
  },
});

export default ProgressTrackerSkeleton;
