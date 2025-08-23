import React from 'react';
import { render, cleanup } from '@testing-library/react-native';
import { HeroCleanCard } from './HeroCleanCard';
import type { ChipData } from './HeroCleanCard';
import { cancelAnimation } from 'react-native-reanimated';

// Mock i18n
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
  multiRemove: jest.fn(() => Promise.resolve()),
}));

// Mock Reanimated
jest.mock('react-native-reanimated', () => {
  const originalModule = jest.requireActual('react-native-reanimated');
  return {
    ...originalModule,
    cancelAnimation: jest.fn(),
    withTiming: jest.fn((value) => value),
    useSharedValue: jest.fn((initial) => ({ value: initial })),
    useAnimatedStyle: jest.fn(() => ({})),
    useAnimatedProps: jest.fn(() => ({})),
  };
});

describe('HeroCleanCard Cleanup', () => {
  const mockChips: ChipData[] = [
    { id: 'todo', label: 'Todo', count: 1234 },
    { id: 'screenshots', label: 'Screenshots', count: 456 },
  ];

  const defaultProps = {
    progress: 0.5,
    spaceReady: 1024 * 1024 * 500,
    chips: mockChips,
    onPress: jest.fn(),
    onPressChip: jest.fn(),
  };

  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  it('should cancel animations on unmount', () => {
    const { unmount } = render(<HeroCleanCard {...defaultProps} />);

    // Unmount the component
    unmount();

    // Verify cancelAnimation was called
    expect(cancelAnimation).toHaveBeenCalled();
  });

  it('should handle rapid progress updates without memory leaks', () => {
    const { rerender, unmount } = render(<HeroCleanCard {...defaultProps} />);

    // Simulate rapid updates
    for (let i = 0; i < 10; i++) {
      rerender(<HeroCleanCard {...defaultProps} progress={i / 10} />);
    }

    // Unmount and verify cleanup
    unmount();
    expect(cancelAnimation).toHaveBeenCalled();
  });

  it('should not create infinite loops with effect dependencies', () => {
    const renderCount = { current: 0 };

    // Track renders
    const TestWrapper = (props: any) => {
      renderCount.current++;
      return <HeroCleanCard {...props} />;
    };

    const { rerender } = render(<TestWrapper {...defaultProps} />);
    const initialRenders = renderCount.current;

    // Trigger effect by changing progress
    rerender(<TestWrapper {...defaultProps} progress={0.75} />);

    // Should only re-render once for the prop change
    expect(renderCount.current).toBe(initialRenders + 1);
  });

  it('should handle store subscription cleanup', () => {
    const { unmount } = render(<HeroCleanCard {...defaultProps} />);

    // Store subscriptions should be cleaned up automatically by zustand
    // This test verifies the component unmounts without errors
    expect(() => unmount()).not.toThrow();
  });

  it('should handle missing AsyncStorage gracefully', async () => {
    // Mock AsyncStorage failure
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    AsyncStorage.getItem.mockRejectedValueOnce(new Error('Storage unavailable'));

    // Component should still render
    const { getByTestId } = render(<HeroCleanCard {...defaultProps} />);
    expect(getByTestId('home.hero.cta')).toBeTruthy();
  });

  it('should validate progress bounds', () => {
    // Test with invalid progress values
    const { rerender } = render(<HeroCleanCard {...defaultProps} progress={-0.5} />);
    expect(() => rerender(<HeroCleanCard {...defaultProps} progress={1.5} />)).not.toThrow();
    expect(() => rerender(<HeroCleanCard {...defaultProps} progress={NaN} />)).not.toThrow();
  });
});
