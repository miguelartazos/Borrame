import React, { memo } from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { ChevronRight } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../ui';

interface StreakCardProps {
  currentStreak: number;
  onPressGoal?: () => void;
}

const DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

export const StreakCard = memo(({ currentStreak, onPressGoal }: StreakCardProps) => {
  const { t } = useTranslation();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const today = new Date().getDay();
  const mondayFirst = today === 0 ? 6 : today - 1;

  return (
    <View className="px-lg mb-lg">
      <Animated.View style={animatedStyle} className="bg-card rounded-lg p-lg">
        <View className="flex-row items-center justify-between mb-md">
          <View>
            <Text className="text-text-secondary text-caption mb-xs">{t('streak.current')}</Text>
            <View className="flex-row items-baseline">
              <Text className="text-text-primary text-display font-semibold">{currentStreak}</Text>
              <Text className="text-text-secondary text-body ml-sm">{t('streak.days')}</Text>
            </View>
          </View>

          <Pressable
            onPress={onPressGoal}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            className="bg-surface rounded-md px-md py-sm flex-row items-center"
            testID="streakCard_setGoal"
          >
            <Text className="text-primary text-caption font-semibold mr-xs">
              {t('streak.setGoal')}
            </Text>
            <ChevronRight size={16} color={colors.primary} />
          </Pressable>
        </View>

        <View className="flex-row justify-between">
          {DAYS.map((day, index) => {
            const isActive = index === mondayFirst;
            const isPast = index < mondayFirst;

            return (
              <View
                key={index}
                className={`w-10 h-10 rounded-full items-center justify-center ${
                  isActive ? 'bg-primary' : isPast ? 'bg-surface' : 'bg-surface opacity-50'
                }`}
                testID={`streakCard_day_${index}`}
              >
                <Text
                  className={`text-caption font-semibold ${
                    isActive ? 'text-white' : 'text-text-secondary'
                  }`}
                >
                  {day}
                </Text>
              </View>
            );
          })}
        </View>
      </Animated.View>
    </View>
  );
});

StreakCard.displayName = 'StreakCard';
