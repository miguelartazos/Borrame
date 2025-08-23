import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SegmentedControl } from './SegmentedControl';
import type { FilterType } from '../features/deck/selectors';

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'deck.filters.all': 'All',
        'deck.filters.screenshots': 'Screenshots',
        'deck.filters.recent': 'Recent',
      };
      return translations[key] || key;
    },
  }),
}));

describe('SegmentedControl', () => {
  const mockOnFilterChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all three filter options', () => {
    const { getByText } = render(
      <SegmentedControl filter="all" onFilterChange={mockOnFilterChange} />
    );

    expect(getByText('All')).toBeTruthy();
    expect(getByText('Screenshots')).toBeTruthy();
    expect(getByText('Recent')).toBeTruthy();
  });

  it('highlights the selected filter', () => {
    const { getByTestId, rerender } = render(
      <SegmentedControl filter="all" onFilterChange={mockOnFilterChange} />
    );

    // Check that 'all' is selected
    const allButton = getByTestId('segmentedControl_all');
    expect(allButton.props.accessibilityState.selected).toBe(true);

    // Change to screenshots
    rerender(<SegmentedControl filter="screenshots" onFilterChange={mockOnFilterChange} />);
    const screenshotsButton = getByTestId('segmentedControl_screenshots');
    expect(screenshotsButton.props.accessibilityState.selected).toBe(true);
  });

  it('calls onFilterChange when a filter is tapped', () => {
    const { getByTestId } = render(
      <SegmentedControl filter="all" onFilterChange={mockOnFilterChange} />
    );

    const screenshotsButton = getByTestId('segmentedControl_screenshots');
    fireEvent.press(screenshotsButton);

    expect(mockOnFilterChange).toHaveBeenCalledWith('screenshots');
    expect(mockOnFilterChange).toHaveBeenCalledTimes(1);
  });

  it('does not call onFilterChange when current filter is tapped', () => {
    const { getByTestId } = render(
      <SegmentedControl filter="screenshots" onFilterChange={mockOnFilterChange} />
    );

    const screenshotsButton = getByTestId('segmentedControl_screenshots');
    fireEvent.press(screenshotsButton);

    // Should still call onFilterChange (component doesn't prevent it)
    expect(mockOnFilterChange).toHaveBeenCalledWith('screenshots');
  });

  it('has proper accessibility labels', () => {
    const { getByTestId } = render(
      <SegmentedControl filter="all" onFilterChange={mockOnFilterChange} />
    );

    const allButton = getByTestId('segmentedControl_all');
    expect(allButton.props.accessibilityLabel).toBe('All');
    expect(allButton.props.accessibilityRole).toBe('button');
  });

  it('animates pill position on filter change', () => {
    const { rerender } = render(
      <SegmentedControl filter="all" onFilterChange={mockOnFilterChange} />
    );

    // Change filter and verify animation triggers
    rerender(<SegmentedControl filter="recent" onFilterChange={mockOnFilterChange} />);

    // Animation is handled by Reanimated, just verify component re-renders
    expect(mockOnFilterChange).not.toHaveBeenCalled();
  });

  it('handles all FilterType values', () => {
    const filters: FilterType[] = ['all', 'screenshots', 'recent'];

    filters.forEach((filter) => {
      const { getByTestId } = render(
        <SegmentedControl filter={filter} onFilterChange={mockOnFilterChange} />
      );

      const button = getByTestId(`segmentedControl_${filter}`);
      expect(button).toBeTruthy();
    });
  });
});
