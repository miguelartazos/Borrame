import React, { memo, useMemo } from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CheckCircle2 } from 'lucide-react-native';
import { useJoinedCount, useReferralTiers } from '../../store/useReferralStore';

export const RewardsList = memo(() => {
  const { t } = useTranslation();
  const joined = useJoinedCount();
  const tiers = useReferralTiers();

  const rows = useMemo(() => tiers.map((tier) => ({
    reached: joined >= tier.threshold,
    threshold: tier.threshold,
    titleKey: tier.titleKey,
    subtitleKey: tier.subtitleKey,
  })), [tiers, joined]);

  return (
    <View className="px-4 mt-6">
      <Text className="text-white text-2xl font-semibold mb-1">{t('referrals.earnRewards')}</Text>
      <Text className="text-gray-500 mb-4">
        {t('referrals.friendsJoined', { count: joined })}
      </Text>

      {rows.map((row, idx) => (
        <View key={idx} className="bg-dark-400 rounded-2xl p-4 mb-3 flex-row items-center">
          <View className="flex-1">
            <Text className="text-white text-lg font-semibold">{t(row.titleKey)}</Text>
            {row.subtitleKey && (
              <Text className="text-gray-500 mt-1">
                {row.subtitleKey === 'referrals.rewards.perFriend'
                  ? t(row.subtitleKey)
                  : t(row.subtitleKey, { count: row.threshold })}
              </Text>
            )}
          </View>
          {row.reached && <CheckCircle2 size={22} color="#22c55e" />}
        </View>
      ))}
    </View>
  );
});

RewardsList.displayName = 'RewardsList';


