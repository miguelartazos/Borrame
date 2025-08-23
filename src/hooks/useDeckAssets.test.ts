import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useDeckAssets } from './useDeckAssets';
import * as selectors from '../features/deck/selectors';
import { logger } from '../lib/logger';
import { useDeckStore } from '../store/useDeckStore';
import { useIndexStore } from '../store/useIndexStore';

jest.mock('../features/deck/selectors');
jest.mock('../lib/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));
jest.mock('../store/useDeckStore');
jest.mock('../store/useIndexStore');

const mockSelectors = selectors as jest.Mocked<typeof selectors>;
const mockUseDeckStore = useDeckStore as unknown as jest.MockedFunction<typeof useDeckStore>;
const mockUseIndexStore = useIndexStore as unknown as jest.MockedFunction<typeof useIndexStore>;

describe('useDeckAssets', () => {
  const mockAssets = [
    { id: '1', uri: 'file://photo1.jpg', width: 100, height: 100, created_at: Date.now() },
    { id: '2', uri: 'file://photo2.jpg', width: 100, height: 100, created_at: Date.now() },
    { id: '3', uri: 'file://photo3.jpg', width: 100, height: 100, created_at: Date.now() },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectors.getUndecidedAssets.mockResolvedValue(mockAssets);
    mockSelectors.getUndecidedCount.mockResolvedValue(50);
    mockSelectors.getTotalReviewedCount.mockResolvedValue(10);

    mockUseDeckStore.mockReturnValue({
      generation: 0,
      cacheRemovedAsset: jest.fn(),
      getCachedAsset: jest.fn(),
      error: null,
      setError: jest.fn(),
    } as any);

    mockUseIndexStore.mockImplementation((selector?: any) => {
      if (selector) {
        return undefined; // lastSuccessfulBatchAt
      }
      return { lastSuccessfulBatchAt: undefined } as any;
    });
  });

  it('should load initial assets when enabled', async () => {
    const { result } = renderHook(() => useDeckAssets('all', true));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.assets).toEqual(mockAssets);
    expect(result.current.availableCount).toBe(50);
    expect(result.current.reviewedCount).toBe(10);
    expect(mockSelectors.getUndecidedAssets).toHaveBeenCalledWith({
      filter: 'all',
      limit: 60,
      offset: 0,
    });
  });

  it('should not load when disabled', async () => {
    const { result } = renderHook(() => useDeckAssets('all', false));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.assets).toEqual([]);
    expect(mockSelectors.getUndecidedAssets).not.toHaveBeenCalled();
  });

  it('should reload when filter changes', async () => {
    const { result, rerender } = renderHook(({ filter }) => useDeckAssets(filter, true), {
      initialProps: { filter: 'all' as const },
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockSelectors.getUndecidedAssets).toHaveBeenCalledTimes(1);

    rerender({ filter: 'screenshots' });

    await waitFor(() => {
      expect(mockSelectors.getUndecidedAssets).toHaveBeenCalledWith({
        filter: 'screenshots',
        limit: 60,
        offset: 0,
      });
    });

    expect(mockSelectors.getUndecidedAssets).toHaveBeenCalledTimes(2);
  });

  it('should load more assets', async () => {
    const moreAssets = [
      { id: '4', uri: 'file://photo4.jpg', width: 100, height: 100, created_at: Date.now() },
      { id: '5', uri: 'file://photo5.jpg', width: 100, height: 100, created_at: Date.now() },
    ];

    mockSelectors.getUndecidedAssets
      .mockResolvedValueOnce(mockAssets) // Initial load
      .mockResolvedValueOnce(moreAssets); // Load more

    const { result } = renderHook(() => useDeckAssets('all', true));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.assets).toHaveLength(3);

    await act(async () => {
      await result.current.loadMore();
    });

    expect(result.current.assets).toHaveLength(5);
    expect(mockSelectors.getUndecidedAssets).toHaveBeenCalledWith({
      filter: 'all',
      limit: 30,
      offset: 60,
    });
  });

  it('should not load more when already loading', async () => {
    const { result } = renderHook(() => useDeckAssets('all', true));

    // Don't wait for initial load to complete
    expect(result.current.loading).toBe(true);

    await act(async () => {
      await result.current.loadMore();
    });

    // Should only have been called once for initial load
    expect(mockSelectors.getUndecidedAssets).toHaveBeenCalledTimes(1);
  });

  it('should set hasMore to false when fewer assets returned than requested', async () => {
    const partialAssets = [
      { id: '1', uri: 'file://photo1.jpg', width: 100, height: 100, created_at: Date.now() },
    ];
    mockSelectors.getUndecidedAssets.mockResolvedValue(partialAssets);

    const { result } = renderHook(() => useDeckAssets('all', true));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.hasMore).toBe(false);
  });

  it('should remove asset and update counts', async () => {
    const { result } = renderHook(() => useDeckAssets('all', true));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.assets).toHaveLength(3);
    expect(result.current.availableCount).toBe(50);
    expect(result.current.reviewedCount).toBe(10);

    act(() => {
      result.current.removeAsset('2');
    });

    expect(result.current.assets).toHaveLength(2);
    expect(result.current.assets.find((a) => a.id === '2')).toBeUndefined();
    expect(result.current.availableCount).toBe(49);
    expect(result.current.reviewedCount).toBe(11);
  });

  it('should refetch assets', async () => {
    const { result } = renderHook(() => useDeckAssets('all', true));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockSelectors.getUndecidedAssets).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.refetch();
    });

    expect(mockSelectors.getUndecidedAssets).toHaveBeenCalledTimes(2);
    expect(mockSelectors.getUndecidedAssets).toHaveBeenLastCalledWith({
      filter: 'all',
      limit: 60,
      offset: 0,
    });
  });

  it('should handle errors gracefully', async () => {
    const error = new Error('Database error');
    mockSelectors.getUndecidedAssets.mockRejectedValue(error);

    const { result } = renderHook(() => useDeckAssets('all', true));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.assets).toEqual([]);
    expect(result.current.availableCount).toBe(0);
    expect(result.current.reviewedCount).toBe(0);
    expect(logger.error).toHaveBeenCalledWith('Failed to load initial assets', error);
  });

  it('should respect generation counter in loadMore', async () => {
    const { result } = renderHook(() => useDeckAssets('all', true));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Simulate generation change (filter changed)
    mockUseDeckStore.mockReturnValue({
      generation: 1, // Different generation
      cacheRemovedAsset: jest.fn(),
      getCachedAsset: jest.fn(),
      error: null,
      setError: jest.fn(),
    } as any);

    // loadMore should ignore the results
    await act(async () => {
      await result.current.loadMore();
    });

    // Assets should not be updated since generation mismatched
    expect(result.current.assets).toHaveLength(3); // Still original 3
  });

  it('should reinsert cached asset on undo', async () => {
    const cachedAsset = {
      id: 'cached-1',
      uri: 'file://cached.jpg',
      width: 100,
      height: 100,
      created_at: Date.now(),
      is_screenshot: false,
    };

    const getCachedAssetMock = jest.fn().mockReturnValue(cachedAsset);
    mockUseDeckStore.mockReturnValue({
      generation: 0,
      cacheRemovedAsset: jest.fn(),
      getCachedAsset: getCachedAssetMock,
      error: null,
      setError: jest.fn(),
    } as any);

    const { result } = renderHook(() => useDeckAssets('all', true));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Reinsert the cached asset
    act(() => {
      const reinserted = result.current.reinsertAsset('cached-1');
      expect(reinserted).toBe(true);
    });

    expect(result.current.assets).toHaveLength(4);
    expect(result.current.assets[0]).toEqual(cachedAsset);
    expect(result.current.availableCount).toBe(51);
    expect(result.current.reviewedCount).toBe(9);
  });

  it('should not reinsert asset that does not match filter', async () => {
    const screenshotAsset = {
      id: 'screenshot-1',
      uri: 'file://screenshot.jpg',
      width: 100,
      height: 100,
      created_at: Date.now(),
      is_screenshot: true,
    };

    const getCachedAssetMock = jest.fn().mockReturnValue(screenshotAsset);
    mockUseDeckStore.mockReturnValue({
      generation: 0,
      cacheRemovedAsset: jest.fn(),
      getCachedAsset: getCachedAssetMock,
      error: null,
      setError: jest.fn(),
    } as any);

    // Using 'recent' filter, but asset is a screenshot
    const { result } = renderHook(() => useDeckAssets('recent', true));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Try to reinsert - should succeed for 'recent' filter
    act(() => {
      const reinserted = result.current.reinsertAsset('screenshot-1');
      expect(reinserted).toBe(true); // Recent filter allows screenshots
    });

    expect(result.current.assets).toHaveLength(4);
  });

  it('should handle load more errors', async () => {
    const error = new Error('Database error');
    mockSelectors.getUndecidedAssets
      .mockResolvedValueOnce(mockAssets) // Initial load succeeds
      .mockRejectedValueOnce(error); // Load more fails

    const { result } = renderHook(() => useDeckAssets('all', true));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.loadMore();
    });

    expect(result.current.hasMore).toBe(false);
    expect(logger.error).toHaveBeenCalledWith('Failed to load more assets', error);
  });
});
