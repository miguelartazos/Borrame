import React, { memo, useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSequence,
  withDelay,
} from 'react-native-reanimated';
import { Settings, Gift } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSettings } from '../../store/useSettings';
import { useTranslation } from 'react-i18next';

interface TopBarProps {
  onSettingsPress?: () => void;
  onInvitePress?: () => void;
  testID?: string;
}

export const TopBar = memo<TopBarProps>(({ onSettingsPress, onInvitePress, testID }) => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { inviteTooltipShown, setInviteTooltipShown } = useSettings();
  const tooltipOpacity = useSharedValue(0);

  const tooltipAnimatedStyle = useAnimatedStyle(() => ({
    opacity: tooltipOpacity.value,
  }));

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    if (!inviteTooltipShown) {
      tooltipOpacity.value = withDelay(
        500,
        withSequence(
          withTiming(1, { duration: 300 }),
          withDelay(3000, withTiming(0, { duration: 300 }))
        )
      );
      timeoutId = setTimeout(() => {
        setInviteTooltipShown(true);
      }, 4000);
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [inviteTooltipShown, setInviteTooltipShown, tooltipOpacity]);

  const handleInvitePress = () => {
    if (!inviteTooltipShown) {
      tooltipOpacity.value = withTiming(0, { duration: 200 });
      setInviteTooltipShown(true);
    }
    onInvitePress?.();
  };

  return (
    <View
      className="flex-row items-center justify-between px-4 py-3"
      style={{ paddingTop: insets.top + 12 }}
      testID={testID}
    >
      <Text className="text-2xl font-bold text-white" testID={`${testID}_title`}>
        SwipeClean
      </Text>

      <View className="flex-row items-center gap-2">
        <Pressable
          onPress={onSettingsPress}
          className="p-2"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          testID={`${testID}_settingsButton`}
        >
          <Settings size={24} color="white" />
        </Pressable>

        <View className="relative">
          {!inviteTooltipShown && (
            <Animated.View
              style={tooltipAnimatedStyle}
              className="absolute -left-16 -top-10 bg-dark-300 rounded-lg px-3 py-2 shadow-lg"
              pointerEvents="none"
            >
              <Text className="text-white text-xs">
                {t('header.inviteTooltip', 'Invite friends')}
              </Text>
              <View className="absolute bottom-[-4px] right-4 w-2 h-2 bg-dark-300 rotate-45" />
            </Animated.View>
          )}
          <Pressable
            onPress={handleInvitePress}
            className="p-2"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            testID="home.topbar.invite"
          >
            <Gift size={24} color="white" />
          </Pressable>
        </View>
      </View>
    </View>
  );
});

TopBar.displayName = 'TopBar';
