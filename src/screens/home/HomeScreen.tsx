import React, { memo, useCallback, useState, useEffect } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedScrollHandler } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  TopBar,
  ProgressTrackerCard,
  ActionHeroCard,
  OnThisDayCard,
  SmartBundlesGrid,
  LibraryBuckets,
  FloatingSwipeButton,
} from '../../components/home';
import ProgressTrackerSkeleton from '../../components/home/ProgressTrackerSkeleton';
import ActionHeroSkeleton from '../../components/home/ActionHeroSkeleton';
import { StreakModal } from '../../components/StreakModal';
import { useHomeData } from '../../hooks/useHomeData';
import { useProgressTracker } from '../../hooks/useProgressTracker';
import type { ChipData } from '../../components/home/ActionHeroCard';

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

interface HomeScreenProps {
  onNavigateToDeck?: () => void;
  onNavigateToLibrary?: () => void;
  onNavigateToSettings?: () => void;
}

export const HomeScreen = memo<HomeScreenProps>(
  ({ onNavigateToDeck, onNavigateToLibrary, onNavigateToSettings }) => {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { chips, spaceReadyMB, bundles, months, isLoading, selectChip } = useHomeData();
    const [showSkeletons, setShowSkeletons] = useState(true);
    const [showGoalModal, setShowGoalModal] = useState(false);
    const scrollY = useSharedValue(0);

    // Memoize callback to prevent recreation on every render
    const handleAdjustGoal = useCallback(() => {
      setShowGoalModal(true);
    }, []);

    const progressTrackerData = useProgressTracker(handleAdjustGoal);
    
    // Handle navigation to deck with chip filter
    const handleNavigateToDeck = useCallback(() => {
      if (onNavigateToDeck) {
        onNavigateToDeck();
      } else {
        router.push('/(main)/deck');
      }
    }, [onNavigateToDeck, router]);
    
    // Handle chip selection and navigation
    const handleChipPress = useCallback((chipId: ChipData['id']) => {
      selectChip(chipId);
      // Navigate to deck with filter parameter
      router.push({
        pathname: '/(main)/deck',
        params: { filter: chipId }
      });
    }, [selectChip, router]);

    const scrollHandler = useAnimatedScrollHandler({
      onScroll: (event) => {
        scrollY.value = event.contentOffset.y;
      },
    });

    useEffect(() => {
      if (!isLoading) {
        // Small delay to ensure smooth transition from skeleton to real content
        const timer = setTimeout(() => {
          setShowSkeletons(false);
        }, 100);
        return () => clearTimeout(timer);
      }
      return undefined;
    }, [isLoading]);

    // Get first month data for OnThisDayCard
    const firstMonth = months[0];

    return (
      <View className="flex-1 bg-dark-500" testID="homeScreen">
        <AnimatedScrollView
          showsVerticalScrollIndicator={false}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          contentContainerStyle={{
            paddingBottom: insets.bottom + 100,
          }}
        >
          <TopBar onSettingsPress={onNavigateToSettings} testID="homeScreen_topBar" />

          {showSkeletons ? (
            <>
              <ProgressTrackerSkeleton />
              <ActionHeroSkeleton />
            </>
          ) : (
            <>
              <ProgressTrackerCard {...progressTrackerData} />
              <ActionHeroCard
                spaceReady={spaceReadyMB * 1024 * 1024}
                chips={chips}
                onPress={handleNavigateToDeck}
                onPressChip={handleChipPress}
                scrollY={scrollY}
                testID="homeScreen_actionHero"
              />
            </>
          )}

          {firstMonth && (
            <OnThisDayCard
              count={firstMonth.count}
              previewUris={firstMonth.previewUris}
              onPress={handleNavigateToDeck}
              onPressTop5={handleNavigateToDeck}
            />
          )}

          <SmartBundlesGrid
            bundles={bundles}
            onBundlePress={handleNavigateToDeck}
            testID="homeScreen_smartBundles"
          />

          <LibraryBuckets onBucketPress={onNavigateToLibrary} testID="homeScreen_libraryBuckets" />
        </AnimatedScrollView>

        <FloatingSwipeButton />
        
        <StreakModal visible={showGoalModal} onClose={() => setShowGoalModal(false)} />
      </View>
    );
  }
);

HomeScreen.displayName = 'HomeScreen';
