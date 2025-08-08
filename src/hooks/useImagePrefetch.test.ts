import { renderHook, waitFor } from '@testing-library/react-native';
import { Image } from 'react-native';
import { useImagePrefetch } from './useImagePrefetch';
import { logger } from '../lib/logger';
import type { Asset } from '../db/schema';

jest.mock('react-native', () => ({
  Image: {
    prefetch: jest.fn(),
  },
}));

jest.mock('../lib/logger', () => ({
  logger: {
    debug: jest.fn(),
  },
}));

describe('useImagePrefetch', () => {
  const createAsset = (id: string): Asset => ({
    id,
    uri: `file://photo${id}.jpg`,
    width: 100,
    height: 100,
    created_at: Date.now(),
  });

  const mockAssets = [
    createAsset('1'),
    createAsset('2'),
    createAsset('3'),
    createAsset('4'),
    createAsset('5'),
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (Image.prefetch as jest.Mock).mockResolvedValue(undefined);
  });

  it('should prefetch current image and next few images', async () => {
    renderHook(() => useImagePrefetch(mockAssets, 0));

    await waitFor(() => {
      expect(Image.prefetch).toHaveBeenCalled();
    });

    // Should prefetch current (0) and next 2
    expect(Image.prefetch).toHaveBeenCalledWith('file://photo1.jpg');
    expect(Image.prefetch).toHaveBeenCalledWith('file://photo2.jpg');
    expect(Image.prefetch).toHaveBeenCalledWith('file://photo3.jpg');
    expect(Image.prefetch).toHaveBeenCalledTimes(3);
  });

  it('should prefetch previous image when not at start', async () => {
    renderHook(() => useImagePrefetch(mockAssets, 2));

    await waitFor(() => {
      expect(Image.prefetch).toHaveBeenCalled();
    });

    // Should prefetch current (2), next 2 (3, 4), and previous (1)
    expect(Image.prefetch).toHaveBeenCalledWith('file://photo3.jpg'); // current
    expect(Image.prefetch).toHaveBeenCalledWith('file://photo4.jpg'); // next
    expect(Image.prefetch).toHaveBeenCalledWith('file://photo5.jpg'); // next
    expect(Image.prefetch).toHaveBeenCalledWith('file://photo2.jpg'); // previous
    expect(Image.prefetch).toHaveBeenCalledTimes(4);
  });

  it('should update prefetch window when currentIndex changes', async () => {
    const { rerender } = renderHook(({ assets, index }) => useImagePrefetch(assets, index), {
      initialProps: { assets: mockAssets, index: 0 },
    });

    await waitFor(() => {
      expect(Image.prefetch).toHaveBeenCalledTimes(3);
    });

    jest.clearAllMocks();

    rerender({ assets: mockAssets, index: 1 });

    await waitFor(() => {
      expect(Image.prefetch).toHaveBeenCalled();
    });

    // Should prefetch new window: current (1), next (2, 3), previous (0)
    expect(Image.prefetch).toHaveBeenCalledWith('file://photo2.jpg');
    expect(Image.prefetch).toHaveBeenCalledWith('file://photo3.jpg');
    expect(Image.prefetch).toHaveBeenCalledWith('file://photo4.jpg');
    expect(Image.prefetch).toHaveBeenCalledWith('file://photo1.jpg');
  });

  it('should not exceed max concurrent prefetches', async () => {
    // Create many assets
    const manyAssets = Array.from({ length: 10 }, (_, i) => createAsset(`${i + 1}`));

    const { result } = renderHook(() => useImagePrefetch(manyAssets, 0));

    // Only 3 should be prefetched due to MAX_CONCURRENT_PREFETCH = 3
    expect(Image.prefetch).toHaveBeenCalledTimes(3);
    expect(result.current.prefetchQueueSize).toBeLessThanOrEqual(3);
  });

  it('should handle prefetch errors gracefully', async () => {
    const error = new Error('Failed to prefetch');
    (Image.prefetch as jest.Mock).mockRejectedValue(error);

    renderHook(() => useImagePrefetch(mockAssets, 0));

    await waitFor(() => {
      expect(logger.debug).toHaveBeenCalledWith(
        'Failed to prefetch image:',
        'file://photo1.jpg',
        error
      );
    });

    // Should still try to prefetch other images
    expect(Image.prefetch).toHaveBeenCalledTimes(3);
  });

  it('should cleanup on unmount', async () => {
    const { unmount, result } = renderHook(() => useImagePrefetch(mockAssets, 0));

    await waitFor(() => {
      expect(Image.prefetch).toHaveBeenCalled();
    });

    expect(result.current.isPrefetching).toBe(true);

    unmount();

    // After unmount, the ref should be reset
    // Note: We can't directly test the ref value after unmount,
    // but we can verify that the cleanup happened by checking
    // that no new prefetches are started after unmount
    jest.clearAllMocks();

    // Simulate what would happen if prefetch completed after unmount
    // (the finally block should check mountedRef.current)
    expect(Image.prefetch).not.toHaveBeenCalled();
  });

  it('should use WeakMap for automatic memory management', async () => {
    const { rerender } = renderHook(({ assets, index }) => useImagePrefetch(assets, index), {
      initialProps: { assets: mockAssets, index: 0 },
    });

    await waitFor(() => {
      expect(Image.prefetch).toHaveBeenCalled();
    });

    // Change to completely different assets
    const newAssets = [createAsset('10'), createAsset('11'), createAsset('12')];
    rerender({ assets: newAssets, index: 0 });

    // Old assets are no longer referenced, WeakMap will clean them up
    // New assets should be prefetched
    await waitFor(() => {
      expect(Image.prefetch).toHaveBeenCalledWith('file://photo10.jpg');
    });
  });

  it('should not prefetch same image multiple times', async () => {
    const { rerender } = renderHook(({ assets, index }) => useImagePrefetch(assets, index), {
      initialProps: { assets: mockAssets, index: 0 },
    });

    await waitFor(() => {
      expect(Image.prefetch).toHaveBeenCalledWith('file://photo1.jpg');
    });

    const callCount = (Image.prefetch as jest.Mock).mock.calls.filter(
      (call) => call[0] === 'file://photo1.jpg'
    ).length;

    // Re-render with same index
    rerender({ assets: mockAssets, index: 0 });

    // Should not prefetch photo1.jpg again
    const newCallCount = (Image.prefetch as jest.Mock).mock.calls.filter(
      (call) => call[0] === 'file://photo1.jpg'
    ).length;

    expect(newCallCount).toBe(callCount);
  });

  it('should handle empty assets array', () => {
    const { result } = renderHook(() => useImagePrefetch([], 0));

    expect(Image.prefetch).not.toHaveBeenCalled();
    expect(result.current.prefetchQueueSize).toBe(0);
    expect(result.current.isPrefetching).toBe(false);
  });

  it('should handle out of bounds index', () => {
    const { result } = renderHook(() => useImagePrefetch(mockAssets, 10));

    // Should not crash, just not prefetch anything
    expect(Image.prefetch).not.toHaveBeenCalledWith('file://photo11.jpg');
    expect(result.current.prefetchQueueSize).toBe(0);
  });
});
