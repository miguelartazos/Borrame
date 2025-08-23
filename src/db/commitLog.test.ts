import {
  markAssetsCommitting,
  clearCommittedAssets,
  markAssetsFailed,
  getStuckCommits,
  recoverStuckCommits,
  initCommitLog,
} from './commitLog';
import { resetDatabase } from './migrate';
import { db } from './index';

jest.mock('../lib/logger');

describe('commitLog', () => {
  beforeEach(async () => {
    await resetDatabase();
    await initCommitLog();
  });

  describe('SQL Injection Prevention', () => {
    it('should safely handle SQL injection attempts in markAssetsCommitting', async () => {
      const maliciousIds = [
        "'; DROP TABLE assets; --",
        "1' OR '1'='1",
        '"; DELETE FROM intents WHERE "1"="1',
        "asset'); INSERT INTO assets VALUES ('hack",
        "'); DROP TABLE commit_log; --",
      ];

      // Should not throw and should parameterize safely
      await markAssetsCommitting(maliciousIds);

      // Verify tables still exist
      const tables = await db.getAllAsync<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type='table'"
      );
      const tableNames = tables.map((t) => t.name);
      expect(tableNames).toContain('assets');
      expect(tableNames).toContain('intents');
      expect(tableNames).toContain('commit_log');

      // Verify exact malicious strings were stored as data, not executed
      const result = await db.getAllAsync<{ asset_id: string }>(
        'SELECT asset_id FROM commit_log ORDER BY asset_id'
      );
      expect(result).toHaveLength(5);
      expect(result[0].asset_id).toBe('"; DELETE FROM intents WHERE "1"="1');
      expect(result[1].asset_id).toBe("'; DROP TABLE assets; --");
    });

    it('should safely handle SQL injection in clearCommittedAssets', async () => {
      const maliciousId = "' OR '1'='1";
      await db.runAsync('INSERT INTO commit_log (asset_id, status, created_at) VALUES (?, ?, ?)', [
        'safe-id',
        'committing',
        Date.now(),
      ]);
      await db.runAsync('INSERT INTO commit_log (asset_id, status, created_at) VALUES (?, ?, ?)', [
        maliciousId,
        'committing',
        Date.now(),
      ]);

      // Should only delete the malicious ID, not all records
      await clearCommittedAssets([maliciousId]);

      const remaining = await db.getAllAsync<{ asset_id: string }>(
        'SELECT asset_id FROM commit_log'
      );
      expect(remaining).toHaveLength(1);
      expect(remaining[0].asset_id).toBe('safe-id');
    });

    it('should handle special characters safely', async () => {
      const specialIds = [
        "asset-with-'quote",
        'asset-with-"double-quote',
        'asset-with-`backtick',
        'asset-with-\\backslash',
        'asset-with-;semicolon',
        'asset-with--comment',
      ];

      await markAssetsCommitting(specialIds);

      const result = await db.getAllAsync<{ asset_id: string }>('SELECT asset_id FROM commit_log');
      expect(result).toHaveLength(6);
      expect(result.map((r) => r.asset_id)).toEqual(expect.arrayContaining(specialIds));
    });
  });

  describe('Batch Operations', () => {
    it('should handle large batches efficiently', async () => {
      const largeArray = Array.from({ length: 1000 }, (_, i) => `asset-${i}`);

      const start = Date.now();
      await markAssetsCommitting(largeArray);
      const duration = Date.now() - start;

      // Should complete reasonably quickly
      expect(duration).toBeLessThan(2000);

      const count = await db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM commit_log'
      );
      expect(count?.count).toBe(1000);
    });

    it('should handle empty arrays gracefully', async () => {
      await markAssetsCommitting([]);
      await clearCommittedAssets([]);
      await markAssetsFailed([]);

      const count = await db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM commit_log'
      );
      expect(count?.count).toBe(0);
    });

    it('should handle duplicate IDs with INSERT OR REPLACE', async () => {
      const ids = ['asset-1', 'asset-2'];

      // First insert
      await markAssetsCommitting(ids);

      // Second insert with same IDs should replace
      await markAssetsCommitting(ids);

      const count = await db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM commit_log'
      );
      expect(count?.count).toBe(2); // Not 4
    });
  });

  describe('Recovery Mechanism', () => {
    it('should identify stuck commits older than 1 hour', async () => {
      const now = Date.now();
      const twoHoursAgo = now - 2 * 60 * 60 * 1000;
      const thirtyMinsAgo = now - 30 * 60 * 1000;

      await db.runAsync('INSERT INTO commit_log (asset_id, status, created_at) VALUES (?, ?, ?)', [
        'old-stuck',
        'committing',
        twoHoursAgo,
      ]);
      await db.runAsync('INSERT INTO commit_log (asset_id, status, created_at) VALUES (?, ?, ?)', [
        'recent',
        'committing',
        thirtyMinsAgo,
      ]);
      await db.runAsync('INSERT INTO commit_log (asset_id, status, created_at) VALUES (?, ?, ?)', [
        'failed',
        'failed',
        twoHoursAgo,
      ]);

      const stuck = await getStuckCommits();

      expect(stuck).toHaveLength(1);
      expect(stuck[0]).toBe('old-stuck');
    });

    it('should clean up stuck commits during recovery', async () => {
      const oldTime = Date.now() - 2 * 60 * 60 * 1000;

      await db.runAsync('INSERT INTO commit_log (asset_id, status, created_at) VALUES (?, ?, ?)', [
        'stuck-1',
        'committing',
        oldTime,
      ]);
      await db.runAsync('INSERT INTO commit_log (asset_id, status, created_at) VALUES (?, ?, ?)', [
        'stuck-2',
        'committing',
        oldTime,
      ]);

      await recoverStuckCommits();

      const remaining = await db.getAllAsync<{ asset_id: string }>(
        'SELECT asset_id FROM commit_log'
      );
      expect(remaining).toHaveLength(0);
    });

    it('should not affect recent or failed commits during recovery', async () => {
      const recentTime = Date.now() - 30 * 60 * 1000;
      const oldTime = Date.now() - 2 * 60 * 60 * 1000;

      await db.runAsync('INSERT INTO commit_log (asset_id, status, created_at) VALUES (?, ?, ?)', [
        'recent',
        'committing',
        recentTime,
      ]);
      await db.runAsync('INSERT INTO commit_log (asset_id, status, created_at) VALUES (?, ?, ?)', [
        'failed',
        'failed',
        oldTime,
      ]);
      await db.runAsync('INSERT INTO commit_log (asset_id, status, created_at) VALUES (?, ?, ?)', [
        'old-stuck',
        'committing',
        oldTime,
      ]);

      await recoverStuckCommits();

      const remaining = await db.getAllAsync<{ asset_id: string; status: string }>(
        'SELECT asset_id, status FROM commit_log ORDER BY asset_id'
      );

      expect(remaining).toHaveLength(2);
      expect(remaining[0].asset_id).toBe('failed');
      expect(remaining[1].asset_id).toBe('recent');
    });
  });

  describe('State Transitions', () => {
    it('should transition from committing to failed', async () => {
      const ids = ['asset-1', 'asset-2'];

      await markAssetsCommitting(ids);

      let result = await db.getAllAsync<{ asset_id: string; status: string }>(
        'SELECT asset_id, status FROM commit_log'
      );
      expect(result.every((r) => r.status === 'committing')).toBe(true);

      await markAssetsFailed(['asset-1']);

      result = await db.getAllAsync<{ asset_id: string; status: string }>(
        'SELECT asset_id, status FROM commit_log ORDER BY asset_id'
      );

      expect(result[0].status).toBe('failed');
      expect(result[1].status).toBe('committing');
    });

    it('should clear committed assets completely', async () => {
      const ids = ['asset-1', 'asset-2', 'asset-3'];

      await markAssetsCommitting(ids);
      await clearCommittedAssets(['asset-1', 'asset-3']);

      const remaining = await db.getAllAsync<{ asset_id: string }>(
        'SELECT asset_id FROM commit_log'
      );

      expect(remaining).toHaveLength(1);
      expect(remaining[0].asset_id).toBe('asset-2');
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent marking operations', async () => {
      const batch1 = Array.from({ length: 100 }, (_, i) => `batch1-${i}`);
      const batch2 = Array.from({ length: 100 }, (_, i) => `batch2-${i}`);

      // Run concurrently
      await Promise.all([markAssetsCommitting(batch1), markAssetsCommitting(batch2)]);

      const count = await db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM commit_log'
      );
      expect(count?.count).toBe(200);
    });
  });
});
