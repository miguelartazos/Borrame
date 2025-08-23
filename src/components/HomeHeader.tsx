import React, { memo, useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
} from 'react-native-reanimated';
import { Settings, Gift } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { a11yProps, testID } from '../lib/a11y';
import { useSettings } from '../store/useSettings';
import { colors } from '../ui';

interface HomeHeaderProps {
  onInvitePress?: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const HomeHeader = memo(({ onInvitePress }: HomeHeaderProps) => {
  const { t } = useTranslation();
  const router = useRouter();
  const { inviteTooltipShown, setInviteTooltipShown } = useSettings();
  const settingsScale = useSharedValue(1);
  const inviteScale = useSharedValue(1);
  const tooltipOpacity = useSharedValue(0);

  const settingsAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: settingsScale.value }],
  }));

  const inviteAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: inviteScale.value }],
  }));

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

  const handleSettingsPressIn = () => {
    settingsScale.value = withSpring(0.9, { damping: 15, stiffness: 300 });
  };

  const handleSettingsPressOut = () => {
    settingsScale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const handleInvitePressIn = () => {
    inviteScale.value = withSpring(0.9, { damping: 15, stiffness: 300 });
  };

  const handleInvitePressOut = () => {
    inviteScale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const handleSettingsPress = () => {
    router.push('/(main)/settings');
  };

  const handleInvitePress = () => {
    if (!inviteTooltipShown) {
      tooltipOpacity.value = withTiming(0, { duration: 200 });
      setInviteTooltipShown(true);
    }
    onInvitePress?.();
    router.push('/(main)/invite');
  };

  return (
    <View className="px-4 pb-4 pt-2">
      <View className="flex-row items-center justify-between">
        <AnimatedPressable
          onPress={handleSettingsPress}
          onPressIn={handleSettingsPressIn}
          onPressOut={handleSettingsPressOut}
          style={settingsAnimatedStyle}
          className="w-10 h-10 items-center justify-center"
          testID={testID('home', 'topBar', 'settings')}
          {...a11yProps({ role: 'button', label: t('settings.title') })}
        >
          <Settings size={22} color="#9CA3AF" />
        </AnimatedPressable>

        <View className="flex-row items-center">
          <View className="relative">
            {!inviteTooltipShown && (
              <Animated.View
                style={tooltipAnimatedStyle}
                className="absolute right-0 -top-10 bg-dark-300 rounded-lg px-3 py-2 shadow-lg"
                pointerEvents="none"
              >
                <Text className="text-white text-xs">
                  {t('header.inviteTooltip', 'Invite friends')}
                </Text>
                <View className="absolute bottom-[-4px] right-3 w-2 h-2 bg-dark-300 rotate-45" />
              </Animated.View>
            )}
            <AnimatedPressable
              onPress={handleInvitePress}
              onPressIn={handleInvitePressIn}
              onPressOut={handleInvitePressOut}
              style={inviteAnimatedStyle}
              className="px-3 py-2 rounded-full flex-row items-center"
              testID={testID('home', 'topBar', 'invite')}
              {...a11yProps({
                role: 'button',
                label: t('header.invite'),
                hint: 'Invite friends to SwipeClean',
              })}
            >
              <Gift size={18} color={colors.success} />
              <Text className="ml-2 text-base font-semibold" style={{ color: colors.success }}>
                {t('header.invite')}
              </Text>
            </AnimatedPressable>
          </View>
        </View>
      </View>
    </View>
  );
});

HomeHeader.displayName = 'HomeHeader';
