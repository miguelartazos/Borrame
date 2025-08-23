import React, { memo, useEffect } from 'react';
import { View, Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withDelay,
  interpolate,
} from 'react-native-reanimated';
import { Trash2, FolderOpen } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { formatSpace } from '../lib/formatters';

interface StatsRowProps {
  sortedPercentage: number;
  spaceToClear: number;
}

export const StatsRow = memo(({ sortedPercentage, spaceToClear }: StatsRowProps) => {
  const { t } = useTranslation();
  const progressAnimation = useSharedValue(0);
  const fadeAnimation = useSharedValue(0);

  useEffect(() => {
    fadeAnimation.value = withDelay(100, withSpring(1, { damping: 15 }));
    progressAnimation.value = withDelay(
      200,
      withSpring(sortedPercentage, {
        damping: 15,
        stiffness: 100,
      })
    );
  }, [sortedPercentage, fadeAnimation, progressAnimation]);

  const animatedProgressStyle = useAnimatedStyle(() => ({
    width: `${progressAnimation.value}%`,
  }));

  const animatedContainerStyle = useAnimatedStyle(() => ({
    opacity: fadeAnimation.value,
    transform: [
      {
        translateY: interpolate(fadeAnimation.value, [0, 1], [20, 0]),
      },
    ],
  }));

  return (
    <Animated.View style={animatedContainerStyle} className="px-4 mb-4">
      <View className="flex-row justify-between">
        <View className="flex-1 mr-2">
          <View className="bg-dark-400 rounded-xl p-3">
            <View className="flex-row items-center mb-2">
              <View className="w-8 h-8 bg-dark-500 rounded-full items-center justify-center mr-2">
                <FolderOpen size={16} color="#9CA3AF" />
              </View>
              <View className="flex-1">
                <Text className="text-white text-lg font-semibold">{sortedPercentage}%</Text>
                <Text className="text-gray-500 text-xs">{t('stats.sorted')}</Text>
              </View>
            </View>
            <View className="h-1 bg-dark-500 rounded-full overflow-hidden">
              <Animated.View
                style={animatedProgressStyle}
                className="h-full bg-orange-500 rounded-full"
              />
            </View>
          </View>
        </View>

        <View className="flex-1 ml-2">
          <View className="bg-dark-400 rounded-xl p-3">
            <View className="flex-row items-center mb-2">
              <View className="w-8 h-8 bg-dark-500 rounded-full items-center justify-center mr-2">
                <Trash2 size={16} color="#9CA3AF" />
              </View>
              <View className="flex-1">
                <Text className="text-white text-lg font-semibold">
                  {formatSpace(spaceToClear)}
                </Text>
                <Text className="text-gray-500 text-xs">{t('stats.toDelete')}</Text>
              </View>
            </View>
            <View className="h-1 bg-dark-500 rounded-full" />
          </View>
        </View>
      </View>
    </Animated.View>
  );
});

StatsRow.displayName = 'StatsRow';
