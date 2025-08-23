import { View, Text, Switch, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import i18n from '../../src/i18n';
import { useSettings } from '../../src/store/useSettings';
import { analytics } from '../../src/lib/analytics';
import { Link } from 'expo-router';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const haptic = useSettings((s) => s.hapticFeedback);
  const setHaptic = useSettings((s) => s.setHapticFeedback);
  const confirmBeforeDelete = useSettings((s) => s.confirmBeforeDelete);
  const setConfirmBeforeDelete = useSettings((s) => s.setConfirmBeforeDelete);
  const swipeLeft = useSettings((s) => s.swipeLeftAction);
  const swipeRight = useSettings((s) => s.swipeRightAction);
  const setSwipeLeft = useSettings((s) => s.setSwipeLeftAction);
  const setSwipeRight = useSettings((s) => s.setSwipeRightAction);
  const language = useSettings((s) => s.language);
  const setLanguage = useSettings((s) => s.setLanguage);

  const analyticsOptIn = useSettings((s) => s.analyticsOptIn);
  const setAnalyticsOptIn = useSettings((s) => s.setAnalyticsOptIn);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="px-4 py-6 border-b border-gray-200">
        <Text className="text-2xl font-bold">{t('settings.title')}</Text>
      </View>

      <View className="px-4 py-4">
        {/* Haptic Feedback */}
        <View className="flex-row items-center justify-between py-3">
          <Text className="text-gray-900 text-base">Haptic feedback</Text>
          <Switch
            value={haptic}
            onValueChange={setHaptic}
            accessibilityLabel="Toggle haptic feedback"
          />
        </View>

        {/* Confirm before delete */}
        <View className="flex-row items-center justify-between py-3">
          <Text className="text-gray-900 text-base">Confirm before delete</Text>
          <Switch
            value={confirmBeforeDelete}
            onValueChange={setConfirmBeforeDelete}
            accessibilityLabel="Toggle confirm before delete"
          />
        </View>

        {/* Swipe actions */}
        <View className="py-3">
          <Text className="text-gray-500 mb-2">Swipe actions</Text>
          <View className="flex-row items-center justify-between py-2">
            <Text className="text-gray-900">Swipe left</Text>
            <View className="flex-row gap-2">
              <Pressable
                className={`px-3 py-2 rounded-lg ${
                  swipeLeft === 'delete' ? 'bg-blue-600' : 'bg-gray-200'
                }`}
                onPress={() => setSwipeLeft('delete')}
              >
                <Text className={swipeLeft === 'delete' ? 'text-white' : 'text-gray-800'}>
                  {t('deck.delete')}
                </Text>
              </Pressable>
              <Pressable
                className={`px-3 py-2 rounded-lg ${
                  swipeLeft === 'keep' ? 'bg-blue-600' : 'bg-gray-200'
                }`}
                onPress={() => setSwipeLeft('keep')}
              >
                <Text className={swipeLeft === 'keep' ? 'text-white' : 'text-gray-800'}>
                  {t('deck.keep')}
                </Text>
              </Pressable>
            </View>
          </View>

          <View className="flex-row items-center justify-between py-2">
            <Text className="text-gray-900">Swipe right</Text>
            <View className="flex-row gap-2">
              <Pressable
                className={`px-3 py-2 rounded-lg ${
                  swipeRight === 'delete' ? 'bg-blue-600' : 'bg-gray-200'
                }`}
                onPress={() => setSwipeRight('delete')}
              >
                <Text className={swipeRight === 'delete' ? 'text-white' : 'text-gray-800'}>
                  {t('deck.delete')}
                </Text>
              </Pressable>
              <Pressable
                className={`px-3 py-2 rounded-lg ${
                  swipeRight === 'keep' ? 'bg-blue-600' : 'bg-gray-200'
                }`}
                onPress={() => setSwipeRight('keep')}
              >
                <Text className={swipeRight === 'keep' ? 'text-white' : 'text-gray-800'}>
                  {t('deck.keep')}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Language */}
        <View className="py-3">
          <Text className="text-gray-500 mb-2">Language</Text>
          <View className="flex-row gap-2">
            <Pressable
              className={`px-3 py-2 rounded-lg ${language === 'en' ? 'bg-blue-600' : 'bg-gray-200'}`}
              onPress={() => {
                setLanguage('en');
                i18n.changeLanguage('en');
              }}
            >
              <Text className={language === 'en' ? 'text-white' : 'text-gray-800'}>English</Text>
            </Pressable>
            <Pressable
              className={`px-3 py-2 rounded-lg ${language === 'es' ? 'bg-blue-600' : 'bg-gray-200'}`}
              onPress={() => {
                setLanguage('es');
                i18n.changeLanguage('es');
              }}
            >
              <Text className={language === 'es' ? 'text-white' : 'text-gray-800'}>Español</Text>
            </Pressable>
          </View>
        </View>

        {/* Analytics opt-in */}
        <View className="flex-row items-center justify-between py-3">
          <Text className="text-gray-900 text-base">Share anonymous analytics</Text>
          <Switch
            value={analyticsOptIn}
            onValueChange={(v) => {
              setAnalyticsOptIn(v);
              analytics.setOptIn(v);
            }}
            accessibilityLabel="Toggle analytics opt-in"
          />
        </View>

        {/* Legal links */}
        <View className="py-3">
          <View className="flex-row gap-4">
            <Link href="https://example.com/terms" asChild>
              <Pressable className="px-3 py-2 bg-gray-200 rounded-lg">
                <Text className="text-gray-800">Terms</Text>
              </Pressable>
            </Link>
            <Link href="https://example.com/privacy" asChild>
              <Pressable className="px-3 py-2 bg-gray-200 rounded-lg">
                <Text className="text-gray-800">Privacy</Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
