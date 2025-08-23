import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { theme } from '../../../ui';
import { useTranslation } from 'react-i18next';
import { testID as makeTestID } from '../../../lib/a11y';

interface PaywallPreviewProps {
  previewItems: Array<{
    id: string;
    uri?: string;
    title?: string;
  }>;
}

const MAX_PREVIEW_ITEMS = 6;

export const PaywallPreview: React.FC<PaywallPreviewProps> = ({ previewItems }) => {
  const { t } = useTranslation();

  // Memoize the preview items to avoid re-renders
  const visibleItems = useMemo(() => previewItems.slice(0, MAX_PREVIEW_ITEMS), [previewItems]);

  if (!previewItems.length) return null;

  return (
    <View style={styles.previewContainer}>
      <Text style={styles.previewTitle}>
        {t('paywall.preview_title', { count: previewItems.length })}
      </Text>
      <View style={styles.previewGrid}>
        {visibleItems.map((item) => (
          <View
            key={item.id}
            style={styles.previewItem}
            testID={makeTestID('paywall', 'preview', item.id)}
          >
            <View style={styles.previewImage}>
              {Platform.OS === 'ios' ? (
                <BlurView intensity={10} tint="light" style={StyleSheet.absoluteFillObject} />
              ) : (
                <View style={[StyleSheet.absoluteFillObject, styles.androidBlurFallback]} />
              )}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  previewContainer: {
    marginBottom: 24,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 12,
    textAlign: 'center',
  },
  previewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  previewItem: {
    width: 100,
    height: 100,
    borderRadius: theme.radii.md,
    overflow: 'hidden',
  },
  previewImage: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  androidBlurFallback: {
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
  },
});
