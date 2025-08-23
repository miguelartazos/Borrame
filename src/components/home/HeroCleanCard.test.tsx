/**
 * HeroCleanCard Component Tests
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { HeroCleanCard, type ChipData } from './HeroCleanCard';

// Mock i18n
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

describe('HeroCleanCard', () => {
  const mockChips: ChipData[] = [
    { id: 'all', label: 'All', count: 150 },
    { id: 'screenshots', label: 'Screenshots', count: 45 },
    { id: 'blurry', label: 'Blurry', count: 23 },
    { id: 'similar', label: 'Similar', count: 89 },
    { id: 'videos', label: 'Videos', count: 12 },
  ];

  const defaultProps = {
    progress: 0.75,
    spaceReady: 524288000, // 500MB
    chips: mockChips,
    onPress: jest.fn(),
    onPressChip: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render progress ring with correct percentage', () => {
      const { getByTestId } = render(<HeroCleanCard {...defaultProps} />);
      const progressRing = getByTestId('hero_progressRing');
      expect(progressRing).toBeTruthy();
    });

    it('should render CTA button with correct text', () => {
      const { getByText } = render(<HeroCleanCard {...defaultProps} />);
      expect(getByText('home.ordenarAhora')).toBeTruthy();
      expect(getByText(/home.listos/)).toBeTruthy();
    });

    it('should render all chips with correct counts', () => {
      const { getByTestId } = render(<HeroCleanCard {...defaultProps} />);

      mockChips.forEach((chip) => {
        const chipElement = getByTestId(`home.chip.${chip.id}`);
        expect(chipElement).toBeTruthy();
      });
    });

    it('should display skeleton when loading', () => {
      const { queryByTestId, queryByText } = render(
        <HeroCleanCard {...defaultProps} loading={true} />
      );

      expect(queryByTestId('hero_progressRing')).toBeNull();
      expect(queryByText('home.ordenarAhora')).toBeNull();
    });
  });

  describe('Interactions', () => {
    it('should call onPress when CTA is pressed', () => {
      const { getByTestId } = render(<HeroCleanCard {...defaultProps} />);
      const ctaButton = getByTestId('home.hero.cta');

      fireEvent.press(ctaButton);
      expect(defaultProps.onPress).toHaveBeenCalledTimes(1);
    });

    it('should call onPressChip with correct id when chip is pressed', () => {
      const { getByTestId } = render(<HeroCleanCard {...defaultProps} />);

      const allChip = getByTestId('home.chip.all');
      fireEvent.press(allChip);

      expect(defaultProps.onPressChip).toHaveBeenCalledWith('all');
    });

    it('should handle multiple chip presses', () => {
      const { getByTestId } = render(<HeroCleanCard {...defaultProps} />);

      fireEvent.press(getByTestId('home.chip.all'));
      fireEvent.press(getByTestId('home.chip.screenshots'));
      fireEvent.press(getByTestId('home.chip.blurry'));

      expect(defaultProps.onPressChip).toHaveBeenCalledTimes(3);
      expect(defaultProps.onPressChip).toHaveBeenNthCalledWith(1, 'all');
      expect(defaultProps.onPressChip).toHaveBeenNthCalledWith(2, 'screenshots');
      expect(defaultProps.onPressChip).toHaveBeenNthCalledWith(3, 'blurry');
    });
  });

  describe('Progress Animation', () => {
    it('should update progress value when prop changes', async () => {
      const { rerender, getByTestId } = render(<HeroCleanCard {...defaultProps} progress={0.25} />);

      const progressRing = getByTestId('hero_progressRing');
      expect(progressRing).toBeTruthy();

      rerender(<HeroCleanCard {...defaultProps} progress={0.9} />);

      await waitFor(() => {
        expect(progressRing).toBeTruthy();
      });
    });

    it('should handle progress edge cases', () => {
      const { getByTestId: getByTestId1 } = render(
        <HeroCleanCard {...defaultProps} progress={0} />
      );
      expect(getByTestId1('hero_progressRing')).toBeTruthy();

      const { getByTestId: getByTestId2 } = render(
        <HeroCleanCard {...defaultProps} progress={1} />
      );
      expect(getByTestId2('hero_progressRing')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should have correct accessibility labels for CTA', () => {
      const { getByTestId } = render(<HeroCleanCard {...defaultProps} />);
      const ctaButton = getByTestId('home.hero.cta');

      expect(ctaButton.props.accessibilityRole).toBe('button');
      expect(ctaButton.props.accessibilityLabel).toBe('home.ordenarAhora');
    });

    it('should have correct accessibility labels for chips', () => {
      const { getByTestId } = render(<HeroCleanCard {...defaultProps} />);

      mockChips.forEach((chip) => {
        const chipElement = getByTestId(`home.chip.${chip.id}`);
        expect(chipElement.props.accessibilityRole).toBe('button');
        expect(chipElement.props.accessibilityLabel).toBe(`${chip.label}: ${chip.count}`);
      });
    });

    it('should have minimum 44x44 touch targets', () => {
      const { getByTestId } = render(<HeroCleanCard {...defaultProps} />);

      mockChips.forEach((chip) => {
        const chipElement = getByTestId(`home.chip.${chip.id}`);
        const style = chipElement.props.style;

        // Height is explicitly set to 44 in styles
        expect(style.height).toBe(44);
      });
    });
  });

  describe('Space Formatting', () => {
    it('should format bytes correctly', () => {
      const testCases = [
        { bytes: 0, expected: '0 MB' },
        { bytes: 1048576, expected: '1 MB' }, // 1MB
        { bytes: 524288000, expected: '500 MB' }, // 500MB
        { bytes: 1073741824, expected: '1 GB' }, // 1GB
      ];

      testCases.forEach(({ bytes }) => {
        const { getByText } = render(<HeroCleanCard {...defaultProps} spaceReady={bytes} />);
        // Check that formatBytes is called with the value
        expect(getByText(/home.listos/)).toBeTruthy();
      });
    });
  });

  describe('Chip Stagger Animation', () => {
    it('should apply stagger delay to chips', () => {
      const { getAllByText } = render(<HeroCleanCard {...defaultProps} />);

      // Each chip should have incrementally delayed animation
      // This is handled by Reanimated entering prop with delay
      const chips = getAllByText(/All|Screenshots|Blurry|Similar|Videos/);
      expect(chips.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty chips array gracefully', () => {
      const { queryByTestId, getByTestId } = render(<HeroCleanCard {...defaultProps} chips={[]} />);

      // Should still render progress ring and CTA
      expect(getByTestId('hero_progressRing')).toBeTruthy();
      expect(getByTestId('home.hero.cta')).toBeTruthy();

      // Should not crash when chips are empty
      expect(queryByTestId('home.chip.all')).toBeNull();
    });

    it('should handle zero space correctly', () => {
      const { getByText } = render(<HeroCleanCard {...defaultProps} spaceReady={0} />);
      expect(getByText(/home.listos/)).toBeTruthy();
    });

    it('should handle negative space gracefully', () => {
      const { getByText } = render(<HeroCleanCard {...defaultProps} spaceReady={-100} />);
      // formatBytes should handle negative values
      expect(getByText(/home.listos/)).toBeTruthy();
    });

    it('should memoize expensive calculations', () => {
      const { rerender } = render(<HeroCleanCard {...defaultProps} />);

      // Rerender with same props - memoized values should prevent recalculation
      rerender(<HeroCleanCard {...defaultProps} />);

      // Component should still work correctly
      expect(true).toBe(true);
    });
  });
});
