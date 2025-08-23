/**
 * Theme utilities and hooks
 * Optimized for performance with pre-computed styles
 */

import { useMemo } from 'react';
import { ViewStyle } from 'react-native';
import { colors, spacing, radii, typography, semanticColors } from './tokens';
import { shadows } from './shadows';

// Pre-computed card styles
const cardStyles = Object.freeze({
  base: Object.freeze({
    backgroundColor: colors.card,
    borderRadius: radii.md,
    ...shadows.card,
  } as ViewStyle),
  floating: Object.freeze({
    backgroundColor: colors.card,
    borderRadius: radii.md,
    ...shadows.floating,
  } as ViewStyle),
});

// Pre-computed surface styles
const surfaceStyles = Object.freeze({
  sm: Object.freeze({
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
  } as ViewStyle),
  md: Object.freeze({
    backgroundColor: colors.surface,
    borderRadius: radii.md,
  } as ViewStyle),
  lg: Object.freeze({
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
  } as ViewStyle),
  xl: Object.freeze({
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
  } as ViewStyle),
});

/**
 * Theme object containing all design tokens and pre-computed styles
 * Frozen for performance - no object creation on access
 */
export const theme = Object.freeze({
  colors,
  spacing,
  radii,
  typography,
  semanticColors,
  shadows,
  gradients: {
    onThisDay: ['#F3F4F6', '#FAFBFC'] as const,
    surface: ['#FAFAFA', '#FFFFFF'] as const,
  },

  // Pre-computed styles
  card: cardStyles,
  surface: surfaceStyles,
});

/**
 * Hook to access theme tokens
 * Returns memoized theme object
 */
export const useTheme = () => {
  return useMemo(() => theme, []);
};

// Re-export everything from tokens and shadows for convenience
export * from './tokens';
export * from './shadows';

// Export theme as default
export default theme;
