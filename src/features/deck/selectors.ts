import { db } from '../../db';
import type { Asset } from '../../db/schema';
import type { SQLParams } from '../../db/types';

export type FilterType = 'all' | 'screenshots' | 'recent' | 'videos' | 'duplicates';

interface DeckQueryOptions {
  filter: FilterType;
  limit: number;
  offset: number;
  monthFilter?: string;
  sortOrder?: 'newest' | 'oldest';
}

export async function getUndecidedAssetsByUris(
  uris: string[],
  sortOrder: 'newest' | 'oldest' = 'newest'
): Promise<Asset[]> {
  if (uris.length === 0) return [];
  // Chunk to avoid SQLite variable limits
  const orderDirection = sortOrder === 'oldest' ? 'ASC' : 'DESC';
  const chunkSize = 500;
  const all: Asset[] = [];
  for (let i = 0; i < uris.length; i += chunkSize) {
    const chunk = uris.slice(i, i + chunkSize);
    const placeholders = chunk.map(() => '?').join(',');
    const sql = `
      SELECT a.*
      FROM assets a
      LEFT JOIN intents i ON a.id = i.asset_id
      WHERE i.id IS NULL AND a.uri IN (${placeholders})
      ORDER BY a.created_at ${orderDirection}
    `;
    const result = await db.getAllAsync<Asset>(sql, chunk);
    all.push(...result);
  }
  return all;
}

export async function getUndecidedCountByUris(uris: string[]): Promise<number> {
  if (uris.length === 0) return 0;
  let count = 0;
  const chunkSize = 500;
  for (let i = 0; i < uris.length; i += chunkSize) {
    const chunk = uris.slice(i, i + chunkSize);
    const placeholders = chunk.map(() => '?').join(',');
    const sql = `
      SELECT COUNT(*) as count
      FROM assets a
      LEFT JOIN intents i ON a.id = i.asset_id
      WHERE i.id IS NULL AND a.uri IN (${placeholders})
    `;
    const result = await db.getFirstAsync<{ count: number }>(sql, chunk);
    count += result?.count ?? 0;
  }
  return count;
}

const RECENT_DAYS = 30;
const RECENT_TIMESTAMP = RECENT_DAYS * 24 * 60 * 60 * 1000;

export async function getUndecidedAssets({
  filter = 'all',
  limit = 60,
  offset = 0,
  monthFilter,
  sortOrder = 'newest',
}: DeckQueryOptions): Promise<Asset[]> {
  let query = `
    SELECT a.* 
    FROM assets a
    LEFT JOIN intents i ON a.id = i.asset_id
    WHERE i.id IS NULL
  `;

  const params: SQLParams = [];

  // Apply filter type first
  if (filter === 'screenshots') {
    query += ' AND a.is_screenshot = 1';
  } else if (filter === 'recent') {
    const recentCutoff = Date.now() - RECENT_TIMESTAMP;
    query += ' AND a.created_at >= ?';
    params.push(recentCutoff);
  } else if (filter === 'videos') {
    query += ` AND (a.filename LIKE '%.mp4' OR a.filename LIKE '%.mov' OR a.filename LIKE '%.avi')`;
  } else if (filter === 'duplicates') {
    // Duplicate detection tolerant to NULL size_bytes
    // Match on width/height and either equal size_bytes or both NULL
    query += ` AND EXISTS (
      SELECT 1 FROM assets a2
      LEFT JOIN intents i2 ON a2.id = i2.asset_id
      WHERE a2.id != a.id
      AND i2.id IS NULL
      AND a2.width = a.width
      AND a2.height = a.height
      AND (
        (a2.size_bytes IS NOT NULL AND a.size_bytes IS NOT NULL AND a2.size_bytes = a.size_bytes)
        OR (a2.size_bytes IS NULL AND a.size_bytes IS NULL)
      )
    )`;
  }

  // Apply month filter after filter type
  if (monthFilter) {
    query += ` AND strftime('%Y-%m', datetime(a.created_at / 1000, 'unixepoch')) = ?`;
    params.push(monthFilter);
  }

  // Apply sort order
  const orderDirection = sortOrder === 'oldest' ? 'ASC' : 'DESC';
  query += ` ORDER BY a.created_at ${orderDirection} LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const result = await db.getAllAsync<Asset>(query, params);
  return result;
}

export async function getUndecidedCount(
  filter: FilterType = 'all',
  monthFilter?: string
): Promise<number> {
  let query = `
    SELECT COUNT(*) as count
    FROM assets a
    LEFT JOIN intents i ON a.id = i.asset_id
    WHERE i.id IS NULL
  `;

  const params: SQLParams = [];

  // Apply filter type first
  if (filter === 'screenshots') {
    query += ' AND a.is_screenshot = 1';
  } else if (filter === 'recent') {
    const recentCutoff = Date.now() - RECENT_TIMESTAMP;
    query += ' AND a.created_at >= ?';
    params.push(recentCutoff);
  } else if (filter === 'videos') {
    query += ` AND (a.filename LIKE '%.mp4' OR a.filename LIKE '%.mov' OR a.filename LIKE '%.avi')`;
  } else if (filter === 'duplicates') {
    // Duplicate detection tolerant to NULL size_bytes
    query += ` AND EXISTS (
      SELECT 1 FROM assets a2
      LEFT JOIN intents i2 ON a2.id = i2.asset_id
      WHERE a2.id != a.id
      AND i2.id IS NULL
      AND a2.width = a.width
      AND a2.height = a.height
      AND (
        (a2.size_bytes IS NOT NULL AND a.size_bytes IS NOT NULL AND a2.size_bytes = a.size_bytes)
        OR (a2.size_bytes IS NULL AND a.size_bytes IS NULL)
      )
    )`;
  }

  // Apply month filter after filter type
  if (monthFilter) {
    query += ` AND strftime('%Y-%m', datetime(a.created_at / 1000, 'unixepoch')) = ?`;
    params.push(monthFilter);
  }

  const result = await db.getFirstAsync<{ count: number }>(query, params);
  return result?.count ?? 0;
}

export async function getTotalReviewedCount(): Promise<number> {
  const result = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM intents');
  return result?.count ?? 0;
}
