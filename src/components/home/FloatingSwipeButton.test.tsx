import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { FloatingSwipeButton } from './FloatingSwipeButton';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

jest.mock('expo-router');
jest.mock('expo-haptics');
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ bottom: 20, top: 40, left: 0, right: 0 }),
}));
jest.mock('../../store/useSettings', () => ({
  useSettings: () => true,
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock store
const mockRefreshSpaceEstimate = jest.fn();

jest.mock('../../store/usePendingStore', () => ({
  usePendingSpaceEstimate: jest.fn(),
  useRefreshSpaceEstimate: jest.fn(),
}));

describe('FloatingSwipeButton', () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
    const {
      usePendingSpaceEstimate,
      useRefreshSpaceEstimate,
    } = require('../../store/usePendingStore');
    (usePendingSpaceEstimate as jest.Mock).mockReturnValue(0);
    (useRefreshSpaceEstimate as jest.Mock).mockReturnValue(mockRefreshSpaceEstimate);
  });

  describe('animation trigger', () => {
    it('should not render when spaceReady is <= 10MB', async () => {
      const { usePendingSpaceEstimate } = require('../../store/usePendingStore');
      (usePendingSpaceEstimate as jest.Mock).mockReturnValue(5); // 5MB < 10MB threshold

      const { queryByTestId } = render(<FloatingSwipeButton />);

      // Button should not be rendered
      await waitFor(() => {
        const button = queryByTestId('home.hero.cta');
        expect(button).toBeNull();
      });
    });

    it('should render and pulse when spaceReady > 10MB', async () => {
      const { usePendingSpaceEstimate } = require('../../store/usePendingStore');
      (usePendingSpaceEstimate as jest.Mock).mockReturnValue(15); // 15MB > 10MB threshold

      const { queryByTestId } = render(<FloatingSwipeButton />);

      // Wait for button to appear after initial delay
      await waitFor(
        () => {
          const button = queryByTestId('home.hero.cta');
          expect(button).toBeTruthy();
        },
        { timeout: 4000 }
      ); // Account for 3s initial delay
    });

    it('should refresh space estimate on mount', async () => {
      render(<FloatingSwipeButton />);

      await waitFor(() => {
        expect(mockRefreshSpaceEstimate).toHaveBeenCalled();
      });
    });

    it('should cancel animation on unmount', () => {
      const { usePendingSpaceEstimate } = require('../../store/usePendingStore');
      (usePendingSpaceEstimate as jest.Mock).mockReturnValue(15); // > 10MB
      const { cancelAnimation } = require('react-native-reanimated');

      const { unmount } = render(<FloatingSwipeButton />);

      act(() => {
        unmount();
      });

      expect(cancelAnimation).toHaveBeenCalled();
    });
  });

  describe('navigation', () => {
    it('should navigate to deck screen on press', async () => {
      const { usePendingSpaceEstimate } = require('../../store/usePendingStore');
      (usePendingSpaceEstimate as jest.Mock).mockReturnValue(15); // > 10MB

      const { queryByTestId } = render(<FloatingSwipeButton />);

      // Wait for button to appear
      await waitFor(
        () => {
          const button = queryByTestId('home.hero.cta');
          expect(button).toBeTruthy();
        },
        { timeout: 4000 }
      );

      const button = queryByTestId('home.hero.cta')!;
      fireEvent.press(button);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/(main)/deck');
      });
    });

    it('should trigger haptic feedback on press when enabled', async () => {
      const { usePendingSpaceEstimate } = require('../../store/usePendingStore');
      (usePendingSpaceEstimate as jest.Mock).mockReturnValue(15); // > 10MB

      const { queryByTestId } = render(<FloatingSwipeButton />);

      // Wait for button to appear
      await waitFor(
        () => {
          const button = queryByTestId('home.hero.cta');
          expect(button).toBeTruthy();
        },
        { timeout: 4000 }
      );

      const button = queryByTestId('home.hero.cta')!;
      fireEvent.press(button);

      await waitFor(() => {
        expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
      });
    });
  });

  describe('positioning', () => {
    it('should position button with safe area insets', async () => {
      const { usePendingSpaceEstimate } = require('../../store/usePendingStore');
      (usePendingSpaceEstimate as jest.Mock).mockReturnValue(15); // > 10MB

      const { queryByTestId } = render(<FloatingSwipeButton />);

      // Wait for button to appear
      await waitFor(
        () => {
          const button = queryByTestId('home.hero.cta');
          expect(button).toBeTruthy();
        },
        { timeout: 4000 }
      );

      const button = queryByTestId('home.hero.cta')!;
      const style = button.props.style;
      const baseStyle = Array.isArray(style) ? style[0] : style;

      expect(baseStyle.position).toBe('absolute');
      expect(baseStyle.bottom).toBe(85); // 20 (safe area) + 49 (iOS tab bar) + 16 (margin)
      expect(baseStyle.right).toBe(16);
    });
  });

  describe('accessibility', () => {
    it('should have correct accessibility props', async () => {
      const { usePendingSpaceEstimate } = require('../../store/usePendingStore');
      (usePendingSpaceEstimate as jest.Mock).mockReturnValue(15); // > 10MB

      const { queryByTestId } = render(<FloatingSwipeButton />);

      // Wait for button to appear
      await waitFor(
        () => {
          const button = queryByTestId('home.hero.cta');
          expect(button).toBeTruthy();
        },
        { timeout: 4000 }
      );

      const button = queryByTestId('home.hero.cta')!;

      expect(button.props.accessibilityRole).toBe('button');
      expect(button.props.accessibilityLabel).toBe('home.ordenarAhora');
      expect(button.props.accessibilityHint).toBe('Swipe right to dismiss');
    });
  });
});
