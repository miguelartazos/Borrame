import React, { memo, useCallback, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Check } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { theme } from '../../ui';
import { useLibraryStore } from '../../store/useLibraryStore';
import { useSettings } from '../../store/useSettings';
import type { LibraryFilterType, LibrarySortOrder } from '../../features/library/selectors';

interface FilterBottomSheetProps {
  visible: boolean;
  onClose: () => void;
}

const SHEET_HEIGHT = 380;
const BACKDROP_OPACITY = 0.5;
const ANIMATION_DURATION = 250;
const SPRING_CONFIG = {
  damping: 25,
  stiffness: 350,
  mass: 0.8,
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radii.xl,
    borderTopRightRadius: theme.radii.xl,
    overflow: 'hidden',
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: theme.colors.line,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.line,
  },
  title: {
    fontSize: theme.typography.title.fontSize,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  closeButton: {
    padding: theme.spacing.sm,
  },
  content: {
    padding: theme.spacing.lg,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: theme.typography.caption.fontSize,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radii.md,
    marginBottom: theme.spacing.sm,
  },
  optionActive: {
    backgroundColor: theme.colors.primaryMuted,
  },
  optionText: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textPrimary,
  },
  optionTextActive: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
});

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const FilterBottomSheet = memo(({ visible, onClose }: FilterBottomSheetProps) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const hapticFeedback = useSettings((s) => s.hapticFeedback);

  const filter = useLibraryStore((s) => s.filter);
  const sortOrder = useLibraryStore((s) => s.sortOrder);
  const setFilter = useLibraryStore((s) => s.setFilter);
  const setSortOrder = useLibraryStore((s) => s.setSortOrder);

  const translateY = useSharedValue(SHEET_HEIGHT);
  const backdropOpacity = useSharedValue(0);

  const handleClose = useCallback(() => {
    translateY.value = withSpring(SHEET_HEIGHT, SPRING_CONFIG, (finished) => {
      if (finished) {
        runOnJS(onClose)();
      }
    });
    backdropOpacity.value = withTiming(0, { duration: ANIMATION_DURATION });
  }, [onClose, translateY, backdropOpacity]);

  const handleFilterChange = useCallback(
    (newFilter: LibraryFilterType) => {
      if (hapticFeedback) Haptics.selectionAsync();
      setFilter(newFilter);
    },
    [hapticFeedback, setFilter]
  );

  const handleSortChange = useCallback(
    (newSort: LibrarySortOrder) => {
      if (hapticFeedback) Haptics.selectionAsync();
      setSortOrder(newSort);
    },
    [hapticFeedback, setSortOrder]
  );

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, SPRING_CONFIG);
      backdropOpacity.value = withTiming(BACKDROP_OPACITY, { duration: ANIMATION_DURATION });
    } else {
      translateY.value = withSpring(SHEET_HEIGHT, SPRING_CONFIG);
      backdropOpacity.value = withTiming(0, { duration: ANIMATION_DURATION });
    }
  }, [visible, translateY, backdropOpacity]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const filterOptions: { key: LibraryFilterType; label: string }[] = [
    { key: 'all', label: t('library.filter.all') },
    { key: 'photos', label: t('library.filter.photos') },
    { key: 'videos', label: t('library.filter.videos') },
  ];

  const sortOptions: { key: LibrarySortOrder; label: string }[] = [
    { key: 'newest', label: t('library.sort.newest') },
    { key: 'oldest', label: t('library.sort.oldest') },
  ];

  return (
    <>
      <AnimatedPressable
        style={[styles.backdrop, backdropStyle]}
        onPress={handleClose}
        pointerEvents={visible ? 'auto' : 'none'}
      />
      <Animated.View style={[styles.container, sheetStyle, { paddingBottom: insets.bottom }]}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <Text style={styles.title}>{t('library.filterTitle')}</Text>
          <Pressable onPress={handleClose} style={styles.closeButton}>
            <X size={24} color={theme.colors.textSecondary} />
          </Pressable>
        </View>

        <View style={styles.content}>
          {/* Sort Options */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('library.sortBy')}</Text>
            {sortOptions.map((option) => (
              <Pressable
                key={option.key}
                onPress={() => handleSortChange(option.key)}
                style={[styles.option, sortOrder === option.key && styles.optionActive]}
              >
                <Text
                  style={[styles.optionText, sortOrder === option.key && styles.optionTextActive]}
                >
                  {option.label}
                </Text>
                {sortOrder === option.key && <Check size={20} color={theme.colors.primary} />}
              </Pressable>
            ))}
          </View>

          {/* Filter Options */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('library.filterBy')}</Text>
            {filterOptions.map((option) => (
              <Pressable
                key={option.key}
                onPress={() => handleFilterChange(option.key)}
                style={[styles.option, filter === option.key && styles.optionActive]}
              >
                <Text style={[styles.optionText, filter === option.key && styles.optionTextActive]}>
                  {option.label}
                </Text>
                {filter === option.key && <Check size={20} color={theme.colors.primary} />}
              </Pressable>
            ))}
          </View>
        </View>
      </Animated.View>
    </>
  );
});

FilterBottomSheet.displayName = 'FilterBottomSheet';
