import 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { migrate, getDatabase } from '../src/db';
import { recoverStuckCommits } from '../src/db/commitLog';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../src/lib/logger';
import { analytics } from '../src/lib/analytics';
import { useSettings } from '../src/store/useSettings';
import '../global.css';

export default function RootLayout() {
  const [isDbReady, setIsDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const analyticsOptIn = useSettings((s) => s.analyticsOptIn);

  useEffect(() => {
    const initDatabase = async () => {
      try {
        // Clear dev-mode Pro status in production builds
        if (!__DEV__) {
          const entitlementsKey = '@swipeclean/entitlements';
          const entitlements = await AsyncStorage.getItem(entitlementsKey);
          if (entitlements) {
            try {
              const data = JSON.parse(entitlements);
              if (data.devMode) {
                logger.warn('Clearing dev-mode Pro status from production build');
                await AsyncStorage.removeItem(entitlementsKey);
              }
            } catch (parseError) {
              logger.error('Failed to parse entitlements', parseError);
            }
          }
        }

        await migrate();
        const db = await getDatabase();
        await recoverStuckCommits(db); // Clean up any orphaned commits
        setIsDbReady(true);
      } catch (error) {
        logger.error('Failed to initialize database:', error as Error);
        setDbError(error instanceof Error ? error.message : 'Database initialization failed');
      }
    };

    initDatabase();
  }, []);

  // Initialize analytics opt-in from settings
  useEffect(() => {
    analytics.setOptIn(analyticsOptIn);
  }, [analyticsOptIn]);

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
