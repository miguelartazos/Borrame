/**
 * CategoryTilesGrid Component
 * 2-row, 4-column grid of category tiles with paywall integration
 */

import React, { memo, useCallback, useState, useMemo, lazy, Suspense } from 'react';
import { View, FlatList, StyleSheet, useWindowDimensions, ActivityIndicator } from 'react-native';
import Animated, { FadeInDown, useSharedValue } from 'react-native-reanimated';
import {
  Image,
  FileText,
  Camera,
  Zap,
  MessageCircle,
  Video,
  HardDrive,
  Receipt,
} from 'lucide-react-native';
import { CategoryTile } from './CategoryTile';
import { theme } from '../../ui';
import type { ReactNode } from 'react';

export interface CategoryBundle {
  key: string;
  title: string;
  icon: ReactNode;
  count: number;
  locked: boolean;
}

interface CategoryTilesGridProps {
  bundles: CategoryBundle[];
  onCategoryPress?: (key: string) => void;
  showPaywallPreview?: boolean;
}

// Pre-computed icon map for performance
const ICON_PROPS = { size: 28, color: theme.colors.primary } as const;
const ICON_MAP: Record<string, ReactNode> = {
  duplicates: <Image {...ICON_PROPS} />,
  blurry: <Image {...ICON_PROPS} style={{ opacity: 0.5 }} />,
  screenshots: <Camera {...ICON_PROPS} />,
  burst: <Zap {...ICON_PROPS} />,
  whatsapp: <MessageCircle {...ICON_PROPS} />,
  long_videos: <Video {...ICON_PROPS} />,
  large_files: <HardDrive {...ICON_PROPS} />,
  documents: <Receipt {...ICON_PROPS} />,
};

const getIconForCategory = (key: string): ReactNode => {
  return ICON_MAP[key] || <FileText {...ICON_PROPS} />;
};

// Lazy load PaywallSheet to reduce initial bundle size
const PaywallSheet = lazy(() => import('../../features/paywall/PaywallSheet'));

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList<CategoryBundle>);

const GRID_CONFIG = {
  COLUMNS: 4,
  HORIZONTAL_PADDING: 32,
  STAGGER_DELAY: 50,
} as const;

// Loading placeholder for PaywallSheet
const PaywallSkeleton = () => (
  <View style={styles.skeletonContainer}>
    <ActivityIndicator size="large" color={theme.colors.primary} />
  </View>
);

export const CategoryTilesGrid = memo(
  ({ bundles, onCategoryPress, showPaywallPreview = true }: CategoryTilesGridProps) => {
    const [paywallVisible, setPaywallVisible] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    // Single animation controller for all tiles
    const pressedTileId = useSharedValue<string | null>(null);

    // Use responsive dimensions hook
    const { width: screenWidth } = useWindowDimensions();
    const tileWidth = useMemo(
      () => (screenWidth - GRID_CONFIG.HORIZONTAL_PADDING) / GRID_CONFIG.COLUMNS,
      [screenWidth]
    );

    // Enhance bundles with icons if not provided
    const enhancedBundles = useMemo(
      () =>
        bundles.map((bundle) => ({
          ...bundle,
          icon: bundle.icon || getIconForCategory(bundle.key),
        })),
      [bundles]
    );

    const handleTilePress = useCallback(
      (key: string) => {
        const bundle = enhancedBundles.find((b) => b.key === key);

        if (bundle?.locked && showPaywallPreview) {
          setSelectedCategory(key);
          setPaywallVisible(true);
        } else {
          onCategoryPress?.(key);
        }
      },
      [enhancedBundles, showPaywallPreview, onCategoryPress]
    );

    const renderTile = useCallback(
      ({ item, index }: { item: CategoryBundle; index: number }) => (
        <Animated.View
          entering={FadeInDown.delay(index * GRID_CONFIG.STAGGER_DELAY).springify()}
          style={{ width: tileWidth }}
        >
          <CategoryTile
            id={item.key}
            title={item.title}
            icon={item.icon}
            count={item.count}
            locked={item.locked}
            onPress={handleTilePress}
            testID={`category-tile-${item.key}`}
            pressedTileId={pressedTileId}
          />
        </Animated.View>
      ),
      [tileWidth, handleTilePress, pressedTileId]
    );

    const keyExtractor = useCallback((item: CategoryBundle) => item.key, []);

    return (
      <>
        <View style={styles.container}>
          <AnimatedFlatList
            data={enhancedBundles}
            renderItem={renderTile}
            keyExtractor={keyExtractor}
            numColumns={GRID_CONFIG.COLUMNS}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.gridContent}
            columnWrapperStyle={styles.row}
            initialNumToRender={enhancedBundles.length}
            maxToRenderPerBatch={enhancedBundles.length}
            updateCellsBatchingPeriod={50}
            removeClippedSubviews={false}
          />
        </View>

        {showPaywallPreview && paywallVisible && (
          <Suspense fallback={<PaywallSkeleton />}>
            <PaywallSheet
              visible={paywallVisible}
              onClose={() => {
                setPaywallVisible(false);
                setSelectedCategory(null);
              }}
              triggerPoint={`category_tile_${selectedCategory}`}
              bundleKey={selectedCategory || undefined}
              previewItems={
                selectedCategory
                  ? Array.from({ length: 6 }, (_, i) => ({
                      id: `preview-${selectedCategory}-${i}`,
                      uri: `https://picsum.photos/seed/${selectedCategory}-${i}/200`,
                    }))
                  : []
              }
            />
          </Suspense>
        )}
      </>
    );
  }
);

CategoryTilesGrid.displayName = 'CategoryTilesGrid';

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  gridContent: {
    paddingVertical: 8,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  skeletonContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
});

export default CategoryTilesGrid;
