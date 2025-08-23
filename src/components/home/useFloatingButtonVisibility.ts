import { useEffect, useRef, useCallback } from 'react';
import type { SharedValue } from 'react-native-reanimated';
import { withTiming, withSpring, runOnJS, useAnimatedReaction } from 'react-native-reanimated';

interface UseFloatingButtonVisibilityProps {
  scrollY?: SharedValue<number>;
  visibility: SharedValue<number>;
  translateY: SharedValue<number>;
  isScrolling: SharedValue<boolean>;
  spaceReady: number;
  minSpaceMB: number;
  scrollHideThreshold: number;
  idleShowDelay: number;
  initialShowDelay: number;
  onVisibilityChange: (visible: boolean) => void;
}

export function useFloatingButtonVisibility({
  scrollY,
  visibility,
  translateY,
  isScrolling,
  spaceReady,
  minSpaceMB,
  scrollHideThreshold,
  idleShowDelay,
  initialShowDelay,
  onVisibilityChange,
}: UseFloatingButtonVisibilityProps) {
  const dismissedUntil = useRef<number>(0);
  const idleTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const hasInitiallyShown = useRef(false);
  const isVisible = useRef(false);

  // Initial show with delay
  useEffect(() => {
    if (!hasInitiallyShown.current && spaceReady > minSpaceMB) {
      const timer = setTimeout(() => {
        hasInitiallyShown.current = true;
        isVisible.current = true;
        visibility.value = withSpring(1);
        translateY.value = withSpring(0);
        onVisibilityChange(true);
      }, initialShowDelay);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [spaceReady, minSpaceMB, visibility, translateY, initialShowDelay, onVisibilityChange]);

  // Reset idle timer
  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }

    idleTimerRef.current = setTimeout(() => {
      if (spaceReady > minSpaceMB && dismissedUntil.current < Date.now()) {
        visibility.value = withTiming(1, { duration: 300 });
        isVisible.current = true;
        onVisibilityChange(true);
      }
    }, idleShowDelay);
  }, [spaceReady, minSpaceMB, visibility, idleShowDelay, onVisibilityChange]);

  // Handle scroll-based visibility
  useAnimatedReaction(
    () => scrollY?.value ?? 0,
    (currentY, previousY) => {
      'worklet';
      if (!hasInitiallyShown.current || previousY === null) return;

      const scrollDelta = currentY - previousY;

      // Update scroll state
      if (Math.abs(scrollDelta) > 2) {
        isScrolling.value = true;
        runOnJS(resetIdleTimer)();
      }

      // Hide when scrolling down
      if (scrollDelta > 5 && currentY > scrollHideThreshold) {
        visibility.value = withTiming(0, { duration: 200 });
        runOnJS(() => {
          isVisible.current = false;
          onVisibilityChange(false);
        })();
      }
      // Show when scrolling up or near top
      else if (scrollDelta < -5 || currentY < 20) {
        runOnJS(() => {
          const now = Date.now();
          if (dismissedUntil.current < now && spaceReady > minSpaceMB) {
            isVisible.current = true;
            visibility.value = withTiming(1, { duration: 300 });
            onVisibilityChange(true);
          }
        })();
      }
    },
    [spaceReady, minSpaceMB, scrollHideThreshold, resetIdleTimer]
  );

  // Cleanup
  useEffect(() => {
    return () => {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
    };
  }, []);

  const dismiss = useCallback(
    (duration: number = 30 * 60 * 1000) => {
      dismissedUntil.current = Date.now() + duration;
      visibility.value = withTiming(0, { duration: 200 });
      isVisible.current = false;
      onVisibilityChange(false);
    },
    [visibility, onVisibilityChange]
  );

  return {
    dismiss,
    isVisible: isVisible.current,
    hasInitiallyShown: hasInitiallyShown.current,
  };
}
