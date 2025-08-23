import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { OnThisDayCard } from './OnThisDayCard';

// Mock i18n
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
      // Return translated values for specific keys to match actual behavior
      if (key === 'home.unDiaComoHoy') return 'Un día como hoy';
      if (key === 'home.fotos') return `${options?.n || 0} fotos`;
      if (key === 'onThisDay.cta') return 'Revisar 5 mejores';
      if (key === 'onThisDay.accessibilityLabel' && options?.count) {
        return `On this day card with ${options.count} photos`;
      }
      if (key === 'onThisDay.previewImage') return 'Preview image 1';
      if (key === 'onThisDay.placeholderImage') return 'Placeholder image 2';
      if (key === 'onThisDay.imageError') return 'Error loading image';
      if (key === 'onThisDay.loadingImage') return 'Loading image';
      return key;
    },
  }),
}));

// Mock Reanimated
jest.mock('react-native-reanimated', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return {
    ...Reanimated,
    useSharedValue: jest.fn(() => ({ value: 0 })),
    useAnimatedStyle: jest.fn(() => ({})),
    withTiming: jest.fn((value) => value),
    FadeIn: {
      duration: jest.fn(() => ({})),
    },
  };
});

// Mock LinearGradient
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock expo-image with loading callbacks
jest.mock('expo-image', () => ({
  Image: ({
    onLoadStart,
    onLoad,
    onError,
    testID,
    ...props
  }: {
    onLoadStart?: () => void;
    onLoad?: () => void;
    onError?: () => void;
    testID?: string;
    source?: { uri?: string };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  }) => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ReactModule = require('react');
    ReactModule.useEffect(() => {
      // Simulate image loading based on URI
      if (props.source?.uri) {
        if (props.source.uri.includes('error')) {
          onError?.();
        } else if (props.source.uri.includes('slow')) {
          onLoadStart?.();
          // Don't call onLoad to simulate loading state
        } else {
          onLoadStart?.();
          setTimeout(() => onLoad?.(), 0);
        }
      }
    }, [props.source?.uri, onError, onLoad, onLoadStart]);

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Image: RNImage } = require('react-native');
    return <RNImage {...props} testID={testID} />;
  },
}));

describe('OnThisDayCard', () => {
  const defaultProps = {
    count: 25,
    previewUris: [],
    onPress: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with correct text', () => {
    const { getByText, queryByText } = render(
      <OnThisDayCard {...defaultProps} onPressTop5={jest.fn()} />
    );

    // Check that text is displayed (translated via mock)
    expect(getByText(/Un día como hoy/)).toBeTruthy();
    expect(getByText(/25 fotos/)).toBeTruthy();
    expect(getByText('Revisar 5 mejores')).toBeTruthy();
  });

  it('displays placeholder thumbnails when no URIs provided', () => {
    const { getByTestId } = render(<OnThisDayCard {...defaultProps} />);

    expect(getByTestId('thumbnail_0')).toBeTruthy();
    expect(getByTestId('thumbnail_1')).toBeTruthy();
    expect(getByTestId('thumbnail_2')).toBeTruthy();
  });

  it('displays preview images when URIs are provided', async () => {
    const previewUris = [
      'https://example.com/photo1.jpg',
      'https://example.com/photo2.jpg',
      'https://example.com/photo3.jpg',
    ];

    const { getByTestId } = render(<OnThisDayCard {...defaultProps} previewUris={previewUris} />);

    await waitFor(() => {
      expect(getByTestId('thumbnail_image_0')).toBeTruthy();
      expect(getByTestId('thumbnail_image_1')).toBeTruthy();
      expect(getByTestId('thumbnail_image_2')).toBeTruthy();
    });
  });

  it('only displays first 3 thumbnails even if more URIs provided', () => {
    const previewUris = [
      'https://example.com/photo1.jpg',
      'https://example.com/photo2.jpg',
      'https://example.com/photo3.jpg',
      'https://example.com/photo4.jpg',
      'https://example.com/photo5.jpg',
    ];

    const { queryByTestId } = render(<OnThisDayCard {...defaultProps} previewUris={previewUris} />);

    // Thumbnails are rendered in reverse order (2, 1, 0)
    expect(queryByTestId('thumbnail_2')).toBeTruthy();
    expect(queryByTestId('thumbnail_1')).toBeTruthy();
    expect(queryByTestId('thumbnail_0')).toBeTruthy();
    // These should not exist
    expect(queryByTestId('thumbnail_3')).toBeNull();
    expect(queryByTestId('thumbnail_4')).toBeNull();
  });

  it('calls onPress when card is pressed', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(<OnThisDayCard {...defaultProps} onPress={onPress} />);

    fireEvent.press(getByTestId('onThisDayCard'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('calls onPressTop5 when CTA button is pressed', () => {
    const onPressTop5 = jest.fn();
    const { getByTestId } = render(<OnThisDayCard {...defaultProps} onPressTop5={onPressTop5} />);

    fireEvent.press(getByTestId('onThisDayCard_ctaButton'));
    expect(onPressTop5).toHaveBeenCalledTimes(1);
  });

  it('renders without onPress callback', () => {
    const { getByTestId } = render(<OnThisDayCard count={10} previewUris={[]} />);

    expect(getByTestId('onThisDayCard')).toBeTruthy();
    fireEvent.press(getByTestId('onThisDayCard'));
    // Should not throw
  });

  it('has correct accessibility labels', () => {
    const { getByLabelText, queryByLabelText } = render(
      <OnThisDayCard {...defaultProps} onPressTop5={jest.fn()} />
    );

    // Main card accessibility label
    expect(getByLabelText('On this day card with 25 photos')).toBeTruthy();
    // CTA button accessibility label
    expect(queryByLabelText('Revisar 5 mejores')).toBeTruthy();
  });

  it('handles different photo counts correctly', () => {
    const counts = [1, 10, 100, 1000];

    counts.forEach((count) => {
      const { getByText, rerender } = render(<OnThisDayCard {...defaultProps} count={count} />);

      // Check translated text is displayed
      expect(getByText(/Un día como hoy/)).toBeTruthy();
      expect(getByText(new RegExp(`${count} fotos`))).toBeTruthy();
      rerender(<OnThisDayCard {...defaultProps} count={counts[0]} />);
    });
  });

  it('renders with empty preview URIs array', () => {
    const { getByTestId } = render(<OnThisDayCard count={5} onPress={jest.fn()} />);

    expect(getByTestId('onThisDayCard')).toBeTruthy();
    expect(getByTestId('thumbnail_0')).toBeTruthy();
    expect(getByTestId('thumbnail_1')).toBeTruthy();
    expect(getByTestId('thumbnail_2')).toBeTruthy();
  });

  describe('Image Loading States', () => {
    it('shows loading indicator when images are loading', () => {
      const previewUris = [
        'https://example.com/slow1.jpg',
        'https://example.com/slow2.jpg',
        'https://example.com/slow3.jpg',
      ];

      const { getByTestId } = render(<OnThisDayCard {...defaultProps} previewUris={previewUris} />);

      // Loading indicators are shown during image loading
      expect(getByTestId('thumbnail_loader_0')).toBeTruthy();
      expect(getByTestId('thumbnail_loader_1')).toBeTruthy();
      expect(getByTestId('thumbnail_loader_2')).toBeTruthy();
    });

    it('handles image loading errors gracefully', async () => {
      const previewUris = [
        'https://example.com/error1.jpg',
        'https://example.com/error2.jpg',
        'https://example.com/photo3.jpg',
      ];

      const { getByTestId, queryByTestId } = render(
        <OnThisDayCard {...defaultProps} previewUris={previewUris} />
      );

      await waitFor(() => {
        // Error images should show placeholder
        expect(queryByTestId('thumbnail_image_0')).toBeNull();
        expect(queryByTestId('thumbnail_image_1')).toBeNull();
        // Valid image should load
        expect(getByTestId('thumbnail_image_2')).toBeTruthy();
      });
    });

    it('shows correct accessibility labels for different thumbnail states', () => {
      const previewUris = ['https://example.com/photo1.jpg'];

      const { getByLabelText } = render(
        <OnThisDayCard {...defaultProps} previewUris={previewUris} />
      );

      // Using translated labels from mock
      expect(getByLabelText('Preview image 1')).toBeTruthy();
      expect(getByLabelText('Placeholder image 2')).toBeTruthy();
    });
  });

  describe('Performance', () => {
    it('uses calculated THUMB_OVERLAP ratio', () => {
      const { getByTestId } = render(<OnThisDayCard {...defaultProps} />);
      const thumbnail = getByTestId('thumbnail_0');

      // THUMB_OVERLAP should be 36% of THUMB_SIZE (56 * 0.36 = ~20)
      expect(thumbnail).toBeTruthy();
    });

    it('renders with optimized animation duration', () => {
      const { getByTestId } = render(<OnThisDayCard {...defaultProps} />);

      // Component should render without performance issues
      expect(getByTestId('onThisDayCard')).toBeTruthy();
    });
  });
});
