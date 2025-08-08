import { getDatabase } from './migrate';
import { Asset, Intent } from './schema';
import { logger } from '../lib/logger';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export async function insertAssets(assets: Omit<Asset, 'id'>[]): Promise<void> {
  if (assets.length === 0) return;

  const db = await getDatabase();

  // Wrap in transaction for rollback safety
  await db.runAsync('BEGIN TRANSACTION');

  try {
    const placeholders = assets.map(() => '(?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
    const values = assets.flatMap((asset) => [
      generateId(),
      asset.uri,
      asset.filename,
      asset.size_bytes,
      asset.width,
      asset.height,
      asset.created_at,
      asset.is_screenshot,
    ]);

    const sql = `
      INSERT OR IGNORE INTO assets (id, uri, filename, size_bytes, width, height, created_at, is_screenshot)
      VALUES ${placeholders}
    `;

    await db.runAsync(sql, values);
    await db.runAsync('COMMIT');
  } catch (error) {
    await db.runAsync('ROLLBACK');
    logger.error('Failed to insert assets batch', error);
    throw error;
  }
}

export async function upsertAsset(asset: Omit<Asset, 'id'>, id?: string): Promise<string> {
  const db = await getDatabase();
  const assetId = id || generateId();

  await db.runAsync(
    `INSERT OR REPLACE INTO assets (id, uri, filename, size_bytes, width, height, created_at, is_screenshot)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      assetId,
      asset.uri,
      asset.filename,
      asset.size_bytes,
      asset.width,
      asset.height,
      asset.created_at,
      asset.is_screenshot,
    ]
  );

  return assetId;
}

export async function addIntent(assetId: string, action: 'keep' | 'delete'): Promise<void> {
  try {
    const db = await getDatabase();
    const intentId = `intent_${generateId()}`;
    const createdAt = Date.now();

    await db.runAsync(
      `INSERT OR REPLACE INTO intents (id, asset_id, action, created_at)
       VALUES (?, ?, ?, ?)`,
      [intentId, assetId, action, createdAt]
    );

    logger.debug(`Added intent: ${assetId} -> ${action}`);
  } catch (error) {
    logger.error('Failed to add intent', error);
    throw error;
  }
}

export async function removeIntent(assetId: string): Promise<void> {
  try {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM intents WHERE asset_id = ?', [assetId]);
    logger.debug(`Removed intent for: ${assetId}`);
  } catch (error) {
    logger.error('Failed to remove intent', error);
    throw error;
  }
}

export async function listIntents(action?: 'keep' | 'delete'): Promise<Intent[]> {
  const db = await getDatabase();

  const sql = action
    ? 'SELECT * FROM intents WHERE action = ? ORDER BY created_at DESC'
    : 'SELECT * FROM intents ORDER BY created_at DESC';

  const params = action ? [action] : [];
  const result = await db.getAllAsync<Intent>(sql, params);

  return result;
}

export async function listPendingDelete(): Promise<Array<Asset & { intent_id: string }>> {
  const db = await getDatabase();

  const sql = `
    SELECT 
      a.*,
      i.id as intent_id
    FROM assets a
    INNER JOIN intents i ON a.id = i.asset_id
    WHERE i.action = 'delete'
    ORDER BY i.created_at DESC
  `;

  const result = await db.getAllAsync<Asset & { intent_id: string }>(sql);
  return result;
}

export async function getSpaceEstimateForPending(): Promise<{ count: number; bytes: number }> {
  const db = await getDatabase();

  const sql = `
    SELECT 
      COUNT(*) as count,
      COALESCE(SUM(a.size_bytes), 0) as bytes
    FROM assets a
    INNER JOIN intents i ON a.id = i.asset_id
    WHERE i.action = 'delete'
  `;

  const result = await db.getFirstAsync<{ count: number; bytes: number }>(sql);

  return result || { count: 0, bytes: 0 };
}

export async function getAssetsByIds(assetIds: string[]): Promise<Asset[]> {
  if (assetIds.length === 0) return [];

  const db = await getDatabase();
  const placeholders = assetIds.map(() => '?').join(', ');

  const sql = `SELECT * FROM assets WHERE id IN (${placeholders})`;
  const result = await db.getAllAsync<Asset>(sql, assetIds);

  return result;
}

export async function getUnprocessedAssets(limit: number = 100): Promise<Asset[]> {
  const db = await getDatabase();

  const sql = `
    SELECT a.*
    FROM assets a
    LEFT JOIN intents i ON a.id = i.asset_id
    WHERE i.id IS NULL
    ORDER BY a.created_at DESC
    LIMIT ?
  `;

  const result = await db.getAllAsync<Asset>(sql, [limit]);
  return result;
}

export async function getAssetCount(): Promise<number> {
  const db = await getDatabase();

  const result = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM assets');

  return result?.count || 0;
}

export async function getProcessedCount(): Promise<{ kept: number; deleted: number }> {
  const db = await getDatabase();

  const result = await db.getAllAsync<{ action: string; count: number }>(
    `SELECT action, COUNT(*) as count 
     FROM intents 
     GROUP BY action`
  );

  const counts = { kept: 0, deleted: 0 };

  for (const row of result) {
    if (row.action === 'keep') counts.kept = row.count;
    if (row.action === 'delete') counts.deleted = row.count;
  }

  return counts;
}
