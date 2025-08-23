/**
 * useReducedMotion Hook
 * Checks system accessibility settings for reduced motion preference
 */

import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

export function useReducedMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    // Check initial state
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      setReduceMotion(enabled);
    });

    // Subscribe to changes
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);

    return () => {
      subscription?.remove();
    };
  }, []);

  return reduceMotion;
}

// Hook for conditionally applying animations
export function useAccessibleAnimation<T>(animation: T, fallback: T, forceDisable = false): T {
  const reduceMotion = useReducedMotion();
  return reduceMotion || forceDisable ? fallback : animation;
}
