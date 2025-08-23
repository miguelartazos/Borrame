import React, { useState, useMemo } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useJoinedCount, useReferralTiers, useShareInvite } from '../../store/useReferralStore';
import { InviteCodeCard } from './InviteCodeCard';
import { RewardsList } from './RewardsList';
import { RedeemCodeSheet } from './RedeemCodeSheet';

export function InviteScreen() {
  const { t } = useTranslation();
  const shareInvite = useShareInvite();
  const joined = useJoinedCount();
  const tiers = useReferralTiers();
  const [redeemVisible, setRedeemVisible] = useState(false);

  const nextThreshold = useMemo(() => {
    for (const tier of tiers) {
      if (joined < tier.threshold) return tier.threshold;
    }
    return tiers[tiers.length - 1]?.threshold ?? 1;
  }, [tiers, joined]);

  return (
    <View className="flex-1 bg-dark-100">
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <InviteCodeCard testID="invite_code_card" />

        <View className="px-4 mt-6">
          <Text className="text-white text-2xl font-semibold mb-1">{t('referrals.earnRewards')}</Text>
          <Text className="text-gray-500">
            {t('referrals.friendsJoinedProgress', { current: joined, target: nextThreshold })}
          </Text>
        </View>

        <RewardsList />
      </ScrollView>

      <View className="px-4 pb-8">
        <Pressable onPress={shareInvite} className="bg-white rounded-2xl py-4 items-center">
          <Text className="text-black text-base font-semibold">{t('referrals.inviteFriendsCta')}</Text>
        </Pressable>
        <Pressable onPress={() => setRedeemVisible(true)} className="rounded-2xl py-4 items-center mt-3">
          <Text className="text-white/90 text-base">{t('referrals.redeemCodeCta')}</Text>
        </Pressable>
      </View>

      <RedeemCodeSheet visible={redeemVisible} onClose={() => setRedeemVisible(false)} />
    </View>
  );
}


