import * as SQLite from 'expo-sqlite';
import { SCHEMA } from './schema';
import { initCommitLog } from './commitLog';
import { logger } from '../lib/logger';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync('swipeclean.db');
  }
  return db;
}

export async function migrate(): Promise<void> {
  const database = await getDatabase();

  try {
    await database.execAsync('PRAGMA foreign_keys = ON');

    // Check if assets table exists
    const tables = await database.getAllAsync(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='assets'"
    );
    
    if (tables.length > 0) {
      // Table exists - check for missing columns and add them
      const columns = await database.getAllAsync(
        "PRAGMA table_info('assets')"
      );
      const columnNames = columns.map((col: any) => col.name);

      // Add missing columns if they don't exist
      const newColumns = [
        { name: 'is_blurry', sql: 'ALTER TABLE assets ADD COLUMN is_blurry INTEGER DEFAULT 0' },
        { name: 'is_burst', sql: 'ALTER TABLE assets ADD COLUMN is_burst INTEGER DEFAULT 0' },
        { name: 'is_whatsapp', sql: 'ALTER TABLE assets ADD COLUMN is_whatsapp INTEGER DEFAULT 0' },
        { name: 'is_video', sql: 'ALTER TABLE assets ADD COLUMN is_video INTEGER DEFAULT 0' },
        { name: 'duration_ms', sql: 'ALTER TABLE assets ADD COLUMN duration_ms INTEGER' },
        { name: 'mime_type', sql: 'ALTER TABLE assets ADD COLUMN mime_type TEXT' },
        { name: 'content_hash', sql: 'ALTER TABLE assets ADD COLUMN content_hash TEXT' },
      ];

      for (const column of newColumns) {
        if (!columnNames.includes(column.name)) {
          try {
            await database.execAsync(column.sql);
            logger.info(`Added column ${column.name} to assets table`);
          } catch (colError) {
            logger.warn(`Could not add column ${column.name}:`, colError);
          }
        }
      }
    } else {
      // Table doesn't exist - create it with full schema
      await database.execAsync(SCHEMA.assets);
    }

    // Create or update intents table
    await database.execAsync(SCHEMA.intents);

    // Create indexes (now safe since all columns exist)
    for (const indexSql of SCHEMA.indexes) {
      try {
        await database.execAsync(indexSql);
      } catch (indexError) {
        // Index might already exist, continue
        logger.warn('Index creation warning:', indexError);
      }
    }

    await initCommitLog(database);

    logger.info('Database migration completed successfully');
  } catch (error) {
    logger.error('Database migration failed:', error as Error);
    throw error;
  }
}

export async function resetDatabase(): Promise<void> {
  const database = await getDatabase();

  try {
    await database.execAsync('DROP TABLE IF EXISTS intents');
    await database.execAsync('DROP TABLE IF EXISTS assets');
    await migrate();
    logger.info('Database reset completed');
  } catch (error) {
    logger.error('Database reset failed:', error as Error);
    throw error;
  }
}
