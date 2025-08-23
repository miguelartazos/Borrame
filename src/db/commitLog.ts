import type * as SQLite from 'expo-sqlite';

export interface CommitLogEntry {
  asset_id: string;
  status: 'committing' | 'failed';
  created_at: number;
}

export const COMMIT_LOG_SCHEMA = `
  CREATE TABLE IF NOT EXISTS commit_log (
    asset_id TEXT PRIMARY KEY,
    status TEXT NOT NULL CHECK(status IN ('committing', 'failed')),
    created_at INTEGER NOT NULL
  )
`;

export async function initCommitLog(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(COMMIT_LOG_SCHEMA);
  await db.execAsync('CREATE INDEX IF NOT EXISTS idx_commit_log_status ON commit_log(status)');
}

export async function markAssetsCommitting(
  db: SQLite.SQLiteDatabase,
  assetIds: string[]
): Promise<void> {
  if (assetIds.length === 0) return;

  const now = Date.now();
  const placeholders = assetIds.map(() => '(?, ?, ?)').join(',');
  const values = assetIds.flatMap((id) => [id, 'committing', now]);

  await db.runAsync(
    `INSERT OR REPLACE INTO commit_log (asset_id, status, created_at) VALUES ${placeholders}`,
    values
  );
}

export async function clearCommittedAssets(
  db: SQLite.SQLiteDatabase,
  assetIds: string[]
): Promise<void> {
  if (assetIds.length === 0) return;

  const placeholders = assetIds.map(() => '?').join(',');
  await db.runAsync(`DELETE FROM commit_log WHERE asset_id IN (${placeholders})`, assetIds);
}

export async function markAssetsFailed(
  db: SQLite.SQLiteDatabase,
  assetIds: string[]
): Promise<void> {
  if (assetIds.length === 0) return;

  const placeholders = assetIds.map(() => '?').join(',');
  await db.runAsync(
    `UPDATE commit_log SET status = 'failed' WHERE asset_id IN (${placeholders})`,
    assetIds
  );
}

export async function getStuckCommits(db: SQLite.SQLiteDatabase): Promise<string[]> {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;

  const result = await db.getAllAsync<{ asset_id: string }>(
    `SELECT asset_id FROM commit_log WHERE status = 'committing' AND created_at < ?`,
    [oneHourAgo]
  );

  return result.map((row) => row.asset_id);
}

export async function recoverStuckCommits(db: SQLite.SQLiteDatabase): Promise<void> {
  const stuckAssets = await getStuckCommits(db);
  if (stuckAssets.length > 0) {
    await clearCommittedAssets(db, stuckAssets);
  }
}
