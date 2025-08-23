import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  interpolate,
  useAnimatedStyle,
  SharedValue,
  Extrapolation,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { getLocales } from 'expo-localization';
import { SWIPE_THRESHOLDS } from '../features/deck/constants';
import { formatBytes, formatDate } from '../lib/formatters';
import type { Asset } from '../db/schema';

interface PhotoCardProps {
  asset: Asset;
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
  isTop: boolean;
}

export const PhotoCard = memo(({ asset, translateX, translateY, isTop }: PhotoCardProps) => {
  const { t } = useTranslation();
  const locale = getLocales()[0]?.languageCode;

  const cardAnimatedStyle = useAnimatedStyle(() => {
    if (!isTop) return {};

    const rotate = interpolate(translateX.value, [-200, 0, 200], [-8, 0, 8], Extrapolation.CLAMP);

    const scale = interpolate(
      Math.abs(translateX.value),
      [0, SWIPE_THRESHOLDS.TRANSLATE_X],
      [1, SWIPE_THRESHOLDS.SCALE_MIN],
      Extrapolation.CLAMP
    );

    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotate}deg` },
        { scale },
      ],
    };
  });

  const deleteOverlayStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [-SWIPE_THRESHOLDS.TRANSLATE_X, -30],
      [1, 0],
      Extrapolation.CLAMP
    );
    const scale = interpolate(
      translateX.value,
      [-SWIPE_THRESHOLDS.TRANSLATE_X, 0],
      [1, 0.8],
      Extrapolation.CLAMP
    );
    return {
      opacity,
      transform: [{ scale }],
    };
  });

  const keepOverlayStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [30, SWIPE_THRESHOLDS.TRANSLATE_X],
      [0, 1],
      Extrapolation.CLAMP
    );
    const scale = interpolate(
      translateX.value,
      [0, SWIPE_THRESHOLDS.TRANSLATE_X],
      [0.8, 1],
      Extrapolation.CLAMP
    );
    return {
      opacity,
      transform: [{ scale }],
    };
  });

  return (
    <Animated.View style={[styles.card, cardAnimatedStyle]} testID="PhotoCard">
      <Image source={{ uri: asset.uri }} style={styles.image} contentFit="cover" />

      <Animated.View
        style={[styles.overlay, styles.deleteOverlay, deleteOverlayStyle]}
        testID="OverlayDelete"
      >
        <View style={styles.overlayContent}>
          <Text style={[styles.overlayText, styles.deleteText]}>{t('deck.overlayDelete')}</Text>
        </View>
      </Animated.View>

      <Animated.View
        style={[styles.overlay, styles.keepOverlay, keepOverlayStyle]}
        testID="OverlayKeep"
      >
        <View style={styles.overlayContent}>
          <Text style={[styles.overlayText, styles.keepText]}>{t('deck.overlayKeep')}</Text>
        </View>
      </Animated.View>

      <View style={styles.metadataChip}>
        <Text style={styles.metadataText}>
          {formatBytes(asset.size_bytes, locale || undefined)} •{' '}
          {formatDate(asset.created_at, locale || undefined)}
        </Text>
      </View>
    </Animated.View>
  );
});

PhotoCard.displayName = 'PhotoCard';

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    width: '92%',
    aspectRatio: 1,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    backgroundColor: '#fff',
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteOverlay: {
    backgroundColor: 'transparent',
  },
  keepOverlay: {
    backgroundColor: 'transparent',
  },
  overlayContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  overlayText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  deleteText: {
    color: '#000',
  },
  keepText: {
    color: '#000',
  },
  metadataChip: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metadataText: {
    color: '#000',
    fontSize: 13,
    fontWeight: '500',
    opacity: 0.7,
  },
});
