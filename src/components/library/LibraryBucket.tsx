import React, { memo } from 'react';
import { View, Text, Pressable, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MonthBucket } from '../../features/library/selectors';

interface LibraryBucketProps {
  bucket: MonthBucket;
  onPress?: () => void;
  onLongPress?: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_MARGIN = 16;
const CARD_HEIGHT = 240;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Animation constants
const ANIMATION_CONFIG = {
  PRESS_SCALE: 0.97,
  SPRING: { damping: 15, stiffness: 300 },
} as const;

export const LibraryBucket = memo(({ bucket, onPress, onLongPress }: LibraryBucketProps) => {
  const scale = useSharedValue(1);
  const insets = useSafeAreaInsets();

  // Calculate card width accounting for safe areas
  const CARD_WIDTH = SCREEN_WIDTH - CARD_MARGIN * 2 - insets.left - insets.right;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(ANIMATION_CONFIG.PRESS_SCALE, ANIMATION_CONFIG.SPRING);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, ANIMATION_CONFIG.SPRING);
  };

  // Format count with thousands separator
  const formattedCount = new Intl.NumberFormat('es-ES').format(bucket.count);

  // Get preview assets (first 6)
  const previewAssets = bucket.assets.slice(0, 6);
  const emptySlots = 6 - previewAssets.length;

  return (
    <AnimatedPressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[animatedStyle]}
      className="mx-4 mb-4"
      testID={`libraryBucket_${bucket.monthKey}`}
    >
      <View className="bg-dark-400 rounded-3xl overflow-hidden" style={{ height: CARD_HEIGHT }}>
        {/* Photo Grid */}
        <View className="flex-1 flex-row flex-wrap">
          {previewAssets.map((asset, index) => (
            <View
              key={asset.id}
              className="p-0.5"
              style={{
                width: CARD_WIDTH / 3,
                height: (CARD_HEIGHT - 60) / 2, // Subtract bottom section height
              }}
            >
              <Image
                source={{ uri: asset.uri }}
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: index === 0 ? 20 : 0, // Top-left corner rounded
                }}
                contentFit="cover"
                transition={200}
                cachePolicy="memory-disk"
                recyclingKey={asset.id}
              />
            </View>
          ))}
          {/* Empty slots if less than 6 photos */}
          {Array.from({ length: emptySlots }).map((_, index) => (
            <View
              key={`empty-${index}`}
              className="p-0.5"
              style={{
                width: CARD_WIDTH / 3,
                height: (CARD_HEIGHT - 60) / 2,
              }}
            >
              <View className="w-full h-full bg-dark-600" />
            </View>
          ))}
        </View>

        {/* Bottom Section with Month and Count */}
        <View className="absolute bottom-0 left-0 right-0 bg-dark-500/95 backdrop-blur-sm px-5 py-4">
          <View className="flex-row items-baseline justify-between">
            <Text className="text-2xl font-bold text-white">{bucket.label}</Text>
            <Text className="text-lg text-primary font-semibold">({formattedCount})</Text>
          </View>
        </View>
      </View>
    </AnimatedPressable>
  );
});

LibraryBucket.displayName = 'LibraryBucket';
