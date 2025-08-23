/**
 * Example usage of CategoryTilesGrid
 */

import React from 'react';
import { View } from 'react-native';
import { CategoryTilesGrid } from './CategoryTilesGrid';
import { getCategoryBundles } from './mockCategoryData';
import { useTranslation } from 'react-i18next';

export const CategoryTilesExample = () => {
  const { t } = useTranslation();

  // Get bundles with real data from your app's state/store
  const bundles = getCategoryBundles(t);

  const handleCategoryPress = (_key: string) => {
    // Navigate to the appropriate deck/filter view
    // e.g., router.push(`/deck?filter=${_key}`);
    // Analytics can be tracked here
  };

  return (
    <View>
      <CategoryTilesGrid
        bundles={bundles}
        onCategoryPress={handleCategoryPress}
        showPaywallPreview={true}
      />
    </View>
  );
};

export default CategoryTilesExample;
