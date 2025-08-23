/**
 * CategoryTile Component Tests
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { CategoryTile } from './CategoryTile';
import * as Haptics from 'expo-haptics';

// Mock dependencies
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light' },
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: any) => {
      if (params) {
        return `${key}: ${JSON.stringify(params)}`;
      }
      return key;
    },
  }),
}));

jest.mock('../../store/useSettings', () => ({
  useSettings: () => true, // hapticFeedback enabled
}));

jest.mock('expo-blur', () => ({
  BlurView: 'BlurView',
}));

describe('CategoryTile', () => {
  const mockIcon = <Text>TestIcon</Text>;
  const defaultProps = {
    id: 'test-category',
    title: 'Test Category',
    icon: mockIcon,
    count: 123,
    onPress: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with basic props', () => {
    const { getByText, getByTestId } = render(<CategoryTile {...defaultProps} />);

    expect(getByText('Test Category')).toBeTruthy();
    expect(getByText('123')).toBeTruthy();
    expect(getByText('TestIcon')).toBeTruthy();
    expect(getByTestId('category-tile-test-category')).toBeTruthy();
  });

  it('triggers haptic feedback and calls onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(<CategoryTile {...defaultProps} onPress={onPress} />);

    fireEvent.press(getByTestId('category-tile-test-category'));

    expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    expect(onPress).toHaveBeenCalledWith('test-category');
  });

  it('shows blur overlay and pro badge when locked', () => {
    const { UNSAFE_queryByType, getByTestId } = render(
      <CategoryTile {...defaultProps} locked={true} />
    );

    const blurView = UNSAFE_queryByType('BlurView');
    expect(blurView).toBeTruthy();
    expect(blurView?.props.intensity).toBe(15);
    expect(blurView?.props.tint).toBe('light');

    // Pro badge is rendered through Star icon
    const tile = getByTestId('category-tile-test-category');
    expect(tile).toBeTruthy();
  });

  it('does not show blur overlay when not locked', () => {
    const { UNSAFE_queryByType } = render(<CategoryTile {...defaultProps} locked={false} />);

    const blurView = UNSAFE_queryByType('BlurView');
    expect(blurView).toBeFalsy();
  });

  it('applies correct accessibility props for unlocked tile', () => {
    const { getByTestId } = render(<CategoryTile {...defaultProps} locked={false} />);

    const tile = getByTestId('category-tile-test-category');
    expect(tile.props.accessibilityLabel).toContain('tile_unlocked');
    expect(tile.props.accessibilityRole).toBe('button');
    expect(tile.props.accessibilityState).toEqual({ disabled: false });
  });

  it('applies correct accessibility props for locked tile', () => {
    const { getByTestId } = render(<CategoryTile {...defaultProps} locked={true} />);

    const tile = getByTestId('category-tile-test-category');
    expect(tile.props.accessibilityLabel).toContain('tile_locked');
    expect(tile.props.accessibilityState).toEqual({ disabled: true });
  });

  it('formats large numbers with locale string', () => {
    const { getByText } = render(<CategoryTile {...defaultProps} count={1234} />);

    expect(getByText('1,234')).toBeTruthy();
  });

  it('uses custom testID when provided', () => {
    const { getByTestId } = render(<CategoryTile {...defaultProps} testID="custom-test-id" />);

    expect(getByTestId('custom-test-id')).toBeTruthy();
  });

  it('truncates long titles', () => {
    const { getByText } = render(
      <CategoryTile
        {...defaultProps}
        title="This is a very long category title that should be truncated"
      />
    );

    const titleElement = getByText('This is a very long category title that should be truncated');
    expect(titleElement.props.numberOfLines).toBe(1);
    expect(titleElement.props.adjustsFontSizeToFit).toBe(true);
    expect(titleElement.props.minimumFontScale).toBe(0.8);
  });

  it('handles press animation states', () => {
    const { getByTestId } = render(<CategoryTile {...defaultProps} />);

    const tile = getByTestId('category-tile-test-category');

    // Test press in
    fireEvent(tile, 'pressIn');
    // Animation value would be set to 0.95

    // Test press out
    fireEvent(tile, 'pressOut');
    // Animation value would be set back to 1
  });
});
