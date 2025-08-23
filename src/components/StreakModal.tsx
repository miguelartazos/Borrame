import React, { memo, useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { useGoalStore, useWeeklyActivity } from '../store/useGoalStore';
import { useSettings } from '../store/useSettings';

interface StreakModalProps {
  visible: boolean;
  onClose: () => void;
}

const DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

export const StreakModal = memo(({ visible, onClose }: StreakModalProps) => {
  const { t } = useTranslation();
  const hapticFeedback = useSettings((s) => s.hapticFeedback);
  const weeklyActivity = useWeeklyActivity();

  const minutesPerDay = useGoalStore((s) => s.minutesPerDay);
  const targetMB = useGoalStore((s) => s.targetMB);
  const setMinutesPerDay = useGoalStore((s) => s.setMinutesPerDay);
  const setTargetMB = useGoalStore((s) => s.setTargetMB);

  const [tempMinutes, setTempMinutes] = useState(minutesPerDay);
  const [tempMB, setTempMB] = useState(targetMB);

  useEffect(() => {
    if (visible) {
      setTempMinutes(minutesPerDay);
      setTempMB(targetMB);
    }
  }, [visible, minutesPerDay, targetMB]);

  const handleSave = async () => {
    if (hapticFeedback) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setMinutesPerDay(tempMinutes);
    setTargetMB(tempMB);
    onClose();
  };

  const handleCancel = () => {
    setTempMinutes(minutesPerDay);
    setTempMB(targetMB);
    onClose();
  };

  const handleSliderStart = async () => {
    if (hapticFeedback) {
      await Haptics.selectionAsync();
    }
  };

  const handleMinutesChange = (value: number) => {
    const validValue = Number.isNaN(value) ? tempMinutes : Math.round(value);
    setTempMinutes(validValue);
  };

  const handleMBChange = (value: number) => {
    const validValue = Number.isNaN(value) ? tempMB : Math.round(value);
    setTempMB(validValue);
  };

  const today = new Date().getDay();
  const mondayFirst = today === 0 ? 6 : today - 1;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleCancel}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 bg-dark-100"
      >
        <View className="flex-1">
          {/* Header */}
          <View className="flex-row items-center justify-between px-4 pt-16 pb-4">
            <Text className="text-white text-xl font-semibold">{t('streak.modal.title')}</Text>
            <Pressable
              onPress={handleCancel}
              className="w-10 h-10 items-center justify-center"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={24} color="#9CA3AF" />
            </Pressable>
          </View>

          <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
            {/* Minutes Slider */}
            <View className="px-4 mb-8">
              <Text className="text-gray-400 text-sm mb-2">{t('streak.modal.minutesLabel')}</Text>
              <View className="bg-dark-400 rounded-xl p-4">
                <View className="flex-row items-baseline justify-between mb-3">
                  <Text className="text-white text-2xl font-bold">{tempMinutes}</Text>
                  <Text className="text-gray-500 text-sm">{t('streak.modal.minutesUnit')}</Text>
                </View>
                <Slider
                  value={tempMinutes}
                  onValueChange={handleMinutesChange}
                  onSlidingStart={handleSliderStart}
                  minimumValue={5}
                  maximumValue={60}
                  step={5}
                  minimumTrackTintColor="#FF7A1A"
                  maximumTrackTintColor="#374151"
                  thumbTintColor="#FF7A1A"
                />
                <View className="flex-row justify-between mt-2">
                  <Text className="text-gray-600 text-xs">5 min</Text>
                  <Text className="text-gray-600 text-xs">60 min</Text>
                </View>
              </View>
            </View>

            {/* MB Target Slider */}
            <View className="px-4 mb-8">
              <Text className="text-gray-400 text-sm mb-2">{t('streak.modal.mbLabel')}</Text>
              <View className="bg-dark-400 rounded-xl p-4">
                <View className="flex-row items-baseline justify-between mb-3">
                  <Text className="text-white text-2xl font-bold">{tempMB}</Text>
                  <Text className="text-gray-500 text-sm">MB</Text>
                </View>
                <Slider
                  value={tempMB}
                  onValueChange={handleMBChange}
                  onSlidingStart={handleSliderStart}
                  minimumValue={10}
                  maximumValue={500}
                  step={10}
                  minimumTrackTintColor="#FF7A1A"
                  maximumTrackTintColor="#374151"
                  thumbTintColor="#FF7A1A"
                />
                <View className="flex-row justify-between mt-2">
                  <Text className="text-gray-600 text-xs">10 MB</Text>
                  <Text className="text-gray-600 text-xs">500 MB</Text>
                </View>
              </View>
            </View>

            {/* Week View */}
            <View className="px-4 mb-8">
              <Text className="text-gray-400 text-sm mb-2">{t('streak.modal.weekLabel')}</Text>
              <View className="bg-dark-400 rounded-xl p-4">
                <View className="flex-row justify-between">
                  {DAYS.map((day, index) => {
                    const isActive = weeklyActivity[index];
                    const isToday = index === mondayFirst;

                    return (
                      <View
                        key={index}
                        className={`w-10 h-10 rounded-full items-center justify-center ${
                          isActive
                            ? 'bg-orange-500'
                            : isToday
                              ? 'bg-dark-500 border border-orange-500'
                              : 'bg-dark-500'
                        }`}
                      >
                        <Text
                          className={`text-xs font-semibold ${
                            isActive ? 'text-white' : 'text-gray-500'
                          }`}
                        >
                          {day}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Save Button */}
          <View className="px-4 pb-8">
            <Pressable onPress={handleSave} className="bg-orange-500 rounded-xl py-4 items-center">
              <Text className="text-white text-base font-semibold">{t('streak.modal.save')}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
});

StreakModal.displayName = 'StreakModal';
