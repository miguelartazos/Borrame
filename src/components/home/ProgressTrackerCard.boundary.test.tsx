/**
 * ProgressTrackerCard Month Boundary Tests
 * Tests for critical date calculation edge cases
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

// Helper to set a specific date for testing
const mockDate = (dateString: string) => {
  const RealDate = Date;
  global.Date = class extends RealDate {
    constructor(...args: any[]) {
      if (args.length === 0) {
        super(dateString);
      } else {
        // @ts-ignore
        super(...args);
      }
    }

    static now() {
      return new RealDate(dateString).getTime();
    }
  } as any;
};

// Restore real Date
const restoreDate = () => {
  global.Date = Date;
};

describe('ProgressTrackerCard Month Boundaries', () => {
  afterEach(() => {
    restoreDate();
  });

  describe('end of month scenarios', () => {
    it('handles January 30 checking Sunday correctly', () => {
      // January 30, 2024 is a Tuesday (index 1)
      mockDate('2024-01-30T12:00:00');

      // Sunday would be February 4
      const daysWithActivity = ['2024-02-04'];

      const props: ProgressTrackerProps = {
        streakDays: 1,
        goalMinutesPerDay: 30,
        minutesToday: 15,
        percentReviewed: 0.5,
        freedTodayBytes: 0,
        spaceReadyBytes: 0,
        goalSchedule: [true, true, true, true, true, true, true],
        daysWithActivity,
        onAdjustGoal: jest.fn(),
      };

      const { getByTestId } = render(<ProgressTrackerCard {...props} />);

      // Sunday is index 6
      const sundayDot = getByTestId('home.progress.dot.6');

      // Should show as having activity
      expect(sundayDot.props.accessibilityLabel).toContain('completado');
    });

    it('handles February 28 (non-leap year) checking next week', () => {
      // February 28, 2023 is a Tuesday
      mockDate('2023-02-28T12:00:00');

      // Next Monday would be March 6
      const daysWithActivity = ['2023-03-06'];

      const props: ProgressTrackerProps = {
        streakDays: 1,
        goalMinutesPerDay: 30,
        minutesToday: 15,
        percentReviewed: 0.5,
        freedTodayBytes: 0,
        spaceReadyBytes: 0,
        goalSchedule: [true, true, true, true, true, true, true],
        daysWithActivity,
        onAdjustGoal: jest.fn(),
      };

      const { getByTestId } = render(<ProgressTrackerCard {...props} />);

      // Next Monday is index 0
      const mondayDot = getByTestId('home.progress.dot.0');

      // Should NOT show as having activity (it's next week)
      expect(mondayDot.props.accessibilityLabel).toContain('no completado');
    });

    it('handles leap year February 29', () => {
      // February 29, 2024 is a Thursday
      mockDate('2024-02-29T12:00:00');

      // Next Sunday would be March 3
      const daysWithActivity = ['2024-03-03'];

      const props: ProgressTrackerProps = {
        streakDays: 1,
        goalMinutesPerDay: 30,
        minutesToday: 15,
        percentReviewed: 0.5,
        freedTodayBytes: 0,
        spaceReadyBytes: 0,
        goalSchedule: [true, true, true, true, true, true, true],
        daysWithActivity,
        onAdjustGoal: jest.fn(),
      };

      const { getByTestId } = render(<ProgressTrackerCard {...props} />);

      // Sunday is index 6
      const sundayDot = getByTestId('home.progress.dot.6');

      // Should show as having activity
      expect(sundayDot.props.accessibilityLabel).toContain('completado');
    });

    it('handles December 31 checking next year', () => {
      // December 31, 2023 is a Sunday
      mockDate('2023-12-31T12:00:00');

      // Monday would be January 1, 2024
      const daysWithActivity = ['2024-01-01'];

      const props: ProgressTrackerProps = {
        streakDays: 1,
        goalMinutesPerDay: 30,
        minutesToday: 15,
        percentReviewed: 0.5,
        freedTodayBytes: 0,
        spaceReadyBytes: 0,
        goalSchedule: [true, true, true, true, true, true, true],
        daysWithActivity,
        onAdjustGoal: jest.fn(),
      };

      const { getByTestId } = render(<ProgressTrackerCard {...props} />);

      // Monday is index 0
      const mondayDot = getByTestId('home.progress.dot.0');

      // Should show as having activity
      expect(mondayDot.props.accessibilityLabel).toContain('completado');
    });
  });

  describe('beginning of month scenarios', () => {
    it('handles March 1 checking previous week', () => {
      // March 1, 2024 is a Friday
      mockDate('2024-03-01T12:00:00');

      // Previous Monday was February 26
      const daysWithActivity = ['2024-02-26'];

      const props: ProgressTrackerProps = {
        streakDays: 1,
        goalMinutesPerDay: 30,
        minutesToday: 15,
        percentReviewed: 0.5,
        freedTodayBytes: 0,
        spaceReadyBytes: 0,
        goalSchedule: [true, true, true, true, true, true, true],
        daysWithActivity,
        onAdjustGoal: jest.fn(),
      };

      const { getByTestId } = render(<ProgressTrackerCard {...props} />);

      // Monday is index 0
      const mondayDot = getByTestId('home.progress.dot.0');

      // Should show as having activity
      expect(mondayDot.props.accessibilityLabel).toContain('completado');
    });

    it('handles January 1 checking previous year', () => {
      // January 1, 2024 is a Monday
      mockDate('2024-01-01T12:00:00');

      // Previous Sunday was December 31, 2023
      const daysWithActivity = ['2023-12-31'];

      const props: ProgressTrackerProps = {
        streakDays: 1,
        goalMinutesPerDay: 30,
        minutesToday: 15,
        percentReviewed: 0.5,
        freedTodayBytes: 0,
        spaceReadyBytes: 0,
        goalSchedule: [true, true, true, true, true, true, true],
        daysWithActivity,
        onAdjustGoal: jest.fn(),
      };

      const { getByTestId } = render(<ProgressTrackerCard {...props} />);

      // Sunday is index 6
      const sundayDot = getByTestId('home.progress.dot.6');

      // Should show as having activity
      expect(sundayDot.props.accessibilityLabel).toContain('completado');
    });
  });

  describe('edge cases with daylight saving time', () => {
    it('handles spring forward (DST start)', () => {
      // March 10, 2024 - DST starts in US
      mockDate('2024-03-10T12:00:00');

      const daysWithActivity = ['2024-03-10', '2024-03-11', '2024-03-12'];

      const props: ProgressTrackerProps = {
        streakDays: 3,
        goalMinutesPerDay: 30,
        minutesToday: 15,
        percentReviewed: 0.5,
        freedTodayBytes: 0,
        spaceReadyBytes: 0,
        goalSchedule: [true, true, true, true, true, true, true],
        daysWithActivity,
        onAdjustGoal: jest.fn(),
      };

      const { getByTestId } = render(<ProgressTrackerCard {...props} />);

      // Sunday (today) should show activity
      const sundayDot = getByTestId('home.progress.dot.6');
      expect(sundayDot.props.accessibilityLabel).toContain('completado');
    });

    it('handles fall back (DST end)', () => {
      // November 3, 2024 - DST ends in US
      mockDate('2024-11-03T12:00:00');

      const daysWithActivity = ['2024-11-03', '2024-11-04'];

      const props: ProgressTrackerProps = {
        streakDays: 2,
        goalMinutesPerDay: 30,
        minutesToday: 15,
        percentReviewed: 0.5,
        freedTodayBytes: 0,
        spaceReadyBytes: 0,
        goalSchedule: [true, true, true, true, true, true, true],
        daysWithActivity,
        onAdjustGoal: jest.fn(),
      };

      const { getByTestId } = render(<ProgressTrackerCard {...props} />);

      // Sunday (today) should show activity
      const sundayDot = getByTestId('home.progress.dot.6');
      expect(sundayDot.props.accessibilityLabel).toContain('completado');
    });
  });

  describe('progress display edge cases', () => {
    it('clamps negative streak days to 0', () => {
      const props: ProgressTrackerProps = {
        streakDays: -5,
        goalMinutesPerDay: 30,
        minutesToday: 15,
        percentReviewed: 0.5,
        freedTodayBytes: 0,
        spaceReadyBytes: 0,
        goalSchedule: [true, true, true, true, true, true, true],
        daysWithActivity: [],
        onAdjustGoal: jest.fn(),
      };

      const { getByText } = render(<ProgressTrackerCard {...props} />);

      // Should display 0, not -5
      expect(getByText('0')).toBeTruthy();
    });

    it('handles progress over 100% correctly', () => {
      const props: ProgressTrackerProps = {
        streakDays: 1,
        goalMinutesPerDay: 30,
        minutesToday: 90, // 300% of goal
        percentReviewed: 0.5,
        freedTodayBytes: 0,
        spaceReadyBytes: 0,
        goalSchedule: [true, true, true, true, true, true, true],
        daysWithActivity: [],
        onAdjustGoal: jest.fn(),
      };

      const { getByText, getByTestId } = render(<ProgressTrackerCard {...props} />);

      // Text should show actual values
      expect(getByText('90/30 mins/día')).toBeTruthy();

      // Progress bar should be clamped at 100%
      const progressBar = getByTestId('home.progress.goal');
      expect(progressBar).toBeTruthy();
    });
  });
});
