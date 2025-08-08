import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { migrate } from '../src/db';
import '../global.css';

export default function RootLayout() {
  const [isDbReady, setIsDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    const initDatabase = async () => {
      try {
        await migrate();
        setIsDbReady(true);
      } catch (error) {
        console.error('Failed to initialize database:', error);
        setDbError(error instanceof Error ? error.message : 'Database initialization failed');
      }
    };

    initDatabase();
  }, []);

  if (dbError) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View className="flex-1 items-center justify-center p-6">
          <Text className="text-danger text-lg font-semibold">Database Error</Text>
          <Text className="mt-2 text-center text-gray-600">{dbError}</Text>
        </View>
      </GestureHandlerRootView>
    );
  }

  if (!isDbReady) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-600">Initializing database...</Text>
        </View>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(main)" options={{ headerShown: false }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
