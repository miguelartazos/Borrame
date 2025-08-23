/**
 * Bundle Query Functions
 * Pure functions for querying bundle counts from database
 * Separated from React hooks for better testability
 */

import { db } from '../../db';

// Size thresholds
const LARGE_FILE_BYTES = 100 * 1024 * 1024; // 100MB
const LONG_VIDEO_MS = 5 * 60 * 1000; // 5 minutes

// Bundle keys matching i18n
export type BundleKey =
  | 'duplicados'
  | 'borrosas'
  | 'pantallazos'
  | 'rafaga'
  | 'whatsapp'
  | 'videos_largos'
  | 'archivos_grandes'
  | 'recibos';

// Type guard for runtime validation
export function isBundleKey(key: string): key is BundleKey {
  const validKeys: BundleKey[] = [
    'duplicados',
    'borrosas',
    'pantallazos',
    'rafaga',
    'whatsapp',
    'videos_largos',
    'archivos_grandes',
    'recibos',
  ];
  return validKeys.includes(key as BundleKey);
}

export interface BundleCount {
  key: BundleKey;
  count: number;
  locked: boolean;
}

// Safe query functions that handle missing columns in older schemas
async function countDuplicates(): Promise<number> {
  try {
    const result = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM (
        SELECT content_hash, COUNT(*) as dupe_count 
        FROM assets 
        WHERE content_hash IS NOT NULL 
        GROUP BY content_hash 
        HAVING dupe_count > 1
      )`
    );
    return result?.count || 0;
  } catch (error) {
    // Column might not exist in older schemas
    return 0;
  }
}

async function countBlurry(): Promise<number> {
  try {
    const result = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM assets WHERE is_blurry = 1'
    );
    return result?.count || 0;
  } catch (error) {
    // Column might not exist in older schemas
    return 0;
  }
}

async function countScreenshots(): Promise<number> {
  try {
    const result = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM assets WHERE is_screenshot = 1'
    );
    return result?.count || 0;
  } catch (error) {
    // Column exists in all schemas
    return 0;
  }
}

async function countBurst(): Promise<number> {
  try {
    const result = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM assets WHERE is_burst = 1'
    );
    return result?.count || 0;
  } catch (error) {
    // Column might not exist in older schemas
    return 0;
  }
}

async function countWhatsApp(): Promise<number> {
  try {
    const result = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM assets WHERE is_whatsapp = 1'
    );
    return result?.count || 0;
  } catch (error) {
    // Column might not exist in older schemas
    return 0;
  }
}

async function countLongVideos(): Promise<number> {
  try {
    const result = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM assets WHERE is_video = 1 AND duration_ms > ${LONG_VIDEO_MS}`
    );
    return result?.count || 0;
  } catch (error) {
    // Columns might not exist in older schemas
    return 0;
  }
}

async function countLargeFiles(): Promise<number> {
  try {
    const result = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM assets WHERE size_bytes > ${LARGE_FILE_BYTES}`
    );
    return result?.count || 0;
  } catch (error) {
    // Column might not exist or be NULL in older schemas
    return 0;
  }
}

async function countDocuments(): Promise<number> {
  try {
    const result = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM assets WHERE mime_type LIKE '%document%' OR mime_type LIKE '%pdf%'`
    );
    return result?.count || 0;
  } catch (error) {
    // Column might not exist in older schemas
    return 0;
  }
}

// Fetch all bundle counts
export async function fetchBundleCounts(): Promise<BundleCount[]> {
  const [
    duplicados,
    borrosas,
    pantallazos,
    rafaga,
    whatsapp,
    videos_largos,
    archivos_grandes,
    recibos,
  ] = await Promise.all([
    countDuplicates(),
    countBlurry(),
    countScreenshots(),
    countBurst(),
    countWhatsApp(),
    countLongVideos(),
    countLargeFiles(),
    countDocuments(),
  ]);

  return [
    { key: 'duplicados', count: duplicados, locked: true },
    { key: 'borrosas', count: borrosas, locked: false },
    { key: 'pantallazos', count: pantallazos, locked: false },
    { key: 'rafaga', count: rafaga, locked: false },
    { key: 'whatsapp', count: whatsapp, locked: false },
    { key: 'videos_largos', count: videos_largos, locked: false },
    { key: 'archivos_grandes', count: archivos_grandes, locked: false },
    { key: 'recibos', count: recibos, locked: false },
  ];
}

// Default counts when no data available
export function getDefaultCounts(): BundleCount[] {
  return [
    { key: 'duplicados', count: 0, locked: true },
    { key: 'borrosas', count: 0, locked: false },
    { key: 'pantallazos', count: 0, locked: false },
    { key: 'rafaga', count: 0, locked: false },
    { key: 'whatsapp', count: 0, locked: false },
    { key: 'videos_largos', count: 0, locked: false },
    { key: 'archivos_grandes', count: 0, locked: false },
    { key: 'recibos', count: 0, locked: false },
  ];
}
