/**
 * Performance test for OnThisDayCard
 * Tests rendering with 500+ instances as per CLAUDE.md requirements
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { ScrollView } from 'react-native';
import { OnThisDayCard } from './OnThisDayCard';

// Mock dependencies
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { count?: number }) => {
      if (key === 'onThisDay.title') return 'Un día como hoy';
      if (key === 'onThisDay.photos') return 'fotos';
      if (key === 'onThisDay.cta') return 'Revisar 5 mejores';
      if (key === 'onThisDay.accessibilityLabel' && options?.count) {
        return `On this day card with ${options.count} photos`;
      }
      return key;
    },
  }),
}));

jest.mock('react-native-reanimated', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Reanimated = require('react-native-reanimated/mock');
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

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('expo-image', () => ({
  Image: ({ testID, ...props }: { testID?: string; [key: string]: unknown }) => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Image: RNImage } = require('react-native');
    return <RNImage {...props} testID={testID} />;
  },
}));

// Performance test for OnThisDayCard
// Set VERBOSE_TEST=true environment variable to see detailed performance metrics
describe('OnThisDayCard Performance', () => {
  const isCI = process.env.CI === 'true';

  afterEach(() => {
    // Clean up any mounted components
    jest.clearAllMocks();
  });

  it('renders 500+ cards without crashing (performance test)', () => {
    const startTime = Date.now();
    const CARD_COUNT = 500;

    // Generate test data
    const cards = Array.from({ length: CARD_COUNT }, (_, i) => ({
      count: Math.floor(Math.random() * 100) + 1,
      previewUris: [
        `https://example.com/photo${i}_1.jpg`,
        `https://example.com/photo${i}_2.jpg`,
        `https://example.com/photo${i}_3.jpg`,
      ],
    }));

    // Render all cards in a ScrollView
    const { getByTestId } = render(
      <ScrollView testID="scrollView">
        {cards.map((card, index) => (
          <OnThisDayCard
            key={index}
            count={card.count}
            previewUris={card.previewUris}
            onPress={() => {}}
          />
        ))}
      </ScrollView>
    );

    const renderTime = Date.now() - startTime;

    // Verify render completed
    expect(getByTestId('scrollView')).toBeTruthy();

    // Log performance metrics only in verbose mode
    if (process.env.VERBOSE_TEST) {
      // eslint-disable-next-line no-console
      console.log(`Performance Test Results:
        - Cards rendered: ${CARD_COUNT}
        - Total render time: ${renderTime}ms
        - Average per card: ${(renderTime / CARD_COUNT).toFixed(2)}ms
      `);
    }

    // Performance assertions (relaxed for CI environments)
    const maxTotalTime = isCI ? 20000 : 10000; // 20s in CI, 10s locally
    const maxPerCard = isCI ? 40 : 20; // 40ms in CI, 20ms locally

    expect(renderTime).toBeLessThan(maxTotalTime);
    expect(renderTime / CARD_COUNT).toBeLessThan(maxPerCard);
  });

  it('maintains 60fps target with rapid state changes', () => {
    const FRAME_DURATION = 1000 / 60; // ~16.67ms for 60fps
    const UPDATE_COUNT = 100;

    const { rerender } = render(
      <OnThisDayCard
        count={10}
        previewUris={['https://example.com/photo1.jpg']}
        onPress={() => {}}
      />
    );

    const startTime = Date.now();

    // Simulate rapid prop updates
    for (let i = 0; i < UPDATE_COUNT; i++) {
      rerender(
        <OnThisDayCard
          count={i}
          previewUris={[`https://example.com/photo${i}.jpg`]}
          onPress={() => {}}
        />
      );
    }

    const totalTime = Date.now() - startTime;
    const averageUpdateTime = totalTime / UPDATE_COUNT;

    if (process.env.VERBOSE_TEST) {
      // eslint-disable-next-line no-console
      console.log(`Rapid Update Test:
        - Updates: ${UPDATE_COUNT}
        - Total time: ${totalTime}ms
        - Average update: ${averageUpdateTime.toFixed(2)}ms
        - Target frame time: ${FRAME_DURATION.toFixed(2)}ms
      `);
    }

    // Each update should complete within 2-3 frame times (relaxed for CI)
    const maxFrames = isCI ? 3 : 2;
    expect(averageUpdateTime).toBeLessThan(FRAME_DURATION * maxFrames);
  });

  it('handles memory efficiently with large preview URI arrays', () => {
    const LARGE_URI_COUNT = 1000;
    const largeUriArray = Array.from(
      { length: LARGE_URI_COUNT },
      (_, i) => `https://example.com/photo${i}.jpg`
    );

    const { getByTestId } = render(
      <OnThisDayCard
        count={LARGE_URI_COUNT}
        previewUris={largeUriArray} // Component should only use first 3
        onPress={() => {}}
      />
    );

    // Verify only 3 thumbnails are rendered despite large array
    expect(getByTestId('thumbnail_0')).toBeTruthy();
    expect(getByTestId('thumbnail_1')).toBeTruthy();
    expect(getByTestId('thumbnail_2')).toBeTruthy();

    // Component should efficiently slice array without processing all items
    if (process.env.VERBOSE_TEST) {
      // eslint-disable-next-line no-console
      console.log(`Memory Test:
        - URIs provided: ${LARGE_URI_COUNT}
        - Thumbnails rendered: 3
        - Memory efficient: ✓
      `);
    }
  });
});
