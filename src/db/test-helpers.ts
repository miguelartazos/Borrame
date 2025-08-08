import {
  insertAssets,
  addIntent,
  listPendingDelete,
  getSpaceEstimateForPending,
  getAssetCount,
  getProcessedCount,
} from './helpers';

export async function testDatabaseOperations() {
  console.log('Starting database test...');

  try {
    const testAssets = [
      {
        uri: 'file:///test/photo1.jpg',
        filename: 'photo1.jpg',
        size_bytes: 1024000,
        width: 1920,
        height: 1080,
        created_at: Date.now() - 86400000,
        is_screenshot: 0,
      },
      {
        uri: 'file:///test/screenshot1.png',
        filename: 'screenshot1.png',
        size_bytes: 512000,
        width: 1170,
        height: 2532,
        created_at: Date.now() - 43200000,
        is_screenshot: 1,
      },
      {
        uri: 'file:///test/photo2.jpg',
        filename: 'photo2.jpg',
        size_bytes: 2048000,
        width: 3840,
        height: 2160,
        created_at: Date.now(),
        is_screenshot: 0,
      },
    ];

    console.log('Inserting test assets...');
    await insertAssets(testAssets);

    const assetCount = await getAssetCount();
    console.log(`Total assets in database: ${assetCount}`);

    console.log('Adding intents...');
    await addIntent('test-asset-1', 'delete');
    await addIntent('test-asset-2', 'keep');
    await addIntent('test-asset-3', 'delete');

    const pendingDelete = await listPendingDelete();
    console.log(`Pending deletions: ${pendingDelete.length}`);

    const spaceEstimate = await getSpaceEstimateForPending();
    console.log(
      `Space to be freed: ${spaceEstimate.count} files, ${(spaceEstimate.bytes / 1024 / 1024).toFixed(2)} MB`
    );

    const processedCounts = await getProcessedCount();
    console.log(
      `Processed: ${processedCounts.kept} kept, ${processedCounts.deleted} marked for deletion`
    );

    console.log('Database test completed successfully!');

    return {
      success: true,
      assetCount,
      pendingDelete: pendingDelete.length,
      spaceEstimate,
      processedCounts,
    };
  } catch (error) {
    console.error('Database test failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
