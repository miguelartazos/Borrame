export { migrate, resetDatabase, getDatabase } from './migrate';
export type { Asset, Intent } from './schema';
export {
  insertAssets,
  upsertAsset,
  addIntent,
  removeIntent,
  listIntents,
  listPendingDelete,
  getSpaceEstimateForPending,
  getAssetsByIds,
  getUnprocessedAssets,
  getAssetCount,
  getProcessedCount,
} from './helpers';

let dbInstance: any = null;

export const db = {
  async runAsync(sql: string, params?: any[]): Promise<any> {
    if (!dbInstance) {
      const { getDatabase } = await import('./migrate');
      dbInstance = await getDatabase();
    }
    return dbInstance.runAsync(sql, params);
  },

  async getAllAsync<T>(sql: string, params?: any[]): Promise<T[]> {
    if (!dbInstance) {
      const { getDatabase } = await import('./migrate');
      dbInstance = await getDatabase();
    }
    return dbInstance.getAllAsync(sql, params);
  },

  async getFirstAsync<T>(sql: string, params?: any[]): Promise<T | null> {
    if (!dbInstance) {
      const { getDatabase } = await import('./migrate');
      dbInstance = await getDatabase();
    }
    return dbInstance.getFirstAsync(sql, params);
  },
};
