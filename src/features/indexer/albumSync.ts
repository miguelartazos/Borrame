import * as MediaLibrary from 'expo-media-library';
import { getDatabase } from '../../db/migrate';
import { insertAssets } from '../../db/helpers';
import { mapAssetToDBSchema } from './indexer';
import { logger } from '../../lib/logger';

/**
 * Returns a Set of URIs that already exist in the local assets table.
 */
export async function getExistingUris(uris: string[]): Promise<Set<string>> {
  if (uris.length === 0) return new Set();
  const db = await getDatabase();
  // Chunk to avoid SQLite variable limits
  const chunkSize = 500;
  const found = new Set<string>();

  for (let i = 0; i < uris.length; i += chunkSize) {
    const chunk = uris.slice(i, i + chunkSize);
    const placeholders = chunk.map(() => '?').join(',');
    const rows = await db.getAllAsync<{ uri: string }>(
      `SELECT uri FROM assets WHERE uri IN (${placeholders})`,
      chunk
    );
    for (const row of rows) found.add(row.uri);
  }

  return found;
}

/**
 * Ensures the provided MediaLibrary assets exist in the local DB.
 * Inserts only those with URIs not present. Idempotent.
 */
export async function ensureAssetsExist(mediaAssets: MediaLibrary.Asset[]): Promise<void> {
  if (mediaAssets.length === 0) return;
  try {
    const uris = mediaAssets.map((a) => a.uri);
    const existing = await getExistingUris(uris);
    const timestamp = Date.now();
    const rows = mediaAssets
      .filter((a) => !existing.has(a.uri))
      .map((a) => mapAssetToDBSchema(a, timestamp));
    if (rows.length > 0) {
      await insertAssets(rows);
    }
  } catch (error) {
    logger.error('Failed to ensure album assets exist', error as Error);
    throw error;
  }
}


