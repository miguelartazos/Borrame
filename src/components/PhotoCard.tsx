import React, { memo } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
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

    const rotate = interpolate(
      translateX.value,
      [-200, 0, 200],
      [-SWIPE_THRESHOLDS.MAX_ROTATION, 0, SWIPE_THRESHOLDS.MAX_ROTATION],
      Extrapolation.CLAMP
    );

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
      [-SWIPE_THRESHOLDS.TRANSLATE_X, 0],
      [1, 0],
      Extrapolation.CLAMP
    );
    return { opacity };
  });

  const keepOverlayStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [0, SWIPE_THRESHOLDS.TRANSLATE_X],
      [0, 1],
      Extrapolation.CLAMP
    );
    return { opacity };
  });

  return (
    <Animated.View style={[styles.card, cardAnimatedStyle]} testID="PhotoCard">
      <Image source={{ uri: asset.uri }} style={styles.image} resizeMode="cover" />

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
    width: '90%',
    aspectRatio: 1,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
    backgroundColor: '#fff',
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteOverlay: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  keepOverlay: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
  },
  overlayContent: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  overlayText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  deleteText: {
    color: '#ef4444',
  },
  keepText: {
    color: '#22c55e',
  },
  metadataChip: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  metadataText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
});
