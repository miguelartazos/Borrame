import React from 'react';
import { View, Text, Pressable, Modal } from 'react-native';
import { Crown, Check, Zap, Shield } from 'lucide-react-native';
import { useLimitsStore } from '../limits/useLimitsStore';
import { analytics } from '../../lib/analytics';
import i18n from '../../i18n';

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
  triggerPoint?: string;
}

export function PaywallModal({
  visible,
  onClose,
  triggerPoint = 'limit_reached',
}: PaywallModalProps) {
  const unlockPro = useLimitsStore((s) => s.unlockPro);

  React.useEffect(() => {
    if (visible) {
      analytics.track('paywall_viewed', { trigger: triggerPoint });
    }
  }, [visible, triggerPoint]);

  const handleUnlock = async () => {
    analytics.track('paywall_cta_click');
    await unlockPro();
    onClose();
  };

  const features = [
    { icon: Zap, text: i18n.t('paywall.benefits.unlimited') },
    { icon: Crown, text: i18n.t('paywall.benefits.priority') },
    { icon: Shield, text: i18n.t('paywall.benefits.advanced') },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-white">
        <Pressable className="absolute top-14 right-4 z-10 p-2" onPress={onClose}>
          <Text className="text-gray-500 text-lg">✕</Text>
        </Pressable>

        <View className="flex-1 px-6 pt-20">
          <View className="items-center mb-8">
            <View className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 items-center justify-center mb-4">
              <Crown size={40} color="white" />
            </View>

            <Text className="text-3xl font-bold text-center mb-2">{i18n.t('paywall.title')}</Text>

            <Text className="text-gray-600 text-center text-lg">{i18n.t('paywall.subtitle')}</Text>
          </View>

          <View className="mb-8">
            {features.map((feature, index) => (
              <View key={index} className="flex-row items-center mb-4">
                <View className="w-10 h-10 rounded-full bg-purple-100 items-center justify-center mr-4">
                  <feature.icon size={20} color="#8b5cf6" />
                </View>
                <Text className="flex-1 text-gray-800 text-base">{feature.text}</Text>
                <Check size={20} color="#10b981" />
              </View>
            ))}
          </View>

          <View className="mb-6">
            <View className="bg-purple-50 rounded-2xl p-4 mb-3">
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-lg font-semibold">{i18n.t('paywall.monthly.title')}</Text>
                <Text className="text-2xl font-bold">$4.99</Text>
              </View>
              <Text className="text-gray-600">{i18n.t('paywall.monthly.description')}</Text>
            </View>

            <View className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl p-[2px]">
              <View className="bg-white rounded-2xl p-4">
                <View className="absolute top-0 right-3 bg-gradient-to-r from-purple-500 to-pink-500 px-3 py-1 rounded-full">
                  <Text className="text-white text-xs font-bold">
                    {i18n.t('paywall.yearly.badge')}
                  </Text>
                </View>
                <View className="flex-row justify-between items-center mb-2 mt-2">
                  <Text className="text-lg font-semibold">{i18n.t('paywall.yearly.title')}</Text>
                  <View>
                    <Text className="text-2xl font-bold">$39.99</Text>
                    <Text className="text-xs text-gray-500 line-through">$59.88</Text>
                  </View>
                </View>
                <Text className="text-gray-600">{i18n.t('paywall.yearly.description')}</Text>
              </View>
            </View>
          </View>

          <Pressable
            className="bg-gradient-to-r from-purple-500 to-pink-500 py-4 rounded-xl mb-4"
            onPress={handleUnlock}
          >
            <Text className="text-white text-center font-bold text-lg">
              {i18n.t('paywall.unlock')}
            </Text>
          </Pressable>

          <Text className="text-center text-xs text-gray-500 mb-2">{i18n.t('paywall.terms')}</Text>
        </View>
      </View>
    </Modal>
  );
}
