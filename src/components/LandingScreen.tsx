import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { MascotAnimation } from './MascotAnimation';
import { theme } from '../ui/theme';
import { testID } from '../lib/a11y';

interface LandingScreenProps {
  onContinue: () => void;
}

export function LandingScreen({ onContinue }: LandingScreenProps) {
  const { t } = useTranslation();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Logo/Title */}
        <Text style={styles.logo} testID={testID('home', 'topBar', 'logo')}>
          SWIPECLEAN
        </Text>

        {/* Mascot Animation */}
        <View style={styles.mascotContainer} accessibilityElementsHidden>
          <MascotAnimation />
        </View>

        {/* Continue Button */}
        <TouchableOpacity
          style={styles.continueButton}
          onPress={onContinue}
          activeOpacity={0.9}
          testID="continueButton"
          accessibilityRole="button"
          accessibilityLabel={t('landing.continue')}
          accessibilityHint="Tap to continue to photo access screen"
        >
          <Text style={styles.continueButtonText}>{t('landing.continue')}</Text>
        </TouchableOpacity>

        {/* Terms and Privacy */}
        <Text style={styles.termsText}>{t('landing.terms')}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing['3xl'],
  },
  logo: {
    fontSize: 36,
    fontWeight: '800',
    color: theme.colors.primary,
    letterSpacing: -1,
    marginBottom: theme.spacing['3xl'] * 2,
  },
  mascotContainer: {
    marginVertical: theme.spacing['3xl'] * 2,
  },
  continueButton: {
    backgroundColor: theme.colors.white,
    paddingHorizontal: theme.spacing['3xl'] * 3,
    paddingVertical: theme.spacing.xl,
    borderRadius: theme.radii.full,
    marginTop: theme.spacing['3xl'] * 2,
    width: '100%',
    maxWidth: 320,
  },
  continueButtonText: {
    color: theme.colors.bg,
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
    textAlign: 'center',
  },
  termsText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.caption.fontSize,
    textAlign: 'center',
    marginTop: theme.spacing['2xl'],
    paddingHorizontal: theme.spacing.xl,
    lineHeight: 20,
  },
});
