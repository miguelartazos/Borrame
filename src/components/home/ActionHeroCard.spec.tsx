import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ActionHeroCard } from './ActionHeroCard';
import type { ChipData } from './ActionHeroCard';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'home.ordenarAhora': 'Clean Now',
        'home.listos': 'ready',
        'home.chips.todo': 'All',
        'home.chips.pantallazos': 'Screenshots',
        'home.chips.borrosas': 'Blurry',
        'home.chips.similares': 'Similar',
        'home.chips.videos': 'Videos',
      };
      return translations[key] || key;
    },
  }),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

describe('ActionHeroCard', () => {
  const mockOnPress = jest.fn();
  const mockOnPressChip = jest.fn();

  const defaultChips: ChipData[] = [
    { id: 'todo', label: 'All', count: 150 },
    { id: 'screenshots', label: 'Screenshots', count: 45 },
    { id: 'blurry', label: 'Blurry', count: 23 },
    { id: 'similar', label: 'Similar', count: 67 },
    { id: 'videos', label: 'Videos', count: 12 },
  ];

  const defaultProps = {
    spaceReady: 524288000,
    chips: defaultChips,
    onPress: mockOnPress,
    onPressChip: mockOnPressChip,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with correct CTA text', () => {
    const { getByText } = render(<ActionHeroCard {...defaultProps} />);
    expect(getByText('Clean Now')).toBeTruthy();
  });

  it('displays formatted space ready', () => {
    const { getByText } = render(<ActionHeroCard {...defaultProps} />);
    expect(getByText('500 MB')).toBeTruthy();
    expect(getByText('ready')).toBeTruthy();
  });

  it('renders all chip categories with counts', () => {
    const { getByText } = render(<ActionHeroCard {...defaultProps} />);
    expect(getByText('All')).toBeTruthy();
    expect(getByText('Screenshots')).toBeTruthy();
    expect(getByText('Blurry')).toBeTruthy();
    expect(getByText('Similar')).toBeTruthy();
    expect(getByText('Videos')).toBeTruthy();
  });

  it('displays chip counts correctly', () => {
    const { getByText } = render(<ActionHeroCard {...defaultProps} />);
    expect(getByText('150')).toBeTruthy();
    expect(getByText('45')).toBeTruthy();
    expect(getByText('23')).toBeTruthy();
    expect(getByText('67')).toBeTruthy();
    expect(getByText('12')).toBeTruthy();
  });

  it('calls onPress when main CTA is pressed', () => {
    const { getByTestId } = render(<ActionHeroCard {...defaultProps} />);
    const ctaButton = getByTestId('home.action.cta');
    fireEvent.press(ctaButton);
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('calls onPressChip with correct id when chip is pressed', () => {
    const { getByTestId } = render(<ActionHeroCard {...defaultProps} />);
    const screenshotChip = getByTestId('home.chip.screenshots');
    fireEvent.press(screenshotChip);
    expect(mockOnPressChip).toHaveBeenCalledWith('screenshots');
    expect(mockOnPressChip).toHaveBeenCalledTimes(1);
  });

  it('renders skeleton state for loading chips', () => {
    const loadingChips: ChipData[] = [
      { id: 'todo', label: 'All', count: 0, loading: true },
      { id: 'screenshots', label: 'Screenshots', count: 0, loading: true },
    ];
    const { queryByText } = render(<ActionHeroCard {...defaultProps} chips={loadingChips} />);
    expect(queryByText('All')).toBeTruthy();
    expect(queryByText('Screenshots')).toBeTruthy();
  });

  it('handles zero space ready gracefully', () => {
    const { getByText } = render(<ActionHeroCard {...defaultProps} spaceReady={0} />);
    expect(getByText('0 MB')).toBeTruthy();
    expect(getByText('ready')).toBeTruthy();
  });

  it('does not show badge for chips with zero count', () => {
    const zeroCountChips: ChipData[] = [{ id: 'todo', label: 'All', count: 0 }];
    const { queryByText } = render(<ActionHeroCard {...defaultProps} chips={zeroCountChips} />);
    expect(queryByText('0')).toBeFalsy();
  });

  it('applies correct testIDs for accessibility', () => {
    const { getByTestId } = render(<ActionHeroCard {...defaultProps} />);
    expect(getByTestId('home.action.cta')).toBeTruthy();
    expect(getByTestId('home.chip.todo')).toBeTruthy();
    expect(getByTestId('home.chip.screenshots')).toBeTruthy();
    expect(getByTestId('home.chip.blurry')).toBeTruthy();
    expect(getByTestId('home.chip.similar')).toBeTruthy();
    expect(getByTestId('home.chip.videos')).toBeTruthy();
  });
});
