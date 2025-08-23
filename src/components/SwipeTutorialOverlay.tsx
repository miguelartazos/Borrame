import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions, Image } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

interface SwipeTutorialOverlayProps {
  visible: boolean;
  direction: 'left' | 'right';
  photoUri?: string;
  onDone: () => void;
}

const { width, height } = Dimensions.get('window');

export function SwipeTutorialOverlay({
  visible,
  direction,
  photoUri,
  onDone,
}: SwipeTutorialOverlayProps) {
  const { t } = useTranslation();
  const overlayOpacity = useSharedValue(0);
  const labelOpacity = useSharedValue(0);
  const labelScale = useSharedValue(0.8);
  const iconRotation = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      overlayOpacity.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) });
      labelOpacity.value = withDelay(
        200,
        withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) })
      );
      labelScale.value = withDelay(
        200,
        withTiming(1, { duration: 400, easing: Easing.out(Easing.back(1.2)) })
      );
      iconRotation.value = withDelay(
        400,
        withSequence(
          withTiming(15, { duration: 200 }),
          withTiming(-15, { duration: 200 }),
          withTiming(0, { duration: 200 })
        )
      );
    } else {
      overlayOpacity.value = withTiming(0, { duration: 200 });
      labelOpacity.value = withTiming(0, { duration: 200 });
      labelScale.value = withTiming(0.8, { duration: 200 });
    }
  }, [visible]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const labelStyle = useAnimatedStyle(() => ({
    opacity: labelOpacity.value,
    transform: [
      { scale: labelScale.value },
      { translateY: interpolate(labelScale.value, [0.8, 1], [20, 0], Extrapolation.CLAMP) },
    ],
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${iconRotation.value}deg` }],
  }));

  const isArchive = direction === 'left';
  const actionColor = isArchive ? '#FF4444' : '#4CAF50';
  const actionIcon = isArchive ? 'trash' : 'thumbs-up';
  const actionText = isArchive ? t('deck.tutorial.archive') : t('deck.tutorial.save');
  const instructionText = isArchive ? t('deck.tutorial.swipeLeft') : t('deck.tutorial.swipeRight');

  if (!visible) return null;

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.backdrop, containerStyle]}
      pointerEvents="auto"
    >
      <Pressable style={StyleSheet.absoluteFill} onPress={onDone}>
        <View style={styles.container}>
          {/* Photo preview if available */}
          {photoUri && (
            <View style={styles.photoContainer}>
              <Image source={{ uri: photoUri }} style={styles.photo} resizeMode="cover" />
            </View>
          )}

          {/* Action label */}
          <Animated.View style={[styles.actionLabel, { backgroundColor: actionColor }, labelStyle]}>
            <Animated.View style={iconStyle}>
              <Ionicons name={actionIcon as any} size={32} color="white" />
            </Animated.View>
            <Text style={styles.actionText}>{actionText}</Text>
            <Text style={styles.instructionText}>{instructionText}</Text>
          </Animated.View>

          {/* Bottom buttons bar preview */}
          <View style={styles.bottomBar}>
            <View style={[styles.buttonPreview, isArchive && styles.buttonHighlight]} />
            <View style={styles.buttonPreview} />
            <View style={[styles.buttonPreview, !isArchive && styles.buttonHighlight]} />
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoContainer: {
    width: width * 0.8,
    height: height * 0.5,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginBottom: 40,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  actionLabel: {
    paddingHorizontal: 32,
    paddingVertical: 24,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  actionText: {
    color: 'white',
    fontSize: 32,
    fontWeight: '700',
    marginTop: 12,
  },
  instructionText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 16,
    marginTop: 8,
    fontWeight: '500',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 40,
    flexDirection: 'row',
    gap: 20,
    paddingHorizontal: 40,
  },
  buttonPreview: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  buttonHighlight: {
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderColor: 'rgba(255,255,255,0.6)',
  },
});
