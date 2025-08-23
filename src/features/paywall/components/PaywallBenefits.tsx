import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Zap, Shield, Star, Check } from 'lucide-react-native';
import { theme } from '../../../ui';
import { useTranslation } from 'react-i18next';

export const PaywallBenefits: React.FC = () => {
  const { t } = useTranslation();

  const benefits = [
    {
      icon: Zap,
      title: t('paywall.benefits.smart_detection'),
      subtitle: t('paywall.benefits.smart_detection_desc'),
    },
    {
      icon: Shield,
      title: t('paywall.benefits.unlimited_deletes'),
      subtitle: t('paywall.benefits.unlimited_deletes_desc'),
    },
    {
      icon: Star,
      title: t('paywall.benefits.priority_support'),
      subtitle: t('paywall.benefits.priority_support_desc'),
    },
  ];

  return (
    <View style={styles.benefitsSection}>
      {benefits.map((benefit, index) => (
        <View key={index} style={styles.benefitRow}>
          <View style={styles.benefitIcon}>
            <benefit.icon size={20} color={theme.colors.primary} />
          </View>
          <View style={styles.benefitContent}>
            <Text style={styles.benefitTitle}>{benefit.title}</Text>
            <Text style={styles.benefitSubtitle}>{benefit.subtitle}</Text>
          </View>
          <Check size={20} color={theme.colors.success} />
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  benefitsSection: {
    marginBottom: 24,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.md,
    marginBottom: 8,
  },
  benefitIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primaryMuted + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  benefitContent: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  benefitSubtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
});
