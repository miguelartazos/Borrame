import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useDeckAssets } from './useDeckAssets';
import * as selectors from '../features/deck/selectors';
import { logger } from '../lib/logger';

jest.mock('../features/deck/selectors');
jest.mock('../lib/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

const mockSelectors = selectors as jest.Mocked<typeof selectors>;

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
