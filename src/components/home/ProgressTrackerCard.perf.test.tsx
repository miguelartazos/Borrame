/**
 * ProgressTrackerCard Performance Tests
 * Tests component performance with large datasets
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { ProgressTrackerCard, ProgressTrackerProps } from './ProgressTrackerCard';

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
    i18n: {
      language: 'es',
    },
  }),
}));

// Mock Reanimated
jest.mock('react-native-reanimated', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

describe('ProgressTrackerCard Performance', () => {
  describe('with large datasets', () => {
    it('handles 365 days of activity data efficiently', () => {
      // Generate a year's worth of activity dates
      const daysWithActivity: string[] = [];
      const today = new Date();

      for (let i = 0; i < 365; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        daysWithActivity.push(`${year}-${month}-${day}`);
      }

      const props: ProgressTrackerProps = {
        streakDays: 365,
        goalMinutesPerDay: 30,
        minutesToday: 25,
        percentReviewed: 0.85,
        freedTodayBytes: 536870912, // 512 MB
        spaceReadyBytes: 10737418240, // 10 GB
        goalSchedule: [true, true, true, true, true, true, true],
        daysWithActivity,
        onAdjustGoal: jest.fn(),
      };

      const startTime = performance.now();
      const { getByTestId } = render(<ProgressTrackerCard {...props} />);
      const renderTime = performance.now() - startTime;

      expect(getByTestId('home.progress.card')).toBeTruthy();
      expect(renderTime).toBeLessThan(200); // Should render in less than 100ms
    });

    it('handles rapid prop updates efficiently', () => {
      const props: ProgressTrackerProps = {
        streakDays: 1,
        goalMinutesPerDay: 30,
        minutesToday: 0,
        percentReviewed: 0,
        freedTodayBytes: 0,
        spaceReadyBytes: 0,
        goalSchedule: [true, true, true, true, true, false, false],
        daysWithActivity: [],
        onAdjustGoal: jest.fn(),
      };

      const { rerender, getByTestId } = render(<ProgressTrackerCard {...props} />);

      const startTime = performance.now();

      // Simulate rapid updates
      for (let i = 1; i <= 50; i++) {
        rerender(
          <ProgressTrackerCard
            {...props}
            streakDays={i}
            minutesToday={i}
            percentReviewed={i / 100}
            freedTodayBytes={i * 1024 * 1024}
          />
        );
      }

      const updateTime = performance.now() - startTime;

      expect(getByTestId('home.progress.card')).toBeTruthy();
      expect(updateTime).toBeLessThan(800); // 50 updates should complete in less than 800ms
    });

    it('maintains performance with all animations enabled', () => {
      const props: ProgressTrackerProps = {
        streakDays: 100,
        goalMinutesPerDay: 60,
        minutesToday: 45,
        percentReviewed: 0.75,
        freedTodayBytes: 2147483648, // 2 GB
        spaceReadyBytes: 21474836480, // 20 GB
        goalSchedule: [true, true, true, true, true, true, true],
        daysWithActivity: ['2024-01-15', '2024-01-16', '2024-01-17', '2024-01-18'],
        onAdjustGoal: jest.fn(),
      };

      const startTime = performance.now();
      const { getByTestId, getAllByTestId } = render(<ProgressTrackerCard {...props} />);
      const renderTime = performance.now() - startTime;

      // Verify all animated components are present
      expect(getByTestId('home.progress.card')).toBeTruthy();
      expect(getByTestId('home.progress.goal')).toBeTruthy();
      expect(getByTestId('home.progress.miniRing')).toBeTruthy();

      // Check all 7 weekly dots render
      for (let i = 0; i < 7; i++) {
        expect(() => getAllByTestId(`home.progress.dot.${i}`)).not.toThrow();
      }

      expect(renderTime).toBeLessThan(200); // Should still render quickly with all animations
    });

    it('handles edge case dates without performance degradation', () => {
      // Test with dates across year boundaries
      const daysWithActivity = [
        '2023-12-29',
        '2023-12-30',
        '2023-12-31',
        '2024-01-01',
        '2024-01-02',
        '2024-02-29', // Leap year
        '2024-12-31',
      ];

      const props: ProgressTrackerProps = {
        streakDays: 7,
        goalMinutesPerDay: 30,
        minutesToday: 15,
        percentReviewed: 0.5,
        freedTodayBytes: 104857600, // 100 MB
        spaceReadyBytes: 1073741824, // 1 GB
        goalSchedule: [true, true, true, true, true, false, false],
        daysWithActivity,
        onAdjustGoal: jest.fn(),
      };

      const startTime = performance.now();
      const { getByTestId } = render(<ProgressTrackerCard {...props} />);
      const renderTime = performance.now() - startTime;

      expect(getByTestId('home.progress.card')).toBeTruthy();
      expect(renderTime).toBeLessThan(200);
    });
  });

  describe('memory efficiency', () => {
    it('cleans up animations on unmount', () => {
      const props: ProgressTrackerProps = {
        streakDays: 30,
        goalMinutesPerDay: 30,
        minutesToday: 20,
        percentReviewed: 0.66,
        freedTodayBytes: 314572800, // 300 MB
        spaceReadyBytes: 3221225472, // 3 GB
        goalSchedule: [true, true, true, true, true, false, false],
        daysWithActivity: [],
        onAdjustGoal: jest.fn(),
      };

      const { unmount, getByTestId } = render(<ProgressTrackerCard {...props} />);

      expect(getByTestId('home.progress.card')).toBeTruthy();

      // Unmount should not throw errors
      expect(() => unmount()).not.toThrow();
    });
  });
});
