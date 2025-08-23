import { useMemo } from 'react';

/**
 * Memoized hook for accessibility props
 * Prevents unnecessary re-renders from object spreading
 *
 * @example
 * const a11yProps = useA11yProps({
 *   label: 'Delete photo',
 *   role: 'button',
 *   hint: 'Double tap to delete',
 *   disabled: false
 * });
 *
 * <TouchableOpacity {...a11yProps} />
 */

interface A11yPropsInput {
  role?: 'button' | 'link' | 'image' | 'text' | 'header' | 'none';
  label: string;
  hint?: string;
  disabled?: boolean;
  value?: string | number;
  testID?: string;
}

interface A11yPropsOutput {
  accessible: boolean;
  accessibilityRole?: string;
  accessibilityLabel: string;
  accessibilityHint?: string;
  accessibilityState?: { disabled: boolean };
  accessibilityValue?: { text: string };
  importantForAccessibility: 'yes' | 'no' | 'auto' | 'no-hide-descendants';
  testID?: string;
}

export const useA11yProps = ({
  role,
  label,
  hint,
  disabled,
  value,
  testID,
}: A11yPropsInput): A11yPropsOutput => {
  return useMemo(
    () => ({
      accessible: true,
      accessibilityRole: role,
      accessibilityLabel: label,
      accessibilityHint: hint,
      accessibilityState: disabled ? { disabled } : undefined,
      accessibilityValue: value !== undefined ? { text: String(value) } : undefined,
      importantForAccessibility: 'yes' as const,
      testID,
    }),
    [role, label, hint, disabled, value, testID]
  );
};

/**
 * Hook for decorative elements that should be hidden from screen readers
 * Returns stable reference for performance
 *
 * @example
 * const hiddenProps = useA11yHidden();
 * <View {...hiddenProps}>
 *   <Image source={decorativeImage} />
 * </View>
 */
export const useA11yHidden = () => {
  return useMemo(
    () => ({
      accessible: false,
      accessibilityElementsHidden: true,
      importantForAccessibility: 'no' as const,
    }),
    []
  );
};

/**
 * Hook for grouping related elements for screen readers
 * Groups multiple elements under a single accessible label
 *
 * @param label - The label for the grouped elements
 *
 * @example
 * const groupProps = useA11yGroup('User profile section');
 * <View {...groupProps}>
 *   <Text>Name: John Doe</Text>
 *   <Text>Email: john@example.com</Text>
 * </View>
 */
export const useA11yGroup = (label: string) => {
  return useMemo(
    () => ({
      accessible: true,
      accessibilityLabel: label,
      accessibilityRole: 'none' as const,
    }),
    [label]
  );
};
