/**
 * Animated Progress Ring Component
 * SVG-based circular progress indicator with Reanimated
 */

import React, { memo, useEffect, useMemo } from 'react';
import { View, Text, ViewStyle } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
  interpolate,
  Easing,
  SharedValue,
  cancelAnimation,
} from 'react-native-reanimated';
import { colors } from './tokens';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Pre-computed frozen styles for performance
const PROGRESS_RING_STYLES = Object.freeze({
  svgTransform: Object.freeze({
    transform: [{ rotate: '-90deg' }],
  } as ViewStyle),
  labelContainer: Object.freeze({
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  } as ViewStyle),
});

// Pre-computed container styles for common sizes
const CONTAINER_STYLES = Object.freeze({
  80: Object.freeze({ width: 80, height: 80 } as ViewStyle), // Default and most common
  60: Object.freeze({ width: 60, height: 60 } as ViewStyle), // Small variant
  100: Object.freeze({ width: 100, height: 100 } as ViewStyle), // Large variant
});

interface ProgressRingProps {
  progress: number | SharedValue<number>; // 0 to 1 or animated value
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
  label?: string;
  centerLabel?: string;
  subLabel?: string;
  testID?: string;
}

export const ProgressRing = memo(
  ({
    progress,
    size = 80,
    strokeWidth = 6,
    color = colors.primary,
    backgroundColor = colors.surface,
    label,
    centerLabel,
    subLabel,
    testID = 'progressRing',
  }: ProgressRingProps) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;

    // Always create a shared value, but use the passed one if it's already animated
    const internalProgress = useSharedValue(0);
    const isSharedValue = typeof progress === 'object' && 'value' in progress;
    const progressValue = isSharedValue ? (progress as SharedValue<number>) : internalProgress;

    useEffect(() => {
      if (!isSharedValue && typeof progress === 'number') {
        internalProgress.value = withTiming(progress, {
          duration: 600,
          easing: Easing.inOut(Easing.ease),
        });
      }

      // Cleanup animation on unmount
      return () => {
        if (!isSharedValue) {
          cancelAnimation(internalProgress);
        }
      };
    }, [progress, internalProgress, isSharedValue]);

    const animatedProps = useAnimatedProps(() => {
      const strokeDashoffset = interpolate(progressValue.value, [0, 1], [circumference, 0]);

      return {
        strokeDashoffset,
      };
    });

    // Memoize dynamic size, but use pre-computed for common sizes
    const dynamicStyle = useMemo(() => ({ width: size, height: size }), [size]);
    const containerStyle = CONTAINER_STYLES[size as keyof typeof CONTAINER_STYLES] || dynamicStyle;

    return (
      <View
        style={containerStyle}
        testID={testID}
        accessibilityRole="progressbar"
        accessibilityValue={{
          min: 0,
          max: 100,
          now: Math.round((typeof progress === 'number' ? progress : 0) * 100),
        }}
      >
        <Svg width={size} height={size} style={PROGRESS_RING_STYLES.svgTransform}>
          <G>
            {/* Background circle */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={backgroundColor}
              strokeWidth={strokeWidth}
              fill="none"
            />
            {/* Progress circle */}
            <AnimatedCircle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={color}
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={`${circumference} ${circumference}`}
              animatedProps={animatedProps}
              strokeLinecap="round"
            />
          </G>
        </Svg>
        {(centerLabel || subLabel || label) && (
          <View style={PROGRESS_RING_STYLES.labelContainer}>
            <Text className="text-text-primary text-body font-semibold">
              {centerLabel || `${Math.round((typeof progress === 'number' ? progress : 0) * 100)}%`}
            </Text>
            {(subLabel || label) && (
              <Text className="text-text-secondary text-caption">{subLabel || label}</Text>
            )}
          </View>
        )}
      </View>
    );
  }
);

ProgressRing.displayName = 'ProgressRing';

export default ProgressRing;
