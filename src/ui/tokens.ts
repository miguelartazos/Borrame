/**
 * Design System Tokens
 * Core visual design constants for the SwipeClean app
 */

import colorsData from './colors.json';

// Color Tokens - frozen for performance, imported from shared JSON
export const colors = Object.freeze(colorsData) as typeof colorsData;

// Spacing Scale - primary steps are 8/12/16/20/24 - frozen for performance
// xs=4 is an exception for minor adjustments where 8 is too large
export const spacing = Object.freeze({
  xs: 4, // Exception: for minor adjustments only (not part of main scale)
  sm: 8, // Step 1: Base unit
  md: 12, // Step 2: 1.5x base
  lg: 16, // Step 3: 2x base
  xl: 20, // Step 4: 2.5x base
  '2xl': 24, // Step 5: 3x base
  '3xl': 32, // Extra: 4x base (for larger gaps)
} as const);

// Border Radius Scale - frozen for performance
export const radii = Object.freeze({
  none: 0,
  sm: 12,
  md: 16,
  chips: 16, // For pills/chips
  lg: 20,
  cards: 24, // For cards
  xl: 24,
  full: 9999,
} as const);

// Typography System - frozen for performance
export const typography = Object.freeze({
  display: Object.freeze({
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '600' as const,
  }),
  title: Object.freeze({
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '600' as const,
  }),
  body: Object.freeze({
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '400' as const,
  }),
  caption: Object.freeze({
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400' as const,
  }),
} as const);

// Type exports for TypeScript
export type ColorToken = keyof typeof colors;
export type SpacingToken = keyof typeof spacing;
export type RadiusToken = keyof typeof radii;
export type TypographyToken = keyof typeof typography;

// Semantic color aliases - frozen for performance
export const semanticColors = Object.freeze({
  background: Object.freeze({
    primary: colors.bg,
    secondary: colors.card,
    tertiary: colors.surface,
  }),
  text: Object.freeze({
    primary: colors.textPrimary,
    secondary: colors.textSecondary,
    inverse: colors.bg,
  }),
  border: Object.freeze({
    default: colors.line,
    subtle: `${colors.line}50`, // 50% opacity
  }),
  action: Object.freeze({
    primary: colors.primary,
    primaryMuted: colors.primaryMuted,
    success: colors.success,
    danger: colors.danger,
  }),
} as const);

// Gradient definitions - frozen for performance
export const gradients = Object.freeze({
  onThisDay: Object.freeze(['#F8F8FA', '#FFFFFF'] as const),
  surface: Object.freeze(['#FAFAFA', '#FFFFFF'] as const),
} as const);

// Frozen default export
export default Object.freeze({
  colors,
  spacing,
  radii,
  typography,
  semanticColors,
  gradients,
});
