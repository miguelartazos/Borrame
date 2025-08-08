import { db } from '../../db';
import type { Asset } from '../../db/schema';
import type { SQLParams } from '../../db/types';

export type FilterType = 'all' | 'screenshots' | 'recent';

interface DeckQueryOptions {
  filter: FilterType;
  limit: number;
  offset: number;
}

const RECENT_DAYS = 30;
const RECENT_TIMESTAMP = RECENT_DAYS * 24 * 60 * 60 * 1000;

export async function getUndecidedAssets({
  filter = 'all',
  limit = 60,
  offset = 0,
}: DeckQueryOptions): Promise<Asset[]> {
  let query = `
    SELECT a.* 
    FROM assets a
    LEFT JOIN intents i ON a.id = i.asset_id
    WHERE i.id IS NULL
  `;

  const params: SQLParams = [];

  if (filter === 'screenshots') {
    query += ' AND a.is_screenshot = 1';
  } else if (filter === 'recent') {
    const recentCutoff = Date.now() - RECENT_TIMESTAMP;
    query += ' AND a.created_at >= ?';
    params.push(recentCutoff);
  }

  query += ' ORDER BY a.created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const result = await db.getAllAsync<Asset>(query, params);
  return result;
}

export async function getUndecidedCount(filter: FilterType = 'all'): Promise<number> {
  let query = `
    SELECT COUNT(*) as count
    FROM assets a
    LEFT JOIN intents i ON a.id = i.asset_id
    WHERE i.id IS NULL
  `;

  const params: SQLParams = [];

  if (filter === 'screenshots') {
    query += ' AND a.is_screenshot = 1';
  } else if (filter === 'recent') {
    const recentCutoff = Date.now() - RECENT_TIMESTAMP;
    query += ' AND a.created_at >= ?';
    params.push(recentCutoff);
  }

  const result = await db.getFirstAsync<{ count: number }>(query, params);
  return result?.count ?? 0;
}

export async function getTotalReviewedCount(): Promise<number> {
  const result = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM intents');
  return result?.count ?? 0;
}
