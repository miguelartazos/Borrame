/**
 * Platform-specific shadow utilities
 * Pre-computed shadows for optimal performance
 */

import { Platform, ViewStyle } from 'react-native';
import { colors } from './tokens';

// Pre-computed shadow styles for iOS
const iosShadows = Object.freeze({
  card: Object.freeze({
    shadowColor: colors.black,
    shadowOffset: Object.freeze({
      width: 0,
      height: 2,
    }),
    shadowOpacity: 0.15,
    shadowRadius: 4,
  }),
  floating: Object.freeze({
    shadowColor: colors.black,
    shadowOffset: Object.freeze({
      width: 0,
      height: 4,
    }),
    shadowOpacity: 0.25,
    shadowRadius: 12,
  }),
  primaryGlow: Object.freeze({
    shadowColor: colors.primary,
    shadowOffset: Object.freeze({
      width: 0,
      height: 4,
    }),
    shadowOpacity: 0.25,
    shadowRadius: 12,
  }),
  successGlow: Object.freeze({
    shadowColor: colors.success,
    shadowOffset: Object.freeze({
      width: 0,
      height: 2,
    }),
    shadowOpacity: 0.15,
    shadowRadius: 4,
  }),
  dangerGlow: Object.freeze({
    shadowColor: colors.danger,
    shadowOffset: Object.freeze({
      width: 0,
      height: 2,
    }),
    shadowOpacity: 0.15,
    shadowRadius: 4,
  }),
  none: Object.freeze({
    shadowColor: 'transparent',
    shadowOffset: Object.freeze({ width: 0, height: 0 }),
    shadowOpacity: 0,
    shadowRadius: 0,
  }),
  thumbnail: Object.freeze({
    shadowColor: colors.black,
    shadowOffset: Object.freeze({
      width: 0,
      height: 1,
    }),
    shadowOpacity: 0.15,
    shadowRadius: 3,
  }),
});

// Pre-computed shadow styles for Android
const androidShadows = Object.freeze({
  card: Object.freeze({
    elevation: 2,
  }),
  floating: Object.freeze({
    elevation: 8,
  }),
  primaryGlow: Object.freeze({
    elevation: 8,
  }),
  successGlow: Object.freeze({
    elevation: 2,
  }),
  dangerGlow: Object.freeze({
    elevation: 2,
  }),
  none: Object.freeze({
    elevation: 0,
  }),
  thumbnail: Object.freeze({
    elevation: 3,
  }),
});

// Export pre-computed platform-specific shadows
export const shadows = Object.freeze({
  card: (Platform.OS === 'ios' ? iosShadows.card : androidShadows.card) as ViewStyle,
  floating: (Platform.OS === 'ios' ? iosShadows.floating : androidShadows.floating) as ViewStyle,
  primaryGlow: (Platform.OS === 'ios'
    ? iosShadows.primaryGlow
    : androidShadows.primaryGlow) as ViewStyle,
  successGlow: (Platform.OS === 'ios'
    ? iosShadows.successGlow
    : androidShadows.successGlow) as ViewStyle,
  dangerGlow: (Platform.OS === 'ios'
    ? iosShadows.dangerGlow
    : androidShadows.dangerGlow) as ViewStyle,
  none: (Platform.OS === 'ios' ? iosShadows.none : androidShadows.none) as ViewStyle,
  thumbnail: (Platform.OS === 'ios' ? iosShadows.thumbnail : androidShadows.thumbnail) as ViewStyle,
});

// Export shadow type for TypeScript
export type ShadowLevel =
  | 'card'
  | 'floating'
  | 'primaryGlow'
  | 'successGlow'
  | 'dangerGlow'
  | 'none'
  | 'thumbnail';

export default shadows;
