/**
 * ProgressTrackerCard Component
 * Streak and goal tracking card with weekly dots and progress meter
 */

import React, { memo, useEffect, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, TextStyle } from 'react-native';
import Animated, {
  FadeIn,
  FadeInUp,
  useAnimatedStyle,
  useAnimatedProps,
  useSharedValue,
  withTiming,
  withDelay,
  withSpring,
  interpolate,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Stop, Text as SvgText, TSpan } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { formatBytes } from '../../lib/formatters';
import { getCurrentDayIndex, createWeekActivityMap } from '../../lib/dateUtils';
import { theme } from '../../ui';
import { useReducedMotion } from '../../hooks/useReducedMotion';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export type ProgressTrackerProps = {
  streakDays: number;
  goalMinutesPerDay: number;
  minutesToday: number;
  percentReviewed: number; // 0..1
  freedTodayBytes: number;
  spaceReadyBytes: number;
  goalSchedule: boolean[]; // length 7, Monday-first by locale
  daysWithActivity: string[]; // ISO dates "YYYY-MM-DD" (local)
  onAdjustGoal: () => void;
};

// Animation constants
const ANIMATION_CONFIG = {
  DURATION: 600,
  EASING: Easing.inOut(Easing.ease),
  SPRING_CONFIG: {
    damping: 15,
    stiffness: 150,
  },
} as const;

// Get localized day labels
const getWeekDayLabels = (locale: string = 'es'): string[] => {
  const isSpanish = locale.startsWith('es');
  return isSpanish ? ['L', 'M', 'X', 'J', 'V', 'S', 'D'] : ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
};

// Weekly Dot Component
const WeeklyDot = memo(
  ({
    dayLabel,
    dayIndex,
    isGoalDay,
    hasActivity,
    isCurrentDay,
    index,
  }: {
    dayLabel: string;
    dayIndex: number;
    isGoalDay: boolean;
    hasActivity: boolean;
    isCurrentDay: boolean;
    index: number;
  }) => {
    const { t } = useTranslation();
    const scale = useSharedValue(0);
    const reduceMotion = useReducedMotion();

    useEffect(() => {
      // Skip animation if reduced motion is enabled
      if (reduceMotion) {
        scale.value = 1;
      } else {
        // Staggered animation with delay
        scale.value = withDelay(index * 50, withSpring(1, ANIMATION_CONFIG.SPRING_CONFIG));
      }

      // Cleanup on unmount
      return () => {
        cancelAnimation(scale);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scale, index]);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));

    const getDotStyle = () => {
      if (hasActivity) {
        return [styles.dotFilled, isCurrentDay && styles.dotCurrent];
      }
      if (isGoalDay && !hasActivity) {
        return styles.dotOutlined;
      }
      return styles.dotDim;
    };

    const accessibilityLabel = `${dayLabel}: ${hasActivity ? t('home.completado', 'completado') : t('home.noCompletado', 'no completado')}`;

    return (
      <Animated.View
        style={[styles.dotContainer, animatedStyle]}
        testID={`home.progress.dot.${dayIndex}`}
        accessible
        accessibilityRole="text"
        accessibilityLabel={accessibilityLabel}
      >
        <View style={[styles.dot, getDotStyle()]} />
        <Text style={styles.dotLabel}>{dayLabel}</Text>
      </Animated.View>
    );
  }
);

WeeklyDot.displayName = 'WeeklyDot';

// Mini Ring Component (for % reviewed)
const MiniRing = memo(({ percent, size = 26 }: { percent: number; size?: number }) => {
  const progress = useSharedValue(0);
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) {
      progress.value = percent;
    } else {
      progress.value = withTiming(percent, {
        duration: ANIMATION_CONFIG.DURATION,
        easing: ANIMATION_CONFIG.EASING,
      });
    }

    // Cleanup animation on unmount
    return () => {
      cancelAnimation(progress);
    };
  }, [percent, progress, reduceMotion]);

  const animatedProps = useAnimatedProps(() => {
    const strokeDashoffset = interpolate(progress.value, [0, 1], [circumference, 0]);
    return {
      strokeDashoffset,
    };
  });

  return (
    <View style={styles.miniRingContainer} testID="home.progress.miniRing">
      <Svg width={size} height={size} style={styles.miniRingSvg}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={theme.colors.line}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={theme.colors.primary}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          animatedProps={animatedProps}
          strokeLinecap="round"
        />
      </Svg>
      <View style={styles.miniRingTextContainer}>
        <Text style={styles.miniRingText}>{Math.round(percent * 100)}%</Text>
      </View>
    </View>
  );
});

MiniRing.displayName = 'MiniRing';

// Animated Number Component - Optimized without unnecessary SharedValue
const AnimatedNumber = memo(({ value, style }: { value: number; style?: TextStyle }) => {
  const [displayValue, setDisplayValue] = React.useState(value);
  const isMountedRef = React.useRef(true);

  useEffect(() => {
    // Update immediately if it's a new mount
    setDisplayValue(value);

    // Animate to final value
    const timeout = setTimeout(() => {
      if (isMountedRef.current) {
        setDisplayValue(value);
      }
    }, ANIMATION_CONFIG.DURATION);

    return () => {
      clearTimeout(timeout);
    };
  }, [value]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Clamp negative values to 0
  const displayNumber = Math.max(0, Math.round(displayValue));
  return (
    <Text style={style} accessibilityLiveRegion="polite" accessibilityRole="text">
      {displayNumber}
    </Text>
  );
});

AnimatedNumber.displayName = 'AnimatedNumber';

// Main Component
export const ProgressTrackerCard = memo((props: ProgressTrackerProps) => {
  const {
    streakDays,
    goalMinutesPerDay,
    minutesToday,
    percentReviewed,
    freedTodayBytes,
    spaceReadyBytes,
    goalSchedule,
    daysWithActivity,
    onAdjustGoal,
  } = props;

  const { t, i18n } = useTranslation();
  const weekDayLabels = useMemo(() => getWeekDayLabels(i18n.language), [i18n.language]);

  // Get current day index using cached utility (avoids Date creation)
  const currentDayIndex = getCurrentDayIndex();

  // Pre-calculate activity states for all week days in one pass
  // This avoids calling hasActivityOnDay multiple times during render
  const weekActivityMap = useMemo(
    () => createWeekActivityMap(daysWithActivity),
    [daysWithActivity]
  );

  // Progress bar animation with spring for natural feel
  const progressWidth = useSharedValue(0);
  const reduceMotion = useReducedMotion();
  // Clamp progress to 0-1 range for display
  const goalProgress = goalMinutesPerDay > 0 ? Math.min(minutesToday / goalMinutesPerDay, 1) : 0;

  useEffect(() => {
    if (reduceMotion) {
      progressWidth.value = goalProgress;
    } else {
      progressWidth.value = withSpring(goalProgress, {
        damping: 20,
        stiffness: 90,
        overshootClamping: true,
      });
    }

    // Cleanup animation on unmount
    return () => {
      cancelAnimation(progressWidth);
    };
  }, [goalProgress, progressWidth, reduceMotion]);

  const progressBarStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value * 100}%`,
  }));

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      style={styles.container}
      testID="home.progress.card"
    >
      {/* Top Row: Title + Streak */}
      <View style={styles.topRow}>
        <View style={styles.streakSection}>
          <Text style={styles.title}>{t('home.racha', 'Racha')}</Text>
          <Svg width={60} height={34} style={styles.gradientTextSvg}>
            <Defs>
              <LinearGradient id="streakGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <Stop offset="0%" stopColor={theme.colors.primary} />
                <Stop
                  offset="100%"
                  stopColor={theme.colors.primaryMuted || theme.colors.primary}
                  stopOpacity="0.6"
                />
              </LinearGradient>
            </Defs>
            <SvgText x="0" y="26" fontSize="28" fontWeight="600" fill="url(#streakGradient)">
              <TSpan>{Math.max(0, Math.round(streakDays))}</TSpan>
            </SvgText>
          </Svg>
        </View>
        <Pressable
          onPress={onAdjustGoal}
          style={styles.adjustButton}
          accessibilityRole="button"
          accessibilityLabel={t('home.ajustarMeta', 'Ajustar meta')}
        >
          <Text style={styles.adjustButtonText}>{t('home.ajustarMeta', 'Ajustar meta')}</Text>
        </Pressable>
      </View>

      {/* Weekly Dots */}
      <View style={styles.weeklyDots}>
        {weekDayLabels.map((label, index) => (
          <WeeklyDot
            key={index}
            dayLabel={label}
            dayIndex={index}
            isGoalDay={goalSchedule[index]}
            hasActivity={weekActivityMap.get(index) || false}
            isCurrentDay={index === currentDayIndex}
            index={index}
          />
        ))}
      </View>

      {/* Goal Meter */}
      <View style={styles.goalMeter}>
        <Text style={styles.goalText}>
          {minutesToday}/{goalMinutesPerDay} {t('streak.pills.minPerDay', 'min/day')}
        </Text>
        <View style={styles.progressBarContainer} testID="home.progress.goal">
          <View style={styles.progressBarTrack} />
          <Animated.View style={[styles.progressBarFill, progressBarStyle]} />
        </View>
      </View>

      {/* Bottom Stats */}
      <View style={styles.statsRow}>
        <Animated.View entering={FadeInUp.delay(100).duration(400)} style={styles.statChip}>
          <MiniRing percent={percentReviewed} />
        </Animated.View>
        <Animated.View entering={FadeInUp.delay(200).duration(400)} style={styles.statChip}>
          <Text style={styles.statValue}>{formatBytes(freedTodayBytes, i18n.language)}</Text>
          <Text style={styles.statLabel}>{t('home.hoy', 'Hoy')}</Text>
        </Animated.View>
        <Animated.View entering={FadeInUp.delay(300).duration(400)} style={styles.statChip}>
          <Text style={styles.statValue}>{formatBytes(spaceReadyBytes, i18n.language)}</Text>
          <Text style={styles.statLabel}>{t('home.listos', 'Listos')}</Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
});

ProgressTrackerCard.displayName = 'ProgressTrackerCard';

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
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  streakNumber: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '600',
    color: theme.colors.primary,
    opacity: 0,
  },
  gradientTextSvg: {
    marginLeft: 8,
  },
  adjustButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  adjustButtonText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    opacity: 0.8,
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
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  dotFilled: {
    backgroundColor: 'rgba(255, 122, 26, 0.24)',
  },
  dotOutlined: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: theme.colors.line,
  },
  dotDim: {
    backgroundColor: theme.colors.surface,
  },
  dotCurrent: {
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  dotLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  goalMeter: {
    marginBottom: 16,
  },
  goalText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: theme.colors.line,
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  progressBarTrack: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.line,
  },
  progressBarFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: theme.colors.primary,
    borderRadius: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  statValue: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  miniRingContainer: {
    width: 26,
    height: 26,
    position: 'relative',
  },
  miniRingSvg: {
    transform: [{ rotate: '-90deg' }],
  },
  miniRingTextContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniRingText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
});

export default ProgressTrackerCard;
