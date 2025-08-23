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
      <View className="flex-row mb-6 px-4">
        <View className="flex-row gap-3">
          {FILTERS.map((f) => (
            <Pressable
              key={f}
              onPress={() => onFilterChange(f)}
              className={`px-4 py-2 ${filter === f ? '' : ''}`}
              testID={`filterTab_${f}`}
            >
              <Text
                className={`text-sm font-medium ${filter === f ? 'text-black' : 'text-gray-400'}`}
              >
                {t(`deck.filters.${f}`)}
              </Text>
              {filter === f && <View className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />}
            </Pressable>
          ))}
        </View>

        <View className="flex-1 items-end justify-center">
          <Text className="text-sm text-gray-500 font-medium">
            {reviewedCount}/{availableCount}
          </Text>
        </View>
      </View>
    );
  }
);

FilterTabs.displayName = 'FilterTabs';
