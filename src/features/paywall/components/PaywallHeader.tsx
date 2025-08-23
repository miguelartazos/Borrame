import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Crown } from 'lucide-react-native';
import { theme } from '../../../ui';
import { useTranslation } from 'react-i18next';

interface PaywallHeaderProps {
  bundleKey?: string;
}

export const PaywallHeader: React.FC<PaywallHeaderProps> = ({ bundleKey }) => {
  const { t } = useTranslation();

  return (
    <View style={styles.header}>
      <View style={styles.iconContainer}>
        <Crown size={32} color={theme.colors.primary} />
      </View>

      <Text style={styles.title}>
        {bundleKey ? t('paywall.unlock_bundle_title') : t('paywall.unlock_pro_title')}
      </Text>

      <Text style={styles.subtitle}>{t('paywall.unlock_bundle_subtitle')}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.primaryMuted + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});
