import React, { memo } from 'react';
import { View, Text, Pressable, Image, FlatList, Dimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  FadeIn,
} from 'react-native-reanimated';
import { Filter } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
interface Asset {
  id: string;
  uri: string;
  modificationTime: number;
}

interface SortingGridProps {
  assets: Asset[];
  totalCount: number;
  onAssetPress?: (asset: Asset) => void;
  onFilterPress?: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_PADDING = 16;
const GRID_SPACING = 2;
const COLUMNS = 3;
const ITEM_SIZE = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_SPACING * (COLUMNS - 1)) / COLUMNS;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const GridItem = memo(
  ({ asset, index, onPress }: { asset: Asset; index: number; onPress?: () => void }) => {
    const { t } = useTranslation();
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));

    const handlePressIn = () => {
      scale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
    };

    const handlePressOut = () => {
      scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    };

    const formatDate = (timestamp: number) => {
      const date = new Date(timestamp);
      const monthKeys = [
        'home.months.ene',
        'home.months.feb',
        'home.months.mar',
        'home.months.abr',
        'home.months.may',
        'home.months.jun',
        'home.months.jul',
        'home.months.ago',
        'home.months.sep',
        'home.months.oct',
        'home.months.nov',
        'home.months.dic',
      ];
      return {
        month: t(monthKeys[date.getMonth()]),
        day: date.getDate(),
      };
    };

    const dateInfo = formatDate(asset.modificationTime);

    return (
      <Animated.View
        entering={FadeIn.delay(index * 30).springify()}
        style={{ width: ITEM_SIZE, height: ITEM_SIZE * 1.3 }}
        className="p-0.5"
      >
        <AnimatedPressable
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={animatedStyle}
          className="flex-1 bg-dark-400 rounded-xl overflow-hidden"
          testID={`gridItem_${asset.id}`}
        >
          <Image source={{ uri: asset.uri }} className="w-full flex-1" resizeMode="cover" />
          <View className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
            <Text className="text-white text-xs font-semibold">{dateInfo.month}</Text>
            <Text className="text-white/80 text-xs">{dateInfo.day}</Text>
          </View>
        </AnimatedPressable>
      </Animated.View>
    );
  }
);

GridItem.displayName = 'GridItem';

export const SortingGrid = memo(
  ({ assets, totalCount, onAssetPress, onFilterPress }: SortingGridProps) => {
    const { t } = useTranslation();
    const filterScale = useSharedValue(1);

    const filterAnimatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: filterScale.value }],
    }));

    const handleFilterPressIn = () => {
      filterScale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
    };

    const handleFilterPressOut = () => {
      filterScale.value = withSpring(1, { damping: 15, stiffness: 300 });
    };

    return (
      <View className="px-4">
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center">
            <Text className="text-white text-lg font-semibold">{t('sorting.title')}</Text>
            <Text className="text-gray-400 text-lg ml-2">{totalCount}</Text>
          </View>

          <AnimatedPressable
            onPress={onFilterPress}
            onPressIn={handleFilterPressIn}
            onPressOut={handleFilterPressOut}
            style={filterAnimatedStyle}
            className="bg-dark-400 rounded-xl p-2"
            testID="sortingGrid_filter"
          >
            <Filter size={20} color="#9CA3AF" />
          </AnimatedPressable>
        </View>

        <FlatList
          data={assets}
          renderItem={({ item, index }) => (
            <GridItem asset={item} index={index} onPress={() => onAssetPress?.(item)} />
          )}
          keyExtractor={(item) => item.id}
          numColumns={COLUMNS}
          scrollEnabled={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      </View>
    );
  }
);

SortingGrid.displayName = 'SortingGrid';
