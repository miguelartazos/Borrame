import React, { useCallback, useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  ScrollView,
  Dimensions,
  Platform,
  type ModalProps,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  cancelAnimation,
} from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { useLimitsStore } from '../limits/useLimitsStore';
import { useSettings } from '../../store/useSettings';
import { analytics } from '../../lib/analytics';
import { logger } from '../../lib/logger';
import { theme } from '../../ui';
import { useTranslation } from 'react-i18next';
import { testID as makeTestID } from '../../lib/a11y';
import { PaywallHeader } from './components/PaywallHeader';
import { PaywallBenefits } from './components/PaywallBenefits';
import { PaywallPricing } from './components/PaywallPricing';
import { PaywallPreview } from './components/PaywallPreview';

interface PaywallSheetProps {
  visible: boolean;
  onClose: () => void;
  triggerPoint?: string;
  previewItems?: Array<{
    id: string;
    uri?: string;
    title?: string;
  }>;
  bundleKey?: string;
}

const SHEET_HEIGHT = Dimensions.get('window').height * 0.9;
const DISMISS_THRESHOLD = SHEET_HEIGHT * 0.3;
const DISMISS_VELOCITY = 500;

export const PaywallSheet: React.FC<PaywallSheetProps> = ({
  visible,
  onClose,
  triggerPoint = 'bundle_locked',
  previewItems = [],
  bundleKey,
}) => {
  const { t } = useTranslation();
  const hapticFeedback = useSettings((s) => s.hapticFeedback);
  const { unlockPro, isPro } = useLimitsStore();
  const [isUnlocking, setIsUnlocking] = useState(false);
  const isMountedRef = useRef(true);

  // Reanimated shared values
  const translateY = useSharedValue(SHEET_HEIGHT);
  const backdropOpacity = useSharedValue(0);

  // Don't show if user is already Pro
  useEffect(() => {
    let cancelled = false;

    if (isPro && visible && !cancelled) {
      // Delay slightly to avoid race with animation
      const timer = setTimeout(() => {
        if (!cancelled) {
          onClose();
        }
      }, 100);

      return () => {
        cancelled = true;
        clearTimeout(timer);
      };
    }

    return () => {
      cancelled = true;
    };
  }, [isPro, visible, onClose]);

  // Track view event
  useEffect(() => {
    if (visible) {
      analytics.track('paywall_viewed', {
        trigger: triggerPoint,
        bundle: bundleKey,
      });
    }
  }, [visible, triggerPoint, bundleKey]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // Cancel any running animations on unmount
      cancelAnimation(translateY);
      cancelAnimation(backdropOpacity);
    };
  }, [translateY, backdropOpacity]);

  // Animate in/out
  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, {
        damping: 50,
        stiffness: 500,
      });
      backdropOpacity.value = withTiming(0.5, { duration: 300 });
    } else {
      translateY.value = withTiming(SHEET_HEIGHT, { duration: 250 });
      backdropOpacity.value = withTiming(0, { duration: 250 });
    }
  }, [visible, translateY, backdropOpacity]);

  const handleClose = useCallback(() => {
    'worklet';
    // Batch both operations in a single runOnJS call
    runOnJS(() => {
      analytics.track('paywall_viewed', {
        trigger: triggerPoint,
        bundle: bundleKey,
      });
      onClose();
    })();
  }, [triggerPoint, bundleKey, onClose]);

  const dismissSheet = useCallback(() => {
    'worklet';
    translateY.value = withTiming(SHEET_HEIGHT, { duration: 250 });
    backdropOpacity.value = withTiming(0, { duration: 250 });
    runOnJS(handleClose)();
  }, [translateY, backdropOpacity, handleClose]);

  // Pan gesture for drag to dismiss
  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      'worklet';
      if (event.translationY > 0) {
        translateY.value = event.translationY;
      }
    })
    .onEnd((event) => {
      'worklet';
      if (event.translationY > DISMISS_THRESHOLD || event.velocityY > DISMISS_VELOCITY) {
        dismissSheet();
      } else {
        translateY.value = withSpring(0, {
          damping: 50,
          stiffness: 500,
        });
      }
    });

  const handleUnlockPro = useCallback(
    async (plan: 'monthly' | 'annual') => {
      if (isUnlocking) return;

      if (hapticFeedback) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch((error) => {
          logger.warn('Haptic feedback failed:', error);
        });
      }

      analytics.track('paywall_cta_click', {
        trigger: triggerPoint,
        bundle: bundleKey,
      });

      setIsUnlocking(true);

      try {
        if (__DEV__) {
          // Development mode only - for testing
          logger.warn('[DEV] Simulating purchase flow - Pro unlock without validation');
          await unlockPro();
          if (isMountedRef.current) {
            analytics.track('paywall_viewed', { trigger: 'dev_unlock' });
          }
        } else {
          // Production - block until proper validation is implemented
          const error = new Error('Purchase validation not implemented');
          logger.error('SECURITY: Attempted Pro unlock without validation', {
            plan,
            trigger: triggerPoint,
            timestamp: new Date().toISOString(),
          });
          throw error;
        }
        if (isMountedRef.current) {
          onClose();
        }
      } catch (error) {
        logger.error('Failed to unlock pro', error as Error);
        analytics.track('paywall_viewed', {
          trigger: triggerPoint,
          bundle: bundleKey,
        });
        // Optionally surface an error via UI in the future
      } finally {
        if (isMountedRef.current) {
          setIsUnlocking(false);
        }
      }
    },
    [hapticFeedback, triggerPoint, bundleKey, unlockPro, onClose, isUnlocking]
  );

  const animatedSheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const animatedBackdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  if (!visible) return null;

  // Android Modal fallback - use supportedOrientations for iOS
  const modalProps = Platform.select({
    ios: {
      supportedOrientations: [
        'portrait',
        'portrait-upside-down',
        'landscape',
        'landscape-left',
        'landscape-right',
      ] as ModalProps['supportedOrientations'],
    },
    android: {
      statusBarTranslucent: true,
      hardwareAccelerated: true,
    },
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={() => onClose()}
      testID={makeTestID('paywall', 'sheet')}
      {...modalProps}
    >
      <GestureHandlerRootView style={styles.container}>
        {/* Backdrop */}
        <Animated.View style={[styles.backdrop, animatedBackdropStyle]}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => onClose()} />
        </Animated.View>

        {/* Sheet */}
        <Animated.View style={[styles.sheet, animatedSheetStyle]}>
          <GestureDetector gesture={panGesture}>
            <View style={styles.handleContainer}>
              <View style={styles.handle} />
            </View>
          </GestureDetector>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <PaywallHeader bundleKey={bundleKey} />
            <PaywallPreview previewItems={previewItems} />
            <PaywallBenefits />
            <PaywallPricing onSelectPlan={handleUnlockPro} isLoading={isUnlocking} />

            <Pressable
              style={[styles.ctaButton, isUnlocking && styles.ctaButtonDisabled]}
              onPress={() => handleUnlockPro('annual')}
              disabled={isUnlocking}
              testID={makeTestID('paywall', 'unlock', 'button')}
            >
              <Text style={styles.ctaButtonText}>
                {isUnlocking ? t('common.loading') : t('paywall.activate_pro_clean_all')}
              </Text>
            </Pressable>

            <Text style={styles.disclaimer}>{t('paywall.disclaimer')}</Text>

            <Pressable onPress={() => onClose()} style={styles.skipButton}>
              <Text style={styles.skipButtonText}>{t('paywall.maybe_later')}</Text>
            </Pressable>
          </ScrollView>
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'black',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: SHEET_HEIGHT,
    backgroundColor: theme.colors.bg,
    borderTopLeftRadius: theme.radii.xl,
    borderTopRightRadius: theme.radii.xl,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
      },
      android: {
        elevation: 20,
      },
    }),
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.line,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  ctaButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 16,
    borderRadius: theme.radii.lg,
    alignItems: 'center',
    marginBottom: 12,
  },
  ctaButtonDisabled: {
    opacity: 0.6,
  },
  ctaButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
  disclaimer: {
    fontSize: 11,
    color: theme.colors.textSecondary + '80',
    textAlign: 'center',
    marginBottom: 16,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  skipButtonText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
});

export default PaywallSheet;
