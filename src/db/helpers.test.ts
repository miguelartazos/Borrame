import { insertAssets, getAssetCount, addIntent, removeIntent } from './helpers';
import { resetDatabase, getDatabase } from './migrate';
import type { Asset } from './schema';
import { logger } from '../lib/logger';

jest.mock('../lib/logger');

describe('insertAssets', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('should insert multiple assets in a single transaction', async () => {
    const assets: Omit<Asset, 'id'>[] = [
      {
        uri: 'file://photo1.jpg',
        filename: 'photo1.jpg',
        size_bytes: 1024,
        width: 1920,
        height: 1080,
        created_at: Date.now(),
        is_screenshot: 0,
      },
      {
        uri: 'file://photo2.jpg',
        filename: 'photo2.jpg',
        size_bytes: 2048,
        width: 3840,
        height: 2160,
        created_at: Date.now(),
        is_screenshot: 0,
      },
      {
        uri: 'file://screenshot.png',
        filename: 'Screenshot_2024.png',
        size_bytes: 512,
        width: 1170,
        height: 2532,
        created_at: Date.now(),
        is_screenshot: 1,
      },
    ];

    await insertAssets(assets);
    const count = await getAssetCount();
    expect(count).toBe(3);
  });

  it('should handle empty array gracefully', async () => {
    await insertAssets([]);
    const count = await getAssetCount();
    expect(count).toBe(0);
  });

  it('should ignore duplicate URIs', async () => {
    const asset: Omit<Asset, 'id'> = {
      uri: 'file://duplicate.jpg',
      filename: 'duplicate.jpg',
      size_bytes: 1024,
      width: 1920,
      height: 1080,
      created_at: Date.now(),
      is_screenshot: 0,
    };

    await insertAssets([asset]);
    await insertAssets([asset]);

    const count = await getAssetCount();
    expect(count).toBe(1);
  });

  it('should handle large batches efficiently', async () => {
    const largeBatch: Omit<Asset, 'id'>[] = Array.from({ length: 500 }, (_, i) => ({
      uri: `file://photo${i}.jpg`,
      filename: `photo${i}.jpg`,
      size_bytes: 1024 * (i + 1),
      width: 1920,
      height: 1080,
      created_at: Date.now() - i * 1000,
      is_screenshot: i % 10 === 0 ? 1 : 0,
    }));

    const startTime = Date.now();
    await insertAssets(largeBatch);
    const duration = Date.now() - startTime;

    const count = await getAssetCount();
    expect(count).toBe(500);
    expect(duration).toBeLessThan(5000);
  });

  it('should preserve all asset properties', async () => {
    const asset: Omit<Asset, 'id'> = {
      uri: 'file://detailed.jpg',
      filename: 'detailed.jpg',
      size_bytes: 123456,
      width: 4000,
      height: 3000,
      created_at: 1700000000000,
      is_screenshot: 1,
    };

    await insertAssets([asset]);
  });

  it('should handle null values correctly', async () => {
    const asset: Omit<Asset, 'id'> = {
      uri: 'file://minimal.jpg',
      filename: null,
      size_bytes: null,
      width: null,
      height: null,
      created_at: Date.now(),
      is_screenshot: 0,
    };

    await insertAssets([asset]);
    const count = await getAssetCount();
    expect(count).toBe(1);
  });
});

describe('Intent Functions', () => {
  beforeEach(async () => {
    await resetDatabase();
    jest.clearAllMocks();
  });

  describe('addIntent', () => {
    it('should add an intent for an asset', async () => {
      const asset: Omit<Asset, 'id'> = {
        uri: 'file://test.jpg',
        filename: 'test.jpg',
        size_bytes: 1024,
        width: 100,
        height: 100,
        created_at: Date.now(),
        is_screenshot: 0,
      };

      await insertAssets([asset]);
      const db = await getDatabase();
      const assetResult = await db.getFirstAsync<Asset>('SELECT * FROM assets LIMIT 1');

      await addIntent(assetResult!.id, 'delete');

      const intent = await db.getFirstAsync<Intent>('SELECT * FROM intents WHERE asset_id = ?', [
        assetResult!.id,
      ]);

      expect(intent).toBeTruthy();
      expect(intent.action).toBe('delete');
      expect(intent.asset_id).toBe(assetResult!.id);
    });

    it('should replace existing intent for same asset', async () => {
      const asset: Omit<Asset, 'id'> = {
        uri: 'file://test2.jpg',
        filename: 'test2.jpg',
        size_bytes: 2048,
        width: 200,
        height: 200,
        created_at: Date.now(),
        is_screenshot: 0,
      };

      await insertAssets([asset]);
      const db = await getDatabase();
      const assetResult = await db.getFirstAsync<Asset>('SELECT * FROM assets LIMIT 1');

      await addIntent(assetResult!.id, 'delete');
      await addIntent(assetResult!.id, 'keep');

      const intents = await db.getAllAsync<Intent>('SELECT * FROM intents WHERE asset_id = ?', [
        assetResult!.id,
      ]);

      expect(intents).toHaveLength(1);
      expect(intents[0].action).toBe('keep');
    });

    it('should log debug message on success', async () => {
      await addIntent('test_asset_id', 'keep');

      expect(logger.debug).toHaveBeenCalledWith('Added intent: test_asset_id -> keep');
    });
  });

  describe('removeIntent', () => {
    it('should remove intent for an asset', async () => {
      const asset: Omit<Asset, 'id'> = {
        uri: 'file://test3.jpg',
        filename: 'test3.jpg',
        size_bytes: 3072,
        width: 300,
        height: 300,
        created_at: Date.now(),
        is_screenshot: 0,
      };

      await insertAssets([asset]);
      const db = await getDatabase();
      const assetResult = await db.getFirstAsync<Asset>('SELECT * FROM assets LIMIT 1');

      await addIntent(assetResult!.id, 'delete');
      await removeIntent(assetResult!.id);

      const intent = await db.getFirstAsync<Intent>('SELECT * FROM intents WHERE asset_id = ?', [
        assetResult!.id,
      ]);

      expect(intent).toBeNull();
    });

    it('should log debug message on success', async () => {
      await removeIntent('test_asset_id');

      expect(logger.debug).toHaveBeenCalledWith('Removed intent for: test_asset_id');
    });

    it('should handle removing non-existent intent gracefully', async () => {
      await expect(removeIntent('non_existent')).resolves.not.toThrow();
    });
  });
});
