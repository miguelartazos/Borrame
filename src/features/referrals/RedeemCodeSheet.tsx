import React, { memo, useState } from 'react';
import { View, Text, Modal, Pressable, TextInput } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRedeemCode } from '../../store/useReferralStore';

interface RedeemCodeSheetProps {
  visible: boolean;
  onClose: () => void;
}

export const RedeemCodeSheet = memo(({ visible, onClose }: RedeemCodeSheetProps) => {
  const { t } = useTranslation();
  const redeem = useRedeemCode();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleRedeem = async () => {
    setSubmitting(true);
    setError(null);
    const result = await redeem(code);
    setSubmitting(false);
    if (!result.ok) {
      setError(t('referrals.invalidCode'));
      return;
    }
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View className="flex-1 bg-dark-100">
        <View className="px-4 pt-16">
          <Text className="text-white text-xl font-semibold mb-2">{t('referrals.redeemTitle')}</Text>
          <Text className="text-gray-500 mb-6">{t('referrals.redeemSubtitle')}</Text>
          <View className="bg-dark-400 rounded-xl p-4">
            <TextInput
              value={code}
              onChangeText={setCode}
              placeholder={t('referrals.enterCode')}
              placeholderTextColor="#6B7280"
              className="text-white text-lg"
              autoCapitalize="characters"
              maxLength={8}
            />
            {error && <Text className="text-danger mt-2">{error}</Text>}
          </View>
          <Pressable onPress={handleRedeem} disabled={submitting} className="bg-white rounded-xl py-4 items-center mt-6">
            <Text className="text-black text-base font-semibold">{t('referrals.redeem')}</Text>
          </Pressable>
          <Pressable onPress={onClose} className="rounded-xl py-4 items-center mt-2">
            <Text className="text-gray-400 text-base">{t('common.cancel')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
});

RedeemCodeSheet.displayName = 'RedeemCodeSheet';


