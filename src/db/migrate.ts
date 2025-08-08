import * as SQLite from 'expo-sqlite';
import { SCHEMA } from './schema';

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

    await database.execAsync(SCHEMA.assets);
    await database.execAsync(SCHEMA.intents);

    for (const indexSql of SCHEMA.indexes) {
      await database.execAsync(indexSql);
    }

    console.log('Database migration completed successfully');
  } catch (error) {
    console.error('Database migration failed:', error);
    throw error;
  }
}

export async function resetDatabase(): Promise<void> {
  const database = await getDatabase();

  try {
    await database.execAsync('DROP TABLE IF EXISTS intents');
    await database.execAsync('DROP TABLE IF EXISTS assets');
    await migrate();
    console.log('Database reset completed');
  } catch (error) {
    console.error('Database reset failed:', error);
    throw error;
  }
}
