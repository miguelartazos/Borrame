import { Platform, AccessibilityInfo, View } from 'react-native';
import type { ViewStyle } from 'react-native';
import { colors } from '../ui/tokens';
import { logger } from './logger';

/**
 * Accessibility utilities and constants
 * MUST: Ensure all interactive elements have proper roles/labels
 * MUST: Touch targets ≥ 44dp
 * MUST: Contrast checks ≥ 4.5:1
 */

// Minimum touch target size (44dp as per iOS HIG and Android Material)
export const MIN_TOUCH_TARGET = 44;

// Helper to calculate hit slop for minimum touch target
export const calculateHitSlop = (width: number, height: number) => {
  const needsHitSlop = width < MIN_TOUCH_TARGET || height < MIN_TOUCH_TARGET;

  if (!needsHitSlop) return undefined;

  // Calculate hitSlop to meet minimum requirements
  const horizontalSlop = Math.max(0, (MIN_TOUCH_TARGET - width) / 2);
  const verticalSlop = Math.max(0, (MIN_TOUCH_TARGET - height) / 2);

  return {
    top: verticalSlop,
    bottom: verticalSlop,
    left: horizontalSlop,
    right: horizontalSlop,
  };
};

// Helper to ensure minimum touch target size in style
export const ensureMinTouchTarget = (style?: ViewStyle): ViewStyle => {
  const currentWidth = (style?.width as number) ?? MIN_TOUCH_TARGET;
  const currentHeight = (style?.height as number) ?? MIN_TOUCH_TARGET;

  return {
    ...style,
    minWidth: Math.max(currentWidth, MIN_TOUCH_TARGET),
    minHeight: Math.max(currentHeight, MIN_TOUCH_TARGET),
  };
};

// Common accessibility props helper
interface A11yProps {
  role?: 'button' | 'link' | 'image' | 'text' | 'header' | 'none';
  label: string;
  hint?: string;
  disabled?: boolean;
  value?: string | number;
}

export const a11yProps = ({ role, label, hint, disabled, value }: A11yProps) => ({
  accessible: true,
  accessibilityRole: role,
  accessibilityLabel: label,
  accessibilityHint: hint,
  accessibilityState: disabled ? { disabled } : undefined,
  accessibilityValue: value ? { text: String(value) } : undefined,
  importantForAccessibility: 'yes' as const,
});

// Calculate relative luminance for WCAG contrast ratio
const getLuminance = (hex: string): number => {
  // Validate hex color format
  if (!hex || !/^#[0-9A-F]{6}$/i.test(hex)) {
    logger.warn(`Invalid hex color: ${hex}`);
    return 0;
  }

  const rgb = parseInt(hex.slice(1), 16);
  const r = (rgb >> 16) & 0xff; // eslint-disable-line no-bitwise
  const g = (rgb >> 8) & 0xff; // eslint-disable-line no-bitwise
  const b = (rgb >> 0) & 0xff; // eslint-disable-line no-bitwise

  const sRGB = [r, g, b].map((val) => {
    val = val / 255;
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
};

// Calculate WCAG contrast ratio between two colors
export const getContrastRatio = (foreground: string, background: string): number => {
  const l1 = getLuminance(foreground);
  const l2 = getLuminance(background);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
};

// Check if contrast meets WCAG AA standards (4.5:1 for normal text, 3:1 for large text)
export const meetsContrastStandard = (
  foreground: string,
  background: string,
  isLargeText = false
): boolean => {
  const ratio = getContrastRatio(foreground, background);
  const minRatio = isLargeText ? 3 : 4.5;
  return ratio >= minRatio;
};

// Validate app color tokens for accessibility
export const validateColorContrasts = () => {
  const validations = [
    {
      name: 'Primary text on background',
      fg: colors.textPrimary,
      bg: colors.bg,
      expected: 4.5,
    },
    {
      name: 'Secondary text on background',
      fg: colors.textSecondary,
      bg: colors.bg,
      expected: 4.5,
    },
    {
      name: 'Primary text on card',
      fg: colors.textPrimary,
      bg: colors.card,
      expected: 4.5,
    },
    {
      name: 'Primary text on surface',
      fg: colors.textPrimary,
      bg: colors.surface,
      expected: 4.5,
    },
    {
      name: 'White text on primary',
      fg: colors.white,
      bg: colors.primary,
      expected: 4.5,
    },
    {
      name: 'White text on danger',
      fg: colors.white,
      bg: colors.danger,
      expected: 4.5,
    },
    {
      name: 'White text on success',
      fg: colors.white,
      bg: colors.success,
      expected: 4.5,
    },
  ];

  const results = validations.map(({ name, fg, bg, expected }) => {
    const ratio = getContrastRatio(fg, bg);
    const passes = ratio >= expected;
    return {
      name,
      ratio: ratio.toFixed(2),
      passes,
      required: expected,
    };
  });

  return results;
};

// Helper to announce changes to screen readers
export const announce = (message: string, _options?: { queue?: boolean }) => {
  if (Platform.OS === 'ios') {
    AccessibilityInfo.announceForAccessibility(message);
  } else {
    // Android automatically queues announcements
    AccessibilityInfo.announceForAccessibility(message);
  }
};

// Group related elements for screen readers
export const a11yGroup = (label: string) => ({
  accessible: true,
  accessibilityLabel: label,
  accessibilityRole: 'none' as const,
});

// Hide decorative elements from screen readers
export const a11yHidden = () => ({
  accessible: false,
  accessibilityElementsHidden: true,
  importantForAccessibility: 'no' as const,
});

// Focus management helper with cleanup
let focusTimeoutId: NodeJS.Timeout | null = null;

/**
 * Sets accessibility focus to a component
 *
 * LIMITATION: In RN 0.79+, findNodeHandle is deprecated. This function
 * announces the element for screen readers but doesn't move actual focus.
 * This is a known React Native limitation pending a proper focus API.
 *
 * @param ref - React ref to the component to focus
 * @param options - Optional configuration
 * @param options.label - Label to announce (default: 'Element focused')
 *
 * @example
 * setAccessibilityFocus(buttonRef, { label: 'Submit button' });
 */
export const setAccessibilityFocus = (ref: React.RefObject<View>, options?: { label?: string }) => {
  // Clear any existing timeout
  if (focusTimeoutId) {
    clearTimeout(focusTimeoutId);
    focusTimeoutId = null;
  }

  if (ref?.current) {
    const handle = ref.current;
    // Use provided label or fallback - no internal props access
    const announcement = options?.label || 'Element focused';

    // In RN 0.79+, direct focus management is limited
    // We announce the element instead for screen reader users
    if (Platform.OS === 'ios') {
      // Announcement is the best we can do without findNodeHandle
      AccessibilityInfo.announceForAccessibility(announcement);
    } else {
      // Android: Use accessibility events for live region
      handle.setNativeProps?.({
        accessible: true,
        accessibilityLiveRegion: 'polite',
      });

      // Reset after a short delay
      focusTimeoutId = setTimeout(() => {
        handle.setNativeProps?.({
          accessibilityLiveRegion: 'none',
        });
        focusTimeoutId = null;
      }, 100);
    }
  }
};

/**
 * Cleanup function for unmounting components
 * Clears any pending focus timeouts
 */
export const clearAccessibilityFocus = () => {
  if (focusTimeoutId) {
    clearTimeout(focusTimeoutId);
    focusTimeoutId = null;
  }
};

// Test ID generator for consistent naming
export const testID = (screen: string, component: string, key?: string) => {
  return key ? `${screen}.${component}.${key}` : `${screen}.${component}`;
};
