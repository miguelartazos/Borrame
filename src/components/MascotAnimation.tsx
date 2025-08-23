import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import Svg, { Path, Circle, Rect } from 'react-native-svg';

export function MascotAnimation() {
  const bounceAnim = useSharedValue(0);
  const sparkleAnim = useSharedValue(0);
  const broomRotation = useSharedValue(0);
  const dustOpacity = useSharedValue(0);

  useEffect(() => {
    bounceAnim.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 600, easing: Easing.inOut(Easing.ease) })
      ),
      -1
    );

    broomRotation.value = withRepeat(
      withSequence(
        withTiming(15, { duration: 400, easing: Easing.inOut(Easing.ease) }),
        withTiming(-15, { duration: 400, easing: Easing.inOut(Easing.ease) })
      ),
      -1
    );

    sparkleAnim.value = withRepeat(
      withSequence(withTiming(1, { duration: 1000 }), withTiming(0, { duration: 500 })),
      -1
    );

    dustOpacity.value = withRepeat(
      withSequence(withTiming(0.7, { duration: 800 }), withTiming(0, { duration: 400 })),
      -1
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mascotAnimatedStyle = useAnimatedStyle(() => {
    const translateY = interpolate(bounceAnim.value, [0, 1], [0, -10]);
    return {
      transform: [{ translateY }],
    };
  });

  const broomAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${broomRotation.value}deg` }],
    };
  });

  const sparkle1Style = useAnimatedStyle(() => {
    const scale = interpolate(sparkleAnim.value, [0, 0.5, 1], [0, 1.2, 0]);
    const opacity = interpolate(sparkleAnim.value, [0, 0.5, 1], [0, 1, 0]);
    return {
      opacity,
      transform: [{ scale }],
    };
  });

  const sparkle2Style = useAnimatedStyle(() => {
    const scale = interpolate(sparkleAnim.value, [0, 0.3, 0.8, 1], [0, 0, 1.2, 0]);
    const opacity = interpolate(sparkleAnim.value, [0, 0.3, 0.8, 1], [0, 0, 1, 0]);
    return {
      opacity,
      transform: [{ scale }],
    };
  });

  const dustStyle = useAnimatedStyle(() => {
    const translateX = interpolate(dustOpacity.value, [0, 0.7], [0, 20]);
    return {
      opacity: dustOpacity.value,
      transform: [{ translateX }],
    };
  });

  return (
    <View style={styles.container}>
      {/* Dust particles as separate animated overlay */}
      <Animated.View style={[styles.dustContainer, dustStyle]}>
        <Svg width={50} height={50} viewBox="0 0 50 50">
          <Circle cx="20" cy="20" r="3" fill="#FFB27A" opacity="0.6" />
          <Circle cx="15" cy="30" r="2" fill="#FFB27A" opacity="0.4" />
          <Circle cx="25" cy="25" r="2.5" fill="#FFB27A" opacity="0.5" />
        </Svg>
      </Animated.View>

      {/* Main mascot */}
      <Animated.View style={mascotAnimatedStyle}>
        <Svg width={200} height={200} viewBox="0 0 200 200">
          {/* Mascot body */}
          <Circle cx="100" cy="100" r="50" fill="#FF7A1A" />

          {/* Mascot face */}
          <Circle cx="85" cy="90" r="5" fill="#FFFFFF" />
          <Circle cx="115" cy="90" r="5" fill="#FFFFFF" />
          <Circle cx="85" cy="92" r="3" fill="#000000" />
          <Circle cx="115" cy="92" r="3" fill="#000000" />

          {/* Smile */}
          <Path
            d="M 85 110 Q 100 120 115 110"
            stroke="#FFFFFF"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />

          {/* Arms */}
          <Path
            d="M 70 100 L 55 85 L 60 40"
            stroke="#FF7A1A"
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
          />
          <Path
            d="M 130 100 L 140 110"
            stroke="#FF7A1A"
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
          />
        </Svg>
      </Animated.View>

      {/* Broom as separate animated element */}
      <Animated.View style={[styles.broomContainer, broomAnimatedStyle]}>
        <Svg width={30} height={80} viewBox="0 0 30 80">
          {/* Broom handle */}
          <Rect x="13" y="0" width="4" height="60" fill="#8B4513" rx="2" />

          {/* Broom bristles */}
          <Rect x="5" y="55" width="20" height="25" fill="#D2691E" rx="2" />
          <Rect x="7" y="75" width="16" height="5" fill="#A0522D" />
        </Svg>
      </Animated.View>

      {/* Sparkles */}
      <Animated.View style={[styles.sparkle1, sparkle1Style]}>
        <Svg width={20} height={20} viewBox="0 0 20 20">
          <Path d="M 10 0 L 12 8 L 20 10 L 12 12 L 10 20 L 8 12 L 0 10 L 8 8 Z" fill="#FFD700" />
        </Svg>
      </Animated.View>

      <Animated.View style={[styles.sparkle2, sparkle2Style]}>
        <Svg width={20} height={20} viewBox="0 0 20 20">
          <Path d="M 10 0 L 12 8 L 20 10 L 12 12 L 10 20 L 8 12 L 0 10 L 8 8 Z" fill="#FFD700" />
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 200,
    height: 200,
  },
  dustContainer: {
    position: 'absolute',
    left: 10,
    top: 70,
  },
  broomContainer: {
    position: 'absolute',
    left: 55,
    top: 40,
  },
  sparkle1: {
    position: 'absolute',
    top: 50,
    right: 20,
  },
  sparkle2: {
    position: 'absolute',
    top: 40,
    left: 20,
  },
});
