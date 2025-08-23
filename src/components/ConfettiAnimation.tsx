/**
 * ConfettiAnimation Component
 * Tasteful particle animation for 500MB+ freed milestone
 */

import React, { memo, useEffect, useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ConfettiParticle {
  id: string;
  x: number;
  color: string;
  delay: number;
  duration: number;
  rotationSpeed: number;
  size: number;
}

interface ConfettiAnimationProps {
  visible: boolean;
  onComplete?: () => void;
}

// Tasteful color palette
const COLORS = ['#FF7A1A', '#FFB366', '#FF9F4A', '#FFCC99', '#FFE5CC'];
const PARTICLE_COUNT = 20;
const ANIMATION_DURATION = 2500;

// Deterministic particle generation with seed
const generateParticles = (seed = 0): ConfettiParticle[] => {
  // Simple deterministic random using seed
  const seededRandom = (index: number) => {
    const x = Math.sin(seed + index) * 10000;
    return x - Math.floor(x);
  };

  return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
    id: `particle-${i}`,
    x: seededRandom(i * 3) * SCREEN_WIDTH,
    color: COLORS[Math.floor(seededRandom(i * 3 + 1) * COLORS.length)],
    delay: seededRandom(i * 3 + 2) * 300,
    duration: ANIMATION_DURATION + seededRandom(i * 4) * 500,
    rotationSpeed: (seededRandom(i * 5) - 0.5) * 720,
    size: 8 + seededRandom(i * 6) * 4,
  }));
};

const ParticleView = memo(
  ({ particle, onAnimationEnd }: { particle: ConfettiParticle; onAnimationEnd: () => void }) => {
    const translateY = useSharedValue(SCREEN_HEIGHT * 0.3);
    const translateX = useSharedValue(0);
    const opacity = useSharedValue(0);
    const scale = useSharedValue(0);
    const rotation = useSharedValue(0);

    useEffect(() => {
      // Start animation
      translateY.value = withDelay(
        particle.delay,
        withTiming(
          -100,
          {
            duration: particle.duration,
            easing: Easing.out(Easing.quad),
          },
          (finished) => {
            'worklet';
            if (finished) {
              runOnJS(onAnimationEnd)();
            }
          }
        )
      );

      translateX.value = withDelay(
        particle.delay,
        withSequence(
          withTiming((Math.random() - 0.5) * 100, {
            duration: particle.duration / 2,
            easing: Easing.out(Easing.sin),
          }),
          withTiming((Math.random() - 0.5) * 50, {
            duration: particle.duration / 2,
            easing: Easing.in(Easing.sin),
          })
        )
      );

      opacity.value = withDelay(
        particle.delay,
        withSequence(
          withTiming(1, { duration: 200 }),
          withTiming(1, { duration: particle.duration - 600 }),
          withTiming(0, { duration: 400 })
        )
      );

      scale.value = withDelay(
        particle.delay,
        withSequence(
          withTiming(1, { duration: 300, easing: Easing.out(Easing.ease) }),
          withTiming(0.8, { duration: particle.duration - 300 })
        )
      );

      rotation.value = withDelay(
        particle.delay,
        withTiming(particle.rotationSpeed, {
          duration: particle.duration,
          easing: Easing.linear,
        })
      );
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [
        { translateY: translateY.value },
        { translateX: translateX.value },
        { scale: scale.value },
        { rotate: `${rotation.value}deg` },
      ],
      opacity: opacity.value,
    }));

    return (
      <Animated.View
        testID={particle.id}
        style={[styles.particle, { left: particle.x }, animatedStyle]}
      >
        <Svg width={particle.size} height={particle.size}>
          <Circle
            cx={particle.size / 2}
            cy={particle.size / 2}
            r={particle.size / 2}
            fill={particle.color}
          />
        </Svg>
      </Animated.View>
    );
  }
);

ParticleView.displayName = 'ParticleView';

export const ConfettiAnimation = memo(({ visible, onComplete }: ConfettiAnimationProps) => {
  // Use timestamp as seed for consistent particles per mount
  const particles = useMemo(() => generateParticles(Date.now()), []);
  const completedCount = React.useRef(0);

  const handleParticleComplete = React.useCallback(() => {
    completedCount.current += 1;
    if (completedCount.current >= PARTICLE_COUNT && onComplete) {
      completedCount.current = 0;
      onComplete();
    }
  }, [onComplete]);

  if (!visible) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {particles.map((particle) => (
        <ParticleView
          key={particle.id}
          particle={particle}
          onAnimationEnd={handleParticleComplete}
        />
      ))}
    </View>
  );
});

ConfettiAnimation.displayName = 'ConfettiAnimation';

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
  },
  particle: {
    position: 'absolute',
    bottom: 0,
  },
});
