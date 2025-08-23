import React, { memo, useEffect, useState, useMemo } from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withDelay,
  interpolate,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { useGoalStore, useCurrentStreak, useTodayProgress } from '../../store/useGoalStore';
import { useSettings } from '../../store/useSettings';
import { StreakModal } from '../StreakModal';
import { formatBytes } from '../../lib/formatters';

interface StreakPillsProps {
  testID?: string;
}

// Optimized selectors to reduce re-renders
const useStreakData = () => {
  const currentStreak = useCurrentStreak();
  const { minutes, freedMB } = useTodayProgress();
  const minutesPerDay = useGoalStore((s) => s.minutesPerDay);

  return useMemo(
    () => ({ currentStreak, minutes, freedMB, minutesPerDay }),
    [currentStreak, minutes, freedMB, minutesPerDay]
  );
};

export const StreakPills = memo<StreakPillsProps>(({ testID }) => {
  const { t } = useTranslation();
  const hapticFeedback = useSettings((s) => s.hapticFeedback);
  const { currentStreak, minutes, freedMB, minutesPerDay } = useStreakData();
  const [modalVisible, setModalVisible] = useState(false);

  const fadeAnimation = useSharedValue(0);
  const scaleAnimation = useSharedValue(0.95);

  useEffect(() => {
    fadeAnimation.value = withDelay(100, withSpring(1, { damping: 15 }));
    scaleAnimation.value = withDelay(150, withSpring(1, { damping: 15 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animatedContainerStyle = useAnimatedStyle(() => ({
    opacity: fadeAnimation.value,
    transform: [
      { scale: scaleAnimation.value },
      { translateY: interpolate(fadeAnimation.value, [0, 1], [10, 0]) },
    ],
  }));

  const handlePress = () => {
    if (hapticFeedback) {
      try {
        Haptics.selectionAsync();
      } catch {
        // Haptics failure is non-critical, continue silently
      }
    }
    setModalVisible(true);
  };

  const accessibilityLabel = useMemo(
    () =>
      // freedMB comes from store in megabytes, formatBytes expects bytes
      `${t('home.racha')} ${currentStreak}, ${t('home.meta')} ${minutes} de ${minutesPerDay} minutos por día, ${t('home.hoy')} ${formatBytes(freedMB * 1024 * 1024)} liberados`,
    [currentStreak, minutes, minutesPerDay, freedMB, t]
  );

  return (
    <>
      <Animated.View style={animatedContainerStyle} className="px-3 mb-3" testID={testID}>
        <Pressable
          onPress={handlePress}
          testID={`${testID}_pressable`}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          accessibilityHint={t('streak.modal.title')}
          className="min-h-[44px]"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <View className="bg-dark-400 px-3 py-2.5 flex-row items-center justify-center rounded-2xl min-h-[44px]">
            <Text className="text-white text-sm text-center" numberOfLines={1}>
              <Text>🔥 </Text>
              <Text className="font-medium">{t('home.racha')}</Text>
              <Text> {currentStreak}</Text>
              <Text className="text-gray-500"> · </Text>
              <Text>🎯 </Text>
              <Text>
                {minutesPerDay}
                {t('streak.pills.perDay')}
              </Text>
              <Text className="text-gray-500"> · </Text>
              <Text>🗑️ </Text>
              <Text className="font-medium">{t('home.hoy')}</Text>
              {/* freedMB from store is in MB, formatBytes expects bytes */}
              <Text> {formatBytes(freedMB * 1024 * 1024)}</Text>
            </Text>
          </View>
        </Pressable>
      </Animated.View>

      <StreakModal visible={modalVisible} onClose={() => setModalVisible(false)} />
    </>
  );
});

StreakPills.displayName = 'StreakPills';
