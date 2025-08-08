import React, { memo } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';

interface EmptyStateProps {
  title?: string;
  subtitle?: string;
  ctaText?: string;
  ctaRoute?: string;
}

export const EmptyState = memo(({ title, subtitle, ctaText, ctaRoute }: EmptyStateProps) => {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <View className="flex-1 items-center justify-center px-8">
      <Text className="text-2xl font-bold text-gray-800 mb-2">
        {title || t('deck.empty.title')}
      </Text>
      <Text className="text-gray-500 text-center mb-6">{subtitle || t('deck.empty.subtitle')}</Text>
      {ctaText && ctaRoute && (
        <Pressable
          onPress={() => router.push(ctaRoute)}
          className="bg-blue-500 px-6 py-3 rounded-lg"
        >
          <Text className="text-white font-medium">{ctaText}</Text>
        </Pressable>
      )}
    </View>
  );
});

EmptyState.displayName = 'EmptyState';
