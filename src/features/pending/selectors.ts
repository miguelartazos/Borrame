import { db } from '../../db';
import type { Asset } from '../../db/schema';

export interface PendingAsset extends Asset {
  intentId: string;
  intentCreatedAt: number;
}

export async function getPendingAssets(limit = 100, offset = 0): Promise<PendingAsset[]> {
  const query = `
    SELECT 
      a.*,
      i.id as intentId,
      i.created_at as intentCreatedAt
    FROM assets a
    INNER JOIN intents i ON a.id = i.asset_id
    WHERE i.action = 'delete'
    ORDER BY i.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const result = await db.getAllAsync<PendingAsset>(query, [limit, offset]);
  return result;
}

export async function getPendingCount(): Promise<number> {
  const query = `
    SELECT COUNT(*) as count
    FROM intents
    WHERE action = 'delete'
  `;

  const result = await db.getFirstAsync<{ count: number }>(query);
  return result?.count ?? 0;
}

export async function getPendingSpaceEstimate(): Promise<number> {
  const query = `
    SELECT SUM(a.size_bytes) as total
    FROM assets a
    INNER JOIN intents i ON a.id = i.asset_id
    WHERE i.action = 'delete' AND a.size_bytes IS NOT NULL
  `;

  const result = await db.getFirstAsync<{ total: number | null }>(query);
  return result?.total ?? 0;
}

export async function removePendingIntents(assetIds: string[]): Promise<void> {
  if (assetIds.length === 0) return;

  const placeholders = assetIds.map(() => '?').join(',');
  const query = `DELETE FROM intents WHERE asset_id IN (${placeholders}) AND action = 'delete'`;

  await db.runAsync(query, assetIds);
}

export async function restoreAllPending(): Promise<void> {
  await db.runAsync(`DELETE FROM intents WHERE action = 'delete'`);
}
