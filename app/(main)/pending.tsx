import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PendingScreen() {
  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-1 items-center justify-center">
        <Text className="text-xl text-gray-600">Pending Bin</Text>
      </View>
    </SafeAreaView>
  );
}
