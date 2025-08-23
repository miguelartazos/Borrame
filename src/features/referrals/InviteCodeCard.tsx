import React, { memo, useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { Copy, Share2 } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../../ui';
import { useFetchOrCreateCode, useCopyInviteCode, useShareInvite } from '../../store/useReferralStore';

interface InviteCodeCardProps {
  testID?: string;
}

const AnimatedView = Animated.createAnimatedComponent(View);

export const InviteCodeCard = memo(({ testID }: InviteCodeCardProps) => {
  const { t } = useTranslation();
  const fetchOrCreate = useFetchOrCreateCode();
  const copyCode = useCopyInviteCode();
  const shareInvite = useShareInvite();

  const glow = useSharedValue(0);
  const [code, setCode] = React.useState<string>('-----');

  useEffect(() => {
    fetchOrCreate().then(setCode).catch(() => setCode('-----'));
  }, [fetchOrCreate]);

  useEffect(() => {
    glow.value = withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [glow]);

  const glowStyle = useAnimatedStyle(() => ({
    shadowColor: colors.success,
    shadowOpacity: 0.4 + glow.value * 0.2,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 12 + glow.value * 8,
  }));

  return (
    <View className="px-4 mt-2" testID={testID}>
      <AnimatedView style={[glowStyle]} className="bg-card rounded-2xl p-5 items-center justify-center">
        <Text className="text-xs mb-2" style={{ color: colors.success }}>{t('referrals.shareCode')}</Text>
        <Text className="text-4xl font-bold tracking-widest text-white" accessibilityRole="text">
          {code}
        </Text>
      </AnimatedView>

      <View className="flex-row mt-4">
        <Pressable
          onPress={copyCode}
          className="flex-1 bg-dark-400 rounded-xl px-4 py-3 mr-2 flex-row items-center justify-center"
          accessibilityRole="button"
          accessibilityLabel={t('referrals.copy')}
        >
          <Copy size={18} color="#9CA3AF" />
          <Text className="text-white ml-2">{t('referrals.copy')}</Text>
        </Pressable>
        <Pressable
          onPress={shareInvite}
          className="flex-1 bg-dark-400 rounded-xl px-4 py-3 ml-2 flex-row items-center justify-center"
          accessibilityRole="button"
          accessibilityLabel={t('referrals.share')}
        >
          <Share2 size={18} color="#9CA3AF" />
          <Text className="text-white ml-2">{t('referrals.share')}</Text>
        </Pressable>
      </View>
    </View>
  );
});

InviteCodeCard.displayName = 'InviteCodeCard';


