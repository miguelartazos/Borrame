import React, { memo } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { FilterType } from '../features/deck/selectors';

interface FilterTabsProps {
  filter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  availableCount: number;
  reviewedCount: number;
}

const FILTERS: FilterType[] = ['all', 'screenshots', 'recent'];

export const FilterTabs = memo(
  ({ filter, onFilterChange, availableCount, reviewedCount }: FilterTabsProps) => {
    const { t } = useTranslation();

    return (
      <View className="flex-row mb-4">
        <View className="flex-row flex-1 bg-white rounded-lg p-1">
          {FILTERS.map((f) => (
            <Pressable
              key={f}
              onPress={() => onFilterChange(f)}
              className={`flex-1 py-2 px-3 rounded-md ${filter === f ? 'bg-blue-500' : ''}`}
            >
              <Text
                className={`text-center text-sm font-medium ${
                  filter === f ? 'text-white' : 'text-gray-600'
                }`}
              >
                {t(`deck.filters.${f}`)}
              </Text>
            </Pressable>
          ))}
        </View>

        <View className="ml-4 justify-center">
          <Text className="text-sm text-gray-500">
            {t('deck.counter', { reviewed: reviewedCount, available: availableCount })}
          </Text>
        </View>
      </View>
    );
  }
);

FilterTabs.displayName = 'FilterTabs';
