/**
 * OnThisDayCard Component
 * Shows photos from this day in previous years
 */

import React, { memo, useCallback, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { theme } from '../../ui';
import { testID } from '../../lib/a11y';
import { formatCount } from '../../lib/formatters';

// Types
export interface OnThisDayCardProps {
  count: number;
  previewUris?: string[];
  onPress?: () => void;
  onPressTop5?: () => void;
  month?: number; // 1-12 for month-based testID
}

interface ThumbnailState {
  loading: boolean;
  error: boolean;
}

// Constants
const THUMB_SIZE = 56;
const THUMB_OVERLAP_RATIO = 0.36; // 36% overlap
const THUMB_OVERLAP = Math.round(THUMB_SIZE * THUMB_OVERLAP_RATIO);
const PLACEHOLDER_COLORS = ['#E5E7EB', '#D1D5DB', '#9CA3AF'];
const ANIMATION_DURATION = 200; // Optimized from 300ms

// Pre-computed styles for performance
const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.lg,
    marginHorizontal: theme.spacing.lg,
  },
  gradient: {
    borderRadius: theme.radii.md,
  },
  pressable: {
    paddingVertical: theme.spacing['3xl'], // 32dp for increased height
    paddingHorizontal: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftContent: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  title: {
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
  rightContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  ctaButton: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.md,
  },
  ctaText: {
    fontSize: theme.typography.caption.fontSize,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  thumbnailContainer: {
    width: THUMB_SIZE * 3 - THUMB_OVERLAP * 2,
    height: THUMB_SIZE,
    position: 'relative',
  },
  thumbnail: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    ...theme.shadows.thumbnail,
  },
  thumbnailImage: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
  },
  placeholderThumb: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailLoader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
});

// Thumbnail Component with error handling and loading state
const ThumbnailPreview = memo(({ uri, index }: { uri?: string; index: number }) => {
  const { t } = useTranslation();
  const [state, setState] = useState<ThumbnailState>({ loading: false, error: false });
  const opacity = useSharedValue(0);
  const position = index * (THUMB_SIZE - THUMB_OVERLAP);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const handleLoadStart = useCallback(() => {
    setState({ loading: true, error: false });
  }, []);

  const handleLoadEnd = useCallback(() => {
    setState((prev) => ({ ...prev, loading: false }));
    opacity.value = withTiming(1, { duration: ANIMATION_DURATION });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleError = useCallback(() => {
    setState({ loading: false, error: true });
    opacity.value = withTiming(1, { duration: ANIMATION_DURATION });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View
      style={[
        styles.thumbnail,
        {
          right: position,
          backgroundColor: PLACEHOLDER_COLORS[index],
          zIndex: 3 - index,
        },
      ]}
      testID={`thumbnail_${index}`}
      accessibilityRole="image"
      accessibilityLabel={
        uri
          ? t('onThisDay.previewImage', { number: index + 1 })
          : t('onThisDay.placeholderImage', { number: index + 1 })
      }
      accessibilityState={{ busy: state.loading }}
      accessibilityElementsHidden={state.loading}
    >
      {uri && !state.error ? (
        <>
          <Animated.View style={[{ flex: 1 }, animatedStyle]}>
            <Image
              source={{ uri }}
              style={styles.thumbnailImage}
              contentFit="cover"
              transition={ANIMATION_DURATION}
              onLoadStart={handleLoadStart}
              onLoad={handleLoadEnd}
              onError={handleError}
              testID={`thumbnail_image_${index}`}
            />
          </Animated.View>
          {state.loading && (
            <View style={styles.thumbnailLoader} testID={`thumbnail_loader_${index}`}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
            </View>
          )}
        </>
      ) : (
        <View
          style={[styles.placeholderThumb, { backgroundColor: PLACEHOLDER_COLORS[index] }]}
          accessibilityLabel={
            state.error
              ? t('onThisDay.imageError')
              : t('onThisDay.placeholderImage', { number: index + 1 })
          }
        >
          {state.error && <Text style={{ fontSize: 10, color: '#666' }}>!</Text>}
        </View>
      )}
    </View>
  );
});

ThumbnailPreview.displayName = 'ThumbnailPreview';

// Memoized gradient wrapper for performance
const GradientWrapper = memo(({ children }: { children: React.ReactNode }) => (
  <LinearGradient
    colors={theme.gradients.onThisDay as readonly [string, string, ...string[]]}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
    style={styles.gradient}
  >
    {children}
  </LinearGradient>
));

GradientWrapper.displayName = 'GradientWrapper';

// Main Component
export const OnThisDayCard = memo(
  ({ count, previewUris = [], onPress, onPressTop5, month }: OnThisDayCardProps) => {
    const { t } = useTranslation();

    const handlePress = useCallback(() => {
      onPress?.();
    }, [onPress]);

    const handlePressTop5 = useCallback(() => {
      onPressTop5?.();
    }, [onPressTop5]);

    // Take only first 3 preview URIs
    const displayUris = previewUris.slice(0, 3);

    return (
      <Animated.View
        entering={FadeIn.duration(ANIMATION_DURATION)}
        style={[theme.card.base, styles.container]}
      >
        <GradientWrapper>
          <Pressable
            onPress={handlePress}
            style={styles.pressable}
            accessibilityRole="button"
            accessibilityLabel={t('onThisDay.accessibilityLabel', { count })}
            testID={
              month ? testID('home', 'month', month.toString().padStart(2, '0')) : 'onThisDayCard'
            }
          >
            {/* Left content */}
            <View style={styles.leftContent}>
              <Text style={styles.title}>
                {t('home.unDiaComoHoy')} · {t('home.fotos', { n: formatCount(count) })}
              </Text>
            </View>

            {/* Right content */}
            <View style={styles.rightContent}>
              {/* Overlapping thumbnails */}
              <View style={styles.thumbnailContainer}>
                {[2, 1, 0].map((index) => (
                  <ThumbnailPreview key={index} uri={displayUris[index]} index={index} />
                ))}
              </View>

              {/* Secondary CTA Button */}
              {onPressTop5 && (
                <Pressable
                  onPress={handlePressTop5}
                  style={styles.ctaButton}
                  accessibilityRole="button"
                  accessibilityLabel={t('onThisDay.cta')}
                  testID="onThisDayCard_ctaButton"
                >
                  <Text style={styles.ctaText}>{t('onThisDay.cta')}</Text>
                </Pressable>
              )}
            </View>
          </Pressable>
        </GradientWrapper>
      </Animated.View>
    );
  }
);

OnThisDayCard.displayName = 'OnThisDayCard';

export default OnThisDayCard;
