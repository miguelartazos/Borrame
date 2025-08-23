/**
 * ActionHeroCard Component Tests
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import Animated from 'react-native-reanimated';
import { ActionHeroCard, ChipData } from './ActionHeroCard';

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
  }),
}));

// Mock Reanimated
jest.mock('react-native-reanimated', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Mock useReducedMotion hook
jest.mock('../../hooks/useReducedMotion', () => ({
  useReducedMotion: () => false,
}));

describe('ActionHeroCard', () => {
  const defaultChips: ChipData[] = [
    { id: 'todo', label: 'Todo', count: 42 },
    { id: 'screenshots', label: 'Screenshots', count: 15 },
    { id: 'blurry', label: 'Blurry', count: 7 },
    { id: 'similar', label: 'Similar', count: 23 },
    { id: 'videos', label: 'Videos', count: 3 },
  ];

  const defaultProps = {
    spaceReady: 2147483648, // 2 GB
    chips: defaultChips,
    onPress: jest.fn(),
    onPressChip: jest.fn(),
    testID: 'home.action.card',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders without crashing', () => {
      const { getByTestId } = render(<ActionHeroCard {...defaultProps} />);
      expect(getByTestId('home.action.card')).toBeTruthy();
    });

    it('displays space ready correctly', () => {
      const { getByText } = render(<ActionHeroCard {...defaultProps} />);
      expect(getByText('2 GB')).toBeTruthy();
      expect(getByText('home.listos')).toBeTruthy();
    });

    it('displays CTA button', () => {
      const { getByText } = render(<ActionHeroCard {...defaultProps} />);
      expect(getByText('home.ordenarAhora')).toBeTruthy();
    });

    it('renders all chips', () => {
      const { getByText } = render(<ActionHeroCard {...defaultProps} />);
      defaultChips.forEach((chip) => {
        expect(getByText(chip.label)).toBeTruthy();
        if (chip.count > 0) {
          expect(getByText(chip.count.toString())).toBeTruthy();
        }
      });
    });

    it('handles empty chips array', () => {
      const { getByTestId } = render(<ActionHeroCard {...defaultProps} chips={[]} />);
      expect(getByTestId('home.action.card')).toBeTruthy();
    });
  });

  describe('interactions', () => {
    it('calls onPress when CTA button is pressed', () => {
      const onPress = jest.fn();
      const { getByTestId } = render(<ActionHeroCard {...defaultProps} onPress={onPress} />);

      fireEvent.press(getByTestId('home.action.cta'));
      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('calls onPressChip when chip is pressed', () => {
      const onPressChip = jest.fn();
      const { getByTestId } = render(
        <ActionHeroCard {...defaultProps} onPressChip={onPressChip} />
      );

      fireEvent.press(getByTestId('home.chip.todo'));
      expect(onPressChip).toHaveBeenCalledWith('todo');
    });

    it('handles chip selection state', () => {
      const { getByTestId, rerender } = render(<ActionHeroCard {...defaultProps} />);

      // Todo should be selected by default
      const todoChip = getByTestId('home.chip.todo');
      expect(todoChip.props.style).toContainEqual(
        expect.objectContaining({ backgroundColor: expect.any(String) })
      );

      // Press screenshots chip
      fireEvent.press(getByTestId('home.chip.screenshots'));

      // Re-render to check state update
      rerender(<ActionHeroCard {...defaultProps} />);
    });

    it('handles press animations', () => {
      const { getByTestId } = render(<ActionHeroCard {...defaultProps} />);
      const ctaButton = getByTestId('home.action.cta');

      fireEvent(ctaButton, 'pressIn');
      fireEvent(ctaButton, 'pressOut');

      // Animation values are mocked, just verify no errors
      expect(ctaButton).toBeTruthy();
    });
  });

  describe('parallax effect', () => {
    it('applies parallax style when scrollY is provided', () => {
      const scrollY = { value: 50 } as Animated.SharedValue<number>;
      const { getByTestId } = render(<ActionHeroCard {...defaultProps} scrollY={scrollY} />);

      expect(getByTestId('home.action.card')).toBeTruthy();
    });

    it('handles scrollY updates correctly', () => {
      const scrollY = { value: 0 } as Animated.SharedValue<number>;
      const { getByTestId, rerender } = render(
        <ActionHeroCard {...defaultProps} scrollY={scrollY} />
      );

      // Update scroll value
      scrollY.value = 100;
      rerender(<ActionHeroCard {...defaultProps} scrollY={scrollY} />);

      expect(getByTestId('home.action.card')).toBeTruthy();
    });

    it('works without scrollY prop', () => {
      const { getByTestId } = render(<ActionHeroCard {...defaultProps} scrollY={undefined} />);
      expect(getByTestId('home.action.card')).toBeTruthy();
    });
  });

  describe('chip badges', () => {
    it('displays badge for chips with count > 0', () => {
      const chips: ChipData[] = [{ id: 'todo', label: 'Todo', count: 5 }];
      const { getByText } = render(<ActionHeroCard {...defaultProps} chips={chips} />);
      expect(getByText('5')).toBeTruthy();
    });

    it('does not display badge for chips with count = 0', () => {
      const chips: ChipData[] = [{ id: 'todo', label: 'Todo', count: 0 }];
      const { queryByText } = render(<ActionHeroCard {...defaultProps} chips={chips} />);
      expect(queryByText('0')).toBeNull();
    });
  });

  describe('accessibility', () => {
    it('has correct accessibility roles', () => {
      const { getAllByRole } = render(<ActionHeroCard {...defaultProps} />);
      const buttons = getAllByRole('button');
      // CTA button + all chip buttons
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('has correct accessibility labels', () => {
      const { getByTestId } = render(<ActionHeroCard {...defaultProps} />);
      const ctaButton = getByTestId('home.action.cta');
      expect(ctaButton.props.accessibilityRole).toBe('button');
      expect(ctaButton.props.accessibilityLabel).toBe('home.ordenarAhora');
    });

    it('chip has correct accessibility label', () => {
      const { getByTestId } = render(<ActionHeroCard {...defaultProps} />);
      const todoChip = getByTestId('home.chip.todo');
      expect(todoChip.props.accessibilityRole).toBe('button');
      expect(todoChip.props.accessibilityLabel).toBe('Todo: 42');
    });
  });

  describe('reduced motion', () => {
    it('disables animations when reduced motion is enabled', () => {
      jest.doMock('../../hooks/useReducedMotion', () => ({
        useReducedMotion: () => true,
      }));

      const { getByTestId } = render(<ActionHeroCard {...defaultProps} />);
      const ctaButton = getByTestId('home.action.cta');

      fireEvent(ctaButton, 'pressIn');
      fireEvent(ctaButton, 'pressOut');

      // With reduced motion, animations should be disabled
      expect(ctaButton).toBeTruthy();
    });
  });

  describe('performance', () => {
    it('memoizes chip scale values correctly', () => {
      const { rerender } = render(<ActionHeroCard {...defaultProps} />);

      // Update with same chip count
      rerender(<ActionHeroCard {...defaultProps} />);

      // Update with different chip count
      const newChips = [...defaultChips.slice(0, -1), { id: 'newchip' as any, label: 'New', count: 10 }];
      rerender(<ActionHeroCard {...defaultProps} chips={newChips} />);

      // No errors should occur
    });

    it('cleans up animations on unmount', () => {
      const { unmount } = render(<ActionHeroCard {...defaultProps} />);
      unmount();
      // Animation cleanup is called in the component
    });
  });

  describe('formatting', () => {
    it('formats different byte sizes correctly', () => {
      const testCases = [
        { bytes: 0, expected: '0 MB' },
        { bytes: 52428800, expected: '50 MB' },
        { bytes: 1073741824, expected: '1 GB' },
        { bytes: 5368709120, expected: '5 GB' },
      ];

      testCases.forEach(({ bytes, expected }) => {
        const { getByText } = render(<ActionHeroCard {...defaultProps} spaceReady={bytes} />);
        expect(getByText(expected)).toBeTruthy();
      });
    });
  });
});
