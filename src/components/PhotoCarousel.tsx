import React, { memo, useRef } from 'react';
import { View, Text, ScrollView, Pressable, Image, Dimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolate,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
interface Asset {
  id: string;
  uri: string;
}

interface PhotoGroup {
  date: string;
  label: string;
  count: number;
  assets: Asset[];
}

interface PhotoCarouselProps {
  photoGroups: PhotoGroup[];
  onGroupPress?: (group: PhotoGroup) => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.7;
const CARD_SPACING = 12;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const PhotoGroupCard = memo(({ group, onPress }: { group: PhotoGroup; onPress?: () => void }) => {
  const { t } = useTranslation();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const previewAssets = group.assets.slice(0, 6);
  const moreCount = group.count - 6;

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[animatedStyle, { width: CARD_WIDTH }]}
      className="bg-dark-400 rounded-2xl overflow-hidden mr-3"
      testID={`photoGroup_${group.date}`}
    >
      <View className="h-48">
        <View className="flex-row flex-wrap h-full">
          {previewAssets.map((asset, index) => (
            <View key={asset.id} className={`${index < 2 ? 'w-1/2 h-1/2' : 'w-1/3 h-1/2'} p-0.5`}>
              <Image source={{ uri: asset.uri }} className="w-full h-full" resizeMode="cover" />
            </View>
          ))}
          {moreCount > 0 && (
            <View className="absolute bottom-2 right-2 bg-black/60 rounded-full px-2 py-1">
              <Text className="text-white text-xs font-semibold">+{moreCount}</Text>
            </View>
          )}
        </View>
      </View>

      <View className="p-3 bg-dark-500">
        <Text className="text-white text-lg font-semibold">{group.label}</Text>
        <Text className="text-gray-400 text-sm">
          {group.count} {t('onThisDay.photos')}
        </Text>
      </View>
    </AnimatedPressable>
  );
});

PhotoGroupCard.displayName = 'PhotoGroupCard';

export const PhotoCarousel = memo(({ photoGroups, onGroupPress }: PhotoCarouselProps) => {
  const { t } = useTranslation();
  const scrollRef = useRef<ScrollView>(null);
  const scrollX = useSharedValue(0);

  if (photoGroups.length === 0) {
    return (
      <View className="px-4 mb-6">
        <Text className="text-white text-lg font-semibold mb-3">{t('carousel.onThisDay')}</Text>
        <View className="bg-dark-400 rounded-2xl p-8 items-center">
          <Text className="text-gray-500">{t('carousel.noPhotos')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View className="mb-6">
      <View className="px-4 mb-3">
        <Text className="text-white text-lg font-semibold">{t('carousel.onThisDay')}</Text>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={CARD_WIDTH + CARD_SPACING}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        onScroll={(e) => {
          scrollX.value = e.nativeEvent.contentOffset.x;
        }}
        scrollEventThrottle={16}
      >
        {photoGroups.map((group) => (
          <PhotoGroupCard key={group.date} group={group} onPress={() => onGroupPress?.(group)} />
        ))}
      </ScrollView>

      <View className="flex-row justify-center mt-3 px-4">
        {photoGroups.map((_, index) => {
          const inputRange = [
            (index - 1) * (CARD_WIDTH + CARD_SPACING),
            index * (CARD_WIDTH + CARD_SPACING),
            (index + 1) * (CARD_WIDTH + CARD_SPACING),
          ];

          const dotScale = interpolate(scrollX.value, inputRange, [0.6, 1, 0.6], 'clamp');

          return (
            <View
              key={index}
              className="w-2 h-2 rounded-full bg-dark-600 mx-1"
              style={{
                transform: [{ scale: dotScale }],
                backgroundColor: dotScale > 0.8 ? '#FF7A1A' : '#404040',
              }}
            />
          );
        })}
      </View>
    </View>
  );
});

PhotoCarousel.displayName = 'PhotoCarousel';
