import React, { memo, useState, useCallback, useMemo } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import {
  Star,
  Copy,
  ImageOff,
  Camera,
  Zap,
  MessageCircle,
  Video,
  HardDrive,
  FileText,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSettings } from '../../store/useSettings';
import { PaywallSheet } from '../../features/paywall/PaywallSheet';
import { useTranslation } from 'react-i18next';
import { formatCount } from '../../lib/formatters';
import type { CategoryBundle } from './CategoryTilesGrid';
import { isBundleKey } from '../../features/bundles/bundleQueries';

interface SmartBundlesGridProps {
  bundles?: CategoryBundle[];
  onBundlePress?: (bundleId?: string) => void;
  testID?: string;
}

// Icon props
const ICON_SIZE = 24;
const ICON_COLOR = '#FF7A1A';

// Bundle configuration keys
type BundleKey =
  | 'duplicados'
  | 'borrosas'
  | 'pantallazos'
  | 'rafaga'
  | 'whatsapp'
  | 'videos_largos'
  | 'archivos_grandes'
  | 'recibos';

// Bundle configuration
const BUNDLE_CONFIGS: Array<{ key: BundleKey; locked: boolean }> = [
  { key: 'duplicados', locked: true },
  { key: 'borrosas', locked: false },
  { key: 'pantallazos', locked: false },
  { key: 'rafaga', locked: false },
  { key: 'whatsapp', locked: false },
  { key: 'videos_largos', locked: false },
  { key: 'archivos_grandes', locked: false },
  { key: 'recibos', locked: false },
];

// Get icon for bundle key
const getBundleIcon = (key: BundleKey): React.ReactNode => {
  switch (key) {
    case 'duplicados':
      return <Copy size={ICON_SIZE} color={ICON_COLOR} />;
    case 'borrosas':
      return <ImageOff size={ICON_SIZE} color={ICON_COLOR} />;
    case 'pantallazos':
      return <Camera size={ICON_SIZE} color={ICON_COLOR} />;
    case 'rafaga':
      return <Zap size={ICON_SIZE} color={ICON_COLOR} />;
    case 'whatsapp':
      return <MessageCircle size={ICON_SIZE} color={ICON_COLOR} />;
    case 'videos_largos':
      return <Video size={ICON_SIZE} color={ICON_COLOR} />;
    case 'archivos_grandes':
      return <HardDrive size={ICON_SIZE} color={ICON_COLOR} />;
    case 'recibos':
      return <FileText size={ICON_SIZE} color={ICON_COLOR} />;
  }
};

export const SmartBundlesGrid = memo<SmartBundlesGridProps>(
  ({ bundles, onBundlePress, testID }) => {
    const { t } = useTranslation();
    const hapticFeedback = useSettings((s) => s.hapticFeedback);
    const [paywallVisible, setPaywallVisible] = useState(false);
    const [selectedBundleKey, setSelectedBundleKey] = useState<string | null>(null);

    // Build default bundles with i18n titles - memoized to prevent recreations
    const defaultBundles = useMemo<CategoryBundle[]>(
      () =>
        BUNDLE_CONFIGS.map((config) => ({
          key: config.key,
          title: t(`bundles.${config.key}`),
          count: 0,
          locked: config.locked,
          icon: getBundleIcon(config.key),
        })),
      [t]
    );

    // Merge provided bundles with default bundles for i18n and icons
    const displayBundles = useMemo(() => {
      if (!bundles || bundles.length === 0) {
        return defaultBundles;
      }

      // Merge real counts with i18n titles and icons
      return bundles.map((bundle) => {
        // Validate bundle key at runtime for safety
        const validKey = isBundleKey(bundle.key) ? bundle.key : 'pantallazos';
        return {
          ...bundle,
          title: bundle.title || t(`bundles.${bundle.key}`),
          icon: bundle.icon || getBundleIcon(validKey),
        };
      });
    }, [bundles, defaultBundles, t]);

    const handleBundlePress = useCallback(
      (bundle: CategoryBundle) => {
        if (hapticFeedback) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        }

        if (bundle.locked) {
          setSelectedBundleKey(bundle.key);
          setPaywallVisible(true);
        } else {
          onBundlePress?.(bundle.key);
        }
      },
      [hapticFeedback, onBundlePress]
    );

    const renderBundle = ({ item }: { item: CategoryBundle }) => (
      <Pressable
        onPress={() => handleBundlePress(item)}
        style={styles.tile}
        testID={`home.bundle.${item.key}`}
        accessibilityRole="button"
        accessibilityLabel={t(item.locked ? 'bundles.tile_locked' : 'bundles.tile_unlocked', {
          title: item.title,
          count: item.count,
        })}
      >
        <View style={styles.tileContent}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            {typeof item.icon === 'string' ? (
              <Text style={styles.emojiIcon}>{item.icon}</Text>
            ) : (
              item.icon || getBundleIcon(item.key as BundleKey)
            )}
          </View>

          {/* Title */}
          <Text style={styles.title} numberOfLines={1}>
            {item.title}
          </Text>

          {/* Count */}
          <Text style={styles.count}>{formatCount(item.count)}</Text>

          {/* Locked overlay with Pro badge */}
          {item.locked && (
            <>
              <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFillObject} />
              <View style={styles.proBadge}>
                <Star size={10} color="#FFD700" fill="#FFD700" />
                <Text style={styles.proText}>{t('bundles.pro_badge')}</Text>
              </View>
            </>
          )}
        </View>
      </Pressable>
    );

    return (
      <>
        <View style={styles.container} testID={testID}>
          <Text style={styles.sectionTitle} testID={`${testID}_title`}>
            {t('bundles.title')}
          </Text>

          <FlatList
            data={displayBundles}
            renderItem={renderBundle}
            keyExtractor={(item) => item.key}
            numColumns={2}
            scrollEnabled={false}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.grid}
            initialNumToRender={8}
            maxToRenderPerBatch={8}
            windowSize={1}
            removeClippedSubviews={false}
          />
        </View>

        <PaywallSheet
          visible={paywallVisible}
          onClose={() => {
            setPaywallVisible(false);
            setSelectedBundleKey(null);
          }}
          triggerPoint="smart_bundle"
          bundleKey={selectedBundleKey || undefined}
        />
      </>
    );
  }
);

SmartBundlesGrid.displayName = 'SmartBundlesGrid';

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  grid: {
    gap: 12,
  },
  row: {
    gap: 12,
  },
  tile: {
    flex: 1,
  },
  tileContent: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 88,
    position: 'relative',
    overflow: 'hidden',
  },
  iconContainer: {
    marginBottom: 8,
  },
  emojiIcon: {
    fontSize: 24,
  },
  title: {
    fontSize: 13,
    fontWeight: '500',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  count: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
  },
  proBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
  },
  proText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#FFD700',
  },
});
