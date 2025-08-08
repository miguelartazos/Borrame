import { Tabs } from 'expo-router';
import { Image, Trash2, Settings } from 'lucide-react-native';

export default function MainLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
        },
      }}
    >
      <Tabs.Screen
        name="deck"
        options={{
          title: 'Deck',
          headerTitle: 'Photo Deck',
          tabBarIcon: ({ color }) => <Image size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="pending"
        options={{
          title: 'Pending',
          headerTitle: 'Pending Bin',
          tabBarIcon: ({ color }) => <Trash2 size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          headerTitle: 'Settings',
          tabBarIcon: ({ color }) => <Settings size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
