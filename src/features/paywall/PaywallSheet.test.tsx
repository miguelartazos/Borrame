import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { PaywallSheet } from './PaywallSheetV2';
import { useLimitsStore } from '../limits/useLimitsStore';
import { analytics } from '../../lib/analytics';
import * as Haptics from 'expo-haptics';

jest.mock('../limits/useLimitsStore');
jest.mock('../../lib/analytics');
jest.mock('../../lib/logger');
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
}));
jest.mock('../../store/useSettings', () => ({
  useSettings: jest.fn((selector) => {
    if (typeof selector === 'function') {
      return selector({ hapticFeedback: true });
    }
    return true;
  }),
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { count?: number }) => {
      if (options?.count) return `${key} ${options.count}`;
      return key;
    },
  }),
}));
jest.mock('expo-blur', () => ({
  BlurView: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: ({ children }: { children: React.ReactNode }) => children,
  GestureDetector: ({ children }: { children: React.ReactNode }) => children,
  Gesture: {
    Pan: () => ({
      onUpdate: () => ({
        onEnd: () => ({}),
      }),
    }),
  },
}));

jest.mock('react-native-reanimated', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return {
    ...Reanimated,
    useSharedValue: jest.fn((value) => ({ value })),
    useAnimatedStyle: jest.fn(() => ({})),
    withSpring: jest.fn((value) => value),
    withTiming: jest.fn((value) => value),
    cancelAnimation: jest.fn(),
    runOnJS: jest.fn((fn) => fn),
  };
});

describe('PaywallSheet', () => {
  const mockUnlockPro = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useLimitsStore as unknown as jest.Mock).mockReturnValue({
      unlockPro: mockUnlockPro,
      isPro: false,
    });
  });

  describe('rendering', () => {
    it('should not render when visible is false', () => {
      const { queryByText } = render(<PaywallSheet visible={false} onClose={mockOnClose} />);

      expect(queryByText('paywall.unlock_pro_title')).toBeNull();
    });

    it('should render when visible is true', () => {
      const { getByText } = render(<PaywallSheet visible={true} onClose={mockOnClose} />);

      expect(getByText('paywall.unlock_pro_title')).toBeTruthy();
    });

    it('should show bundle-specific title when bundleKey provided', () => {
      const { getByText } = render(
        <PaywallSheet visible={true} onClose={mockOnClose} bundleKey="similar" />
      );

      expect(getByText('paywall.unlock_bundle_title')).toBeTruthy();
    });

    it('should render preview items when provided', () => {
      const previewItems = [
        { id: '1', uri: 'test1.jpg' },
        { id: '2', uri: 'test2.jpg' },
        { id: '3', uri: 'test3.jpg' },
      ];

      const { getByText } = render(
        <PaywallSheet visible={true} onClose={mockOnClose} previewItems={previewItems} />
      );

      expect(getByText('paywall.preview_title 3')).toBeTruthy();
    });

    it('should display all benefit items', () => {
      const { getByText } = render(<PaywallSheet visible={true} onClose={mockOnClose} />);

      expect(getByText('paywall.benefits.smart_detection')).toBeTruthy();
      expect(getByText('paywall.benefits.unlimited_deletes')).toBeTruthy();
      expect(getByText('paywall.benefits.priority_support')).toBeTruthy();
    });

    it('should display pricing options', () => {
      const { getByText } = render(<PaywallSheet visible={true} onClose={mockOnClose} />);

      expect(getByText('paywall.yearly_plan')).toBeTruthy();
      expect(getByText('$39.99')).toBeTruthy();
      expect(getByText('paywall.monthly_plan')).toBeTruthy();
      expect(getByText('$4.99')).toBeTruthy();
    });
  });

  describe('analytics tracking', () => {
    it('should track view event when sheet becomes visible', () => {
      render(
        <PaywallSheet
          visible={true}
          onClose={mockOnClose}
          triggerPoint="test_trigger"
          bundleKey="similar"
        />
      );

      expect(analytics.track).toHaveBeenCalledWith('paywall_viewed', {
        trigger: 'test_trigger',
        bundle: 'similar',
      });
    });

    it('should track unlock click event', async () => {
      const { getByText } = render(
        <PaywallSheet
          visible={true}
          onClose={mockOnClose}
          triggerPoint="test_trigger"
          bundleKey="blurry"
        />
      );

      const ctaButton = getByText('paywall.activate_pro_clean_all');
      fireEvent.press(ctaButton);

      await waitFor(() => {
        expect(analytics.track).toHaveBeenCalledWith('paywall_cta_click', {
          trigger: 'test_trigger',
          bundle: 'blurry',
        });
      });
    });

    it('should track dismiss event when closing', () => {
      const { getByText } = render(
        <PaywallSheet visible={true} onClose={mockOnClose} triggerPoint="test_trigger" />
      );

      const skipButton = getByText('paywall.maybe_later');
      fireEvent.press(skipButton);

      expect(analytics.track).toHaveBeenCalledWith('paywall_viewed', {
        trigger: 'test_trigger',
        bundle: undefined,
      });
    });
  });

  describe('user interactions', () => {
    it('should call unlockPro when CTA button pressed', async () => {
      const { getByText } = render(<PaywallSheet visible={true} onClose={mockOnClose} />);

      const ctaButton = getByText('paywall.activate_pro_clean_all');
      fireEvent.press(ctaButton);

      await waitFor(() => {
        expect(mockUnlockPro).toHaveBeenCalled();
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('should call onClose when skip button pressed', () => {
      const { getByText } = render(<PaywallSheet visible={true} onClose={mockOnClose} />);

      const skipButton = getByText('paywall.maybe_later');
      fireEvent.press(skipButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should trigger haptic feedback when unlocking', async () => {
      const { getByText } = render(<PaywallSheet visible={true} onClose={mockOnClose} />);

      const ctaButton = getByText('paywall.activate_pro_clean_all');
      fireEvent.press(ctaButton);

      await waitFor(() => {
        expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);
      });
    });

    it('should call unlockPro from yearly plan card', async () => {
      const { getAllByText } = render(<PaywallSheet visible={true} onClose={mockOnClose} />);

      const yearlyCard = getAllByText('$39.99')[0].parent?.parent;
      if (yearlyCard) {
        fireEvent.press(yearlyCard);
      }

      await waitFor(() => {
        expect(mockUnlockPro).toHaveBeenCalled();
      });
    });

    it('should call unlockPro from monthly plan card', async () => {
      const { getAllByText } = render(<PaywallSheet visible={true} onClose={mockOnClose} />);

      const monthlyCard = getAllByText('$4.99')[0].parent?.parent;
      if (monthlyCard) {
        fireEvent.press(monthlyCard);
      }

      await waitFor(() => {
        expect(mockUnlockPro).toHaveBeenCalled();
      });
    });
  });

  describe('preview grid', () => {
    it('should limit preview items to 6', () => {
      const manyItems = Array.from({ length: 10 }, (_, i) => ({
        id: `item-${i}`,
        uri: `test${i}.jpg`,
      }));

      const { queryAllByTestId } = render(
        <PaywallSheet visible={true} onClose={mockOnClose} previewItems={manyItems} />
      );

      const previewElements = queryAllByTestId(/preview-/);
      expect(previewElements.length).toBeLessThanOrEqual(6);
    });

    it('should not render preview section when no items', () => {
      const { queryByText } = render(
        <PaywallSheet visible={true} onClose={mockOnClose} previewItems={[]} />
      );

      expect(queryByText(/paywall.preview_title/)).toBeNull();
    });
  });
});
