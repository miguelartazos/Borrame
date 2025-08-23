import React, { memo } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import type { FilterType } from '../features/deck/selectors';

interface SegmentedControlProps {
  filter: FilterType;
  onFilterChange: (filter: FilterType) => void;
}

const FILTERS: FilterType[] = ['all', 'screenshots', 'recent'];
const { width: screenWidth } = Dimensions.get('window');
const CONTROL_WIDTH = Math.min(screenWidth - 120, 320); // Max 320pt, with space for counter
const SEGMENT_WIDTH = CONTROL_WIDTH / 3;
const CONTROL_HEIGHT = 46;

export const SegmentedControl = memo(({ filter, onFilterChange }: SegmentedControlProps) => {
  const { t } = useTranslation();
  const selectedIndex = FILTERS.indexOf(filter);
  const translateX = useSharedValue(selectedIndex * SEGMENT_WIDTH);

  React.useEffect(() => {
    translateX.value = withSpring(selectedIndex * SEGMENT_WIDTH, {
      damping: 20,
      stiffness: 300,
    });
  }, [selectedIndex, translateX]);

  const animatedPillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View style={styles.container}>
      <View style={styles.controlBackground}>
        <Animated.View style={[styles.selectedPill, animatedPillStyle]} />
        {FILTERS.map((f) => (
          <Pressable
            key={f}
            onPress={() => onFilterChange(f)}
            style={styles.segment}
            testID={`segmentedControl_${f}`}
            accessibilityRole="button"
            accessibilityState={{ selected: filter === f }}
            accessibilityLabel={t(`deck.filters.${f}`)}
          >
            <Text
              style={[
                styles.segmentText,
                filter === f ? styles.selectedText : styles.unselectedText,
              ]}
            >
              {t(`deck.filters.${f}`)}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
});

SegmentedControl.displayName = 'SegmentedControl';

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  controlBackground: {
    flexDirection: 'row',
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    padding: 2,
    position: 'relative',
    height: CONTROL_HEIGHT,
    width: CONTROL_WIDTH,
  },
  selectedPill: {
    position: 'absolute',
    width: SEGMENT_WIDTH,
    height: CONTROL_HEIGHT - 4,
    backgroundColor: 'white',
    borderRadius: 8,
    top: 2,
    left: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  segment: {
    width: SEGMENT_WIDTH,
    height: CONTROL_HEIGHT - 4,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
  },
  selectedText: {
    color: '#000',
  },
  unselectedText: {
    color: '#8E8E93',
  },
});
