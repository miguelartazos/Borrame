import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { theme } from '../../../ui';
import { useTranslation } from 'react-i18next';
import { testID as makeTestID } from '../../../lib/a11y';
import { PRICING_CONFIG } from '../../../config/pricing';

interface PaywallPricingProps {
  onSelectPlan: (plan: 'monthly' | 'annual') => void;
  isLoading?: boolean;
}

export const PaywallPricing: React.FC<PaywallPricingProps> = ({ onSelectPlan, isLoading }) => {
  const { t } = useTranslation();

  return (
    <View style={styles.pricingSection}>
      <Pressable
        style={[styles.pricingCard, styles.recommendedCard]}
        onPress={() => onSelectPlan('annual')}
        disabled={isLoading}
        testID={makeTestID('paywall', 'price', 'annual')}
      >
        <View style={styles.recommendedBadge}>
          <Text style={styles.recommendedBadgeText}>{t('paywall.best_value')}</Text>
        </View>
        <Text style={styles.planTitle}>{t('paywall.yearly_plan')}</Text>
        <View style={styles.priceRow}>
          <Text style={styles.price}>{PRICING_CONFIG.annual.price}</Text>
          <Text style={styles.pricePeriod}>/{t('paywall.year')}</Text>
        </View>
        <Text style={styles.priceDetail}>{t('paywall.yearly_savings')}</Text>
      </Pressable>

      <Pressable
        style={styles.pricingCard}
        onPress={() => onSelectPlan('monthly')}
        disabled={isLoading}
        testID={makeTestID('paywall', 'price', 'monthly')}
      >
        <Text style={styles.planTitle}>{t('paywall.monthly_plan')}</Text>
        <View style={styles.priceRow}>
          <Text style={styles.price}>{PRICING_CONFIG.monthly.price}</Text>
          <Text style={styles.pricePeriod}>/{t('paywall.month')}</Text>
        </View>
        <Text style={styles.priceDetail}>{t('paywall.monthly_detail')}</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  pricingSection: {
    gap: 12,
    marginBottom: 20,
  },
  pricingCard: {
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.lg,
    borderWidth: 2,
    borderColor: theme.colors.line,
  },
  recommendedCard: {
    borderColor: theme.colors.primary,
    position: 'relative',
  },
  recommendedBadge: {
    position: 'absolute',
    top: -10,
    right: 16,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: theme.radii.full,
  },
  recommendedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: 'white',
    textTransform: 'uppercase',
  },
  planTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  price: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  pricePeriod: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginLeft: 4,
  },
  priceDetail: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
});
