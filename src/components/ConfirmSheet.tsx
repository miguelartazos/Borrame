import React from 'react';
import { View, Text, Pressable, Modal } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';

interface ConfirmSheetProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  icon?: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmSheet({
  visible,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  destructive = false,
  icon,
  onConfirm,
  onCancel,
}: ConfirmSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <Pressable className="flex-1 bg-black/50 justify-end" onPress={onCancel}>
        <Pressable className="bg-white rounded-t-3xl p-6 pb-10">
          <View className="items-center mb-4">
            {icon || (
              <View className="w-16 h-16 rounded-full bg-red-50 items-center justify-center">
                <AlertTriangle size={32} color="#ef4444" />
              </View>
            )}
          </View>

          <Text className="text-xl font-semibold text-center mb-2">{title}</Text>

          <Text className="text-gray-600 text-center mb-6">{message}</Text>

          <View className="gap-3">
            <Pressable
              className={`py-4 rounded-xl items-center ${
                destructive ? 'bg-red-500' : 'bg-blue-500'
              }`}
              onPress={onConfirm}
            >
              <Text className="text-white font-semibold text-lg">{confirmText}</Text>
            </Pressable>

            <Pressable className="py-4 rounded-xl items-center bg-gray-100" onPress={onCancel}>
              <Text className="text-gray-700 font-semibold text-lg">{cancelText}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
