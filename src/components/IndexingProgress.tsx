import React from 'react';
import { View, Text } from 'react-native';
import { useIndexRunning, useIndexTotal, useIndexIndexed } from '../store/useIndexStore';

export function IndexingProgress() {
  const running = useIndexRunning();
  const total = useIndexTotal();
  const indexed = useIndexIndexed();

  if (!running || total === 0) {
    return null;
  }

  const percentage = Math.round((indexed / total) * 100);

  return (
    <View className="bg-gray-100 px-4 py-2 rounded-lg">
      <Text className="text-sm text-gray-600">
        Indexing photos: {indexed}/{total} ({percentage}%)
      </Text>
      <View className="mt-1 h-1 bg-gray-200 rounded-full overflow-hidden">
        <View className="h-full bg-blue-500 transition-all" style={{ width: `${percentage}%` }} />
      </View>
    </View>
  );
}
