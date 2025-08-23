import { AccessibilityInfo } from 'react-native';
import {
  announceFocusChange,
  announceScreenTransition,
  announceAction,
  setAccessibilityFocus,
  FOCUS_DELAY,
} from './a11y';

// Mock AccessibilityInfo
jest.mock('react-native', () => ({
  AccessibilityInfo: {
    announceForAccessibility: jest.fn(),
    setAccessibilityFocus: jest.fn(),
  },
}));

describe('Accessibility Focus Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('announceFocusChange', () => {
    it('should announce focus changes with proper formatting', () => {
      announceFocusChange('Button', 'Delete photo');

      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
        'Button: Delete photo'
      );
    });

    it('should handle component type only', () => {
      announceFocusChange('Header');

      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith('Header');
    });

    it('should handle empty description gracefully', () => {
      announceFocusChange('Card', '');

      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith('Card');
    });

    it('should not announce if no component type provided', () => {
      announceFocusChange('', 'Some description');

      expect(AccessibilityInfo.announceForAccessibility).not.toHaveBeenCalled();
    });
  });

  describe('announceScreenTransition', () => {
    it('should announce screen transitions', () => {
      announceScreenTransition('Settings');

      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
        'Navigated to Settings screen'
      );
    });

    it('should handle multi-word screen names', () => {
      announceScreenTransition('Photo Library');

      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
        'Navigated to Photo Library screen'
      );
    });

    it('should not announce for empty screen name', () => {
      announceScreenTransition('');

      expect(AccessibilityInfo.announceForAccessibility).not.toHaveBeenCalled();
    });
  });

  describe('announceAction', () => {
    it('should announce completed actions', () => {
      announceAction('Photo deleted');

      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith('Photo deleted');
    });

    it('should announce actions with result', () => {
      announceAction('Saved', 'All changes saved successfully');

      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
        'Saved. All changes saved successfully'
      );
    });

    it('should handle empty action gracefully', () => {
      announceAction('', 'Result message');

      expect(AccessibilityInfo.announceForAccessibility).not.toHaveBeenCalled();
    });

    it('should announce action even with empty result', () => {
      announceAction('Loading complete', '');

      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith('Loading complete');
    });
  });

  describe('setAccessibilityFocus', () => {
    it('should set focus after default delay', () => {
      const mockRef = { current: { focus: jest.fn() } };
      setAccessibilityFocus(mockRef as any);

      expect(mockRef.current.focus).not.toHaveBeenCalled();

      jest.advanceTimersByTime(FOCUS_DELAY);

      expect(AccessibilityInfo.setAccessibilityFocus).toHaveBeenCalledWith(mockRef.current);
    });

    it('should handle custom delay', () => {
      const mockRef = { current: { focus: jest.fn() } };
      const customDelay = 500;
      setAccessibilityFocus(mockRef as any, customDelay);

      jest.advanceTimersByTime(customDelay - 1);
      expect(AccessibilityInfo.setAccessibilityFocus).not.toHaveBeenCalled();

      jest.advanceTimersByTime(1);
      expect(AccessibilityInfo.setAccessibilityFocus).toHaveBeenCalledWith(mockRef.current);
    });

    it('should not set focus if ref is null', () => {
      const mockRef = { current: null };
      setAccessibilityFocus(mockRef as any);

      jest.advanceTimersByTime(FOCUS_DELAY);

      expect(AccessibilityInfo.setAccessibilityFocus).not.toHaveBeenCalled();
    });

    it('should clear previous timeout on multiple calls', () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      const mockRef = { current: { focus: jest.fn() } };

      const timeout1 = setAccessibilityFocus(mockRef as any);
      const timeout2 = setAccessibilityFocus(mockRef as any);

      expect(clearTimeoutSpy).toHaveBeenCalledWith(timeout1);
      expect(timeout1).not.toBe(timeout2);

      clearTimeoutSpy.mockRestore();
    });
  });

  describe('Complex focus scenarios', () => {
    it('should handle rapid focus changes', () => {
      const mockRef1 = { current: { focus: jest.fn() } };
      const mockRef2 = { current: { focus: jest.fn() } };

      setAccessibilityFocus(mockRef1 as any);
      jest.advanceTimersByTime(FOCUS_DELAY / 2);

      setAccessibilityFocus(mockRef2 as any);
      jest.advanceTimersByTime(FOCUS_DELAY);

      // Only the second ref should receive focus
      expect(AccessibilityInfo.setAccessibilityFocus).toHaveBeenCalledTimes(1);
      expect(AccessibilityInfo.setAccessibilityFocus).toHaveBeenCalledWith(mockRef2.current);
    });

    it('should handle screen transition with focus', () => {
      const mockRef = { current: { focus: jest.fn() } };

      announceScreenTransition('Gallery');
      setAccessibilityFocus(mockRef as any, 300);

      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
        'Navigated to Gallery screen'
      );

      jest.advanceTimersByTime(300);
      expect(AccessibilityInfo.setAccessibilityFocus).toHaveBeenCalledWith(mockRef.current);
    });

    it('should handle action announcement with subsequent focus', () => {
      const mockRef = { current: { focus: jest.fn() } };

      announceAction('5 photos deleted', 'Freed 25MB of space');
      setAccessibilityFocus(mockRef as any);

      expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
        '5 photos deleted. Freed 25MB of space'
      );

      jest.advanceTimersByTime(FOCUS_DELAY);
      expect(AccessibilityInfo.setAccessibilityFocus).toHaveBeenCalledWith(mockRef.current);
    });
  });

  describe('Error handling', () => {
    it('should handle AccessibilityInfo errors gracefully', () => {
      (AccessibilityInfo.announceForAccessibility as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Platform error');
      });

      expect(() => announceAction('Test action')).not.toThrow();
    });

    it('should handle setAccessibilityFocus errors', () => {
      const mockRef = { current: { focus: jest.fn() } };
      (AccessibilityInfo.setAccessibilityFocus as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Focus error');
      });

      setAccessibilityFocus(mockRef as any);
      jest.advanceTimersByTime(FOCUS_DELAY);

      expect(() => jest.runAllTimers()).not.toThrow();
    });

    it('should clean up timeouts on unmount simulation', () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      const mockRef = { current: { focus: jest.fn() } };

      const timeout = setAccessibilityFocus(mockRef as any);
      clearTimeout(timeout);

      expect(clearTimeoutSpy).toHaveBeenCalledWith(timeout);
      clearTimeoutSpy.mockRestore();
    });
  });
});
