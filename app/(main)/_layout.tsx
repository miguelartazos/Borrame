import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { Image, Trash2, Settings, Library } from 'lucide-react-native';
import { usePendingCount } from '../../src/hooks/usePendingCount';
import { colors } from '../../src/ui/tokens';
import { useTranslation } from 'react-i18next';

// Extract tab icon components to avoid re-renders
const DeckIcon = ({ color }: { color: string }) => <Image size={24} color={color} />;
const LibraryIcon = ({ color }: { color: string }) => <Library size={24} color={color} />;
const SettingsIcon = ({ color }: { color: string }) => <Settings size={24} color={color} />;

const PendingIcon = ({ color }: { color: string }) => {
  const pendingCount = usePendingCount();
  return (
    <View>
      <Trash2 size={24} color={pendingCount > 0 ? colors.primary : color} />
      {pendingCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{pendingCount > 99 ? '99+' : pendingCount}</Text>
        </View>
      )}
    </View>
  );
};

export default function MainLayout() {
  const { t } = useTranslation();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.line,
        },
        headerStyle: {
          backgroundColor: colors.bg,
        },
        headerTintColor: colors.white,
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="deck"
        options={{
          title: t('deck.title'),
          headerTitle: t('deck.title'),
          tabBarIcon: DeckIcon,
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: t('library.title'),
          headerTitle: t('library.title'),
          tabBarIcon: LibraryIcon,
        }}
      />
      <Tabs.Screen
        name="pending"
        options={{
          title: t('pending.title'),
          headerTitle: t('pending.title'),
          tabBarIcon: PendingIcon,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('settings.title'),
          headerTitle: t('settings.title'),
          tabBarIcon: SettingsIcon,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    right: -8,
    top: -4,
    backgroundColor: colors.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
  },
});
