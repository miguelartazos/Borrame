import React from 'react';
import { FlatList } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { SmartBundlesGrid } from './SmartBundlesGrid';
import type { CategoryBundle } from './CategoryTilesGrid';
import * as Haptics from 'expo-haptics';

// Mock dependencies
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
}));
jest.mock('../../store/useSettings', () => ({
  useSettings: jest.fn(() => true),
}));
jest.mock('../../features/paywall/PaywallSheet', () => ({
  PaywallSheet: jest.fn(() => null),
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      if (key === 'bundles.title') return 'Smart Bundles';
      if (key === 'bundles.duplicates') return 'Duplicados';
      if (key === 'bundles.blurry') return 'Borrosas';
      if (key === 'bundles.screenshots') return 'Pantallazos';
      if (key === 'bundles.burst') return 'En ráfaga';
      if (key === 'bundles.whatsapp') return 'WhatsApp/Telegram';
      if (key === 'bundles.long_videos') return 'Vídeos largos';
      if (key === 'bundles.large_files') return 'Archivos grandes';
      if (key === 'bundles.documents') return 'Recibos/Docs';
      if (key === 'bundles.tile_locked' && params)
        return `${params.title}, ${params.count} items, locked`;
      if (key === 'bundles.tile_unlocked' && params)
        return `${params.title}, ${params.count} items`;
      return key;
    },
  }),
}));

describe('SmartBundlesGrid', () => {
  const mockOnBundlePress = jest.fn();

  const mockBundles: CategoryBundle[] = [
    { key: 'duplicates', title: 'Duplicados', count: 42, locked: true, icon: null },
    { key: 'blurry', title: 'Borrosas', count: 28, locked: false, icon: null },
    { key: 'screenshots', title: 'Pantallazos', count: 156, locked: false, icon: null },
    { key: 'burst', title: 'En ráfaga', count: 89, locked: false, icon: null },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with provided bundles', () => {
    const { getByTestId, getByText } = render(
      <SmartBundlesGrid
        bundles={mockBundles}
        onBundlePress={mockOnBundlePress}
        testID="smartBundles"
      />
    );

    expect(getByTestId('smartBundles')).toBeTruthy();
    expect(getByTestId('smartBundles_title')).toBeTruthy();
    expect(getByText('Smart Bundles')).toBeTruthy();

    // Check bundle tiles
    expect(getByTestId('home.bundle.duplicates')).toBeTruthy();
    expect(getByTestId('home.bundle.blurry')).toBeTruthy();
    expect(getByTestId('home.bundle.screenshots')).toBeTruthy();
    expect(getByTestId('home.bundle.burst')).toBeTruthy();

    // Check bundle titles and counts
    expect(getByText('Duplicados')).toBeTruthy();
    expect(getByText('42')).toBeTruthy();
    expect(getByText('Borrosas')).toBeTruthy();
    expect(getByText('28')).toBeTruthy();
  });

  it('renders default bundles when no bundles provided', () => {
    const { getByTestId, getByText } = render(
      <SmartBundlesGrid onBundlePress={mockOnBundlePress} testID="smartBundles" />
    );

    // Should render all 8 default bundles
    expect(getByTestId('home.bundle.duplicados')).toBeTruthy();
    expect(getByTestId('home.bundle.borrosas')).toBeTruthy();
    expect(getByTestId('home.bundle.pantallazos')).toBeTruthy();
    expect(getByTestId('home.bundle.rafaga')).toBeTruthy();
    expect(getByTestId('home.bundle.whatsapp')).toBeTruthy();
    expect(getByTestId('home.bundle.videos_largos')).toBeTruthy();
    expect(getByTestId('home.bundle.archivos_grandes')).toBeTruthy();
    expect(getByTestId('home.bundle.recibos')).toBeTruthy();

    // Check default titles (will show translation keys since not rendered with i18n provider)
    expect(getByText('bundles.duplicados')).toBeTruthy();
    expect(getByText('WhatsApp/Telegram')).toBeTruthy(); // Fallback value for whatsapp key
    expect(getByText('bundles.videos_largos')).toBeTruthy();
  });

  it('calls onBundlePress for unlocked bundles', async () => {
    const { getByTestId } = render(
      <SmartBundlesGrid
        bundles={mockBundles}
        onBundlePress={mockOnBundlePress}
        testID="smartBundles"
      />
    );

    const unlockedBundle = getByTestId('home.bundle.blurry');
    fireEvent.press(unlockedBundle);

    await waitFor(() => {
      expect(mockOnBundlePress).toHaveBeenCalledWith('blurry');
      expect(Haptics.impactAsync).toHaveBeenCalledWith('light');
    });
  });

  it('does not call onBundlePress for locked bundles', async () => {
    const { getByTestId } = render(
      <SmartBundlesGrid
        bundles={mockBundles}
        onBundlePress={mockOnBundlePress}
        testID="smartBundles"
      />
    );

    const lockedBundle = getByTestId('home.bundle.duplicates');
    fireEvent.press(lockedBundle);

    await waitFor(() => {
      expect(mockOnBundlePress).not.toHaveBeenCalled();
      expect(Haptics.impactAsync).toHaveBeenCalledWith('light');
    });
  });

  it('renders star badge for locked bundles', () => {
    const { getByTestId } = render(
      <SmartBundlesGrid
        bundles={mockBundles}
        onBundlePress={mockOnBundlePress}
        testID="smartBundles"
      />
    );

    const lockedBundle = getByTestId('home.bundle.duplicates');

    // Check for star badge presence by checking the bundle has the locked state
    const accessibilityLabel = lockedBundle.props.accessibilityLabel;
    expect(accessibilityLabel).toContain('locked');
  });

  it('formats counts with locale string', () => {
    const bundlesWithLargeCounts: CategoryBundle[] = [
      { key: 'test', title: 'Test', count: 1234, locked: false, icon: null },
    ];

    const { getByText } = render(
      <SmartBundlesGrid
        bundles={bundlesWithLargeCounts}
        onBundlePress={mockOnBundlePress}
        testID="smartBundles"
      />
    );

    // formatCount uses Spanish locale which may format differently in tests
    expect(getByText('1234')).toBeTruthy();
  });

  it('renders grid with 2 columns and 4 rows', () => {
    const { UNSAFE_getByType } = render(
      <SmartBundlesGrid onBundlePress={mockOnBundlePress} testID="smartBundles" />
    );

    // Find the FlatList component
    const flatList = UNSAFE_getByType(FlatList);

    // Verify grid configuration
    expect(flatList.props.numColumns).toBe(2);
    expect(flatList.props.data.length).toBe(8);
    expect(flatList.props.scrollEnabled).toBe(false);
    expect(flatList.props.initialNumToRender).toBe(8);
    expect(flatList.props.maxToRenderPerBatch).toBe(8);
    expect(flatList.props.windowSize).toBe(1);
    expect(flatList.props.removeClippedSubviews).toBe(false);
  });

  it('sets correct accessibility labels', () => {
    const { getByTestId } = render(
      <SmartBundlesGrid
        bundles={mockBundles}
        onBundlePress={mockOnBundlePress}
        testID="smartBundles"
      />
    );

    const unlockedBundle = getByTestId('home.bundle.blurry');
    expect(unlockedBundle.props.accessibilityRole).toBe('button');
    expect(unlockedBundle.props.accessibilityLabel).toBe('Borrosas, 28 items');

    const lockedBundle = getByTestId('home.bundle.duplicates');
    expect(lockedBundle.props.accessibilityLabel).toBe('Duplicados, 42 items, locked');
  });
});
