import React from 'react';
import { View, Text, Pressable, Modal } from 'react-native';
import { Search, Video, Clock } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { useSettings } from '../../store/useSettings';

interface QuickActionsSheetProps {
  visible: boolean;
  onDuplicates: () => void;
  onVideosOnly: () => void;
  onOldestFirst: () => void;
  onClose: () => void;
}

export function QuickActionsSheet({
  visible,
  onDuplicates,
  onVideosOnly,
  onOldestFirst,
  onClose,
}: QuickActionsSheetProps) {
  const { t } = useTranslation();
  const hapticFeedback = useSettings((s) => s.hapticFeedback);

  const handleActionPress = (action: () => void) => {
    if (hapticFeedback) Haptics.selectionAsync();
    action();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/50 justify-end" onPress={onClose}>
        <Pressable className="bg-dark-400 rounded-t-3xl p-6 pb-10">
          {/* Handle bar */}
          <View className="w-12 h-1 bg-gray-600 rounded-full self-center mb-6" />

          {/* Actions */}
          <View className="gap-3">
            <Pressable
              className="flex-row items-center py-4 px-4 bg-dark-600 rounded-xl"
              onPress={() => handleActionPress(onDuplicates)}
            >
              <Search size={24} color="#FF7A1A" />
              <Text className="text-white text-lg ml-4 flex-1">
                {t('library.actions.duplicates')}
              </Text>
            </Pressable>

            <Pressable
              className="flex-row items-center py-4 px-4 bg-dark-600 rounded-xl"
              onPress={() => handleActionPress(onVideosOnly)}
            >
              <Video size={24} color="#FF7A1A" />
              <Text className="text-white text-lg ml-4 flex-1">
                {t('library.actions.videosOnly')}
              </Text>
            </Pressable>

            <Pressable
              className="flex-row items-center py-4 px-4 bg-dark-600 rounded-xl"
              onPress={() => handleActionPress(onOldestFirst)}
            >
              <Clock size={24} color="#FF7A1A" />
              <Text className="text-white text-lg ml-4 flex-1">
                {t('library.actions.oldestFirst')}
              </Text>
            </Pressable>
          </View>

          {/* Cancel button */}
          <Pressable className="mt-4 py-4 rounded-xl items-center bg-dark-500" onPress={onClose}>
            <Text className="text-gray-400 font-semibold text-lg">{t('common.cancel')}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
