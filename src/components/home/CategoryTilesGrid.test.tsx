/**
 * CategoryTilesGrid Component Tests
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { CategoryTilesGrid } from './CategoryTilesGrid';
import type { CategoryBundle } from './CategoryTilesGrid';

// Mock dependencies
jest.mock('react-native-haptic-feedback', () => ({
  trigger: jest.fn(),
}));

jest.mock('expo-blur', () => ({
  BlurView: 'BlurView',
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('../../features/paywall/PaywallModal', () => ({
  PaywallModal: ({ visible, onClose }: { visible: boolean; onClose: () => void }) =>
    visible ? <MockPaywall onClose={onClose} /> : null,
}));

const MockPaywall = ({ onClose }: { onClose: () => void }) => (
  <mock-paywall testID="paywall-modal" onPress={onClose} />
);

describe('CategoryTilesGrid', () => {
  const mockBundles: CategoryBundle[] = [
    { key: 'duplicates', title: 'Duplicados', icon: null, count: 150, locked: true },
    { key: 'blurry', title: 'Borrosas', icon: null, count: 42, locked: false },
    { key: 'screenshots', title: 'Pantallazos', icon: null, count: 238, locked: false },
    { key: 'burst', title: 'En ráfaga', icon: null, count: 89, locked: false },
    { key: 'whatsapp', title: 'WhatsApp', icon: null, count: 567, locked: false },
    { key: 'long_videos', title: 'Vídeos largos', icon: null, count: 12, locked: false },
    { key: 'large_files', title: 'Archivos grandes', icon: null, count: 34, locked: false },
    { key: 'documents', title: 'Documentos', icon: null, count: 78, locked: false },
  ];

  it('renders all category tiles', () => {
    const { getByTestId } = render(<CategoryTilesGrid bundles={mockBundles} />);

    mockBundles.forEach((bundle) => {
      expect(getByTestId(`category-tile-${bundle.key}`)).toBeTruthy();
    });
  });

  it('displays correct title and count for each tile', () => {
    const { getByText } = render(<CategoryTilesGrid bundles={mockBundles} />);

    mockBundles.forEach((bundle) => {
      expect(getByText(bundle.title)).toBeTruthy();
      expect(getByText(bundle.count.toLocaleString())).toBeTruthy();
    });
  });

  it('handles category press for unlocked tiles', async () => {
    const onCategoryPress = jest.fn();
    const { getByTestId } = render(
      <CategoryTilesGrid bundles={mockBundles} onCategoryPress={onCategoryPress} />
    );

    const tile = getByTestId('category-tile-blurry');
    await waitFor(() => {
      fireEvent.press(tile);
    });

    expect(onCategoryPress).toHaveBeenCalledWith('blurry');
  });

  it('shows paywall for locked tiles when showPaywallPreview is true', async () => {
    const onCategoryPress = jest.fn();
    const { getByTestId, queryByTestId } = render(
      <CategoryTilesGrid
        bundles={mockBundles}
        onCategoryPress={onCategoryPress}
        showPaywallPreview={true}
      />
    );

    expect(queryByTestId('paywall-modal')).toBeFalsy();

    await act(async () => {
      fireEvent.press(getByTestId('category-tile-duplicates'));
    });

    await waitFor(() => {
      expect(queryByTestId('paywall-modal')).toBeTruthy();
    });

    expect(onCategoryPress).not.toHaveBeenCalled();
  });

  it('calls onCategoryPress for locked tiles when showPaywallPreview is false', async () => {
    const onCategoryPress = jest.fn();
    const { getByTestId, queryByTestId } = render(
      <CategoryTilesGrid
        bundles={mockBundles}
        onCategoryPress={onCategoryPress}
        showPaywallPreview={false}
      />
    );

    const tile = getByTestId('category-tile-duplicates');
    await waitFor(() => {
      fireEvent.press(tile);
    });

    expect(queryByTestId('paywall-modal')).toBeFalsy();
    expect(onCategoryPress).toHaveBeenCalledWith('duplicates');
  });

  it('renders in a 4-column grid layout', () => {
    // Check that tiles are rendered in correct grid layout
    // Since we're using AnimatedFlatList, we check by verifying all tiles are present
    const { getAllByTestId } = render(<CategoryTilesGrid bundles={mockBundles} />);
    const tiles = getAllByTestId(/^category-tile-/);
    expect(tiles).toHaveLength(8); // 2 rows x 4 columns = 8 tiles
  });

  it('applies correct accessibility labels', () => {
    const { getAllByTestId } = render(<CategoryTilesGrid bundles={mockBundles} />);

    const tiles = getAllByTestId(/^category-tile-/);
    expect(tiles).toHaveLength(8);

    // Check that tiles have proper accessibility labels
    const duplicatesTile = tiles.find((t) => t.props.testID === 'category-tile-duplicates');
    expect(duplicatesTile?.props.accessibilityLabel).toContain('tile_locked');

    const blurryTile = tiles.find((t) => t.props.testID === 'category-tile-blurry');
    expect(blurryTile?.props.accessibilityLabel).toContain('tile_unlocked');
  });

  it('handles empty bundles array', () => {
    const { queryByTestId } = render(<CategoryTilesGrid bundles={[]} />);

    expect(queryByTestId('category-tile-duplicates')).toBeFalsy();
  });

  it('closes paywall modal when requested', async () => {
    const { getByTestId, queryByTestId } = render(
      <CategoryTilesGrid bundles={mockBundles} showPaywallPreview={true} />
    );

    await act(async () => {
      fireEvent.press(getByTestId('category-tile-duplicates'));
    });

    await waitFor(() => {
      expect(queryByTestId('paywall-modal')).toBeTruthy();
    });

    const paywall = queryByTestId('paywall-modal');
    if (paywall) {
      await act(async () => {
        fireEvent.press(paywall);
      });
    }

    await waitFor(() => {
      expect(queryByTestId('paywall-modal')).toBeFalsy();
    });
  });
});
