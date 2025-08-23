import { getDatabase } from '../../db';
import type { Asset } from '../../db/schema';
import { logger } from '../../lib/logger';
import i18n from '../../i18n';

export interface MonthBucket {
  monthKey: string; // YYYY-MM format
  label: string; // Display label (e.g., "enero 2024")
  count: number;
  assets: Asset[]; // First 6 assets for preview
  year: number;
  month: number;
}

export type LibraryFilterType =
  | 'all'
  | 'photos'
  | 'videos'
  | 'duplicates'
  | 'screenshots'
  | 'large';
export type LibrarySortOrder = 'newest' | 'oldest';

interface GetMonthBucketsOptions {
  filter?: LibraryFilterType;
  sortOrder?: LibrarySortOrder;
  limit?: number;
  offset?: number;
}

function formatMonthLabel(year: number, month: number, useShort = true): string {
  const currentYear = new Date().getFullYear();
  try {
    const locale = i18n.language || 'en';
    const dtf = new Intl.DateTimeFormat(locale, {
      month: useShort ? 'short' : 'long',
    });
    // Create a date with provided year and month (1-based month)
    const date = new Date(year, month - 1, 1);
    const monthName = dtf.format(date);
    if (year === currentYear) {
      return monthName;
    }
    return `${monthName} ${year}`;
  } catch (e) {
    // Fallback: numeric month/year
    if (year === currentYear) {
      return String(month).padStart(2, '0');
    }
    return `${String(month).padStart(2, '0')} ${year}`;
  }
}

// Common video extensions (matching deck/selectors.ts pattern for consistency)
const VIDEO_EXTENSIONS = ['mp4', 'mov', 'avi', 'mkv', 'webm', 'm4v'];

function getFilterSQL(filter: LibraryFilterType): string {
  switch (filter) {
    case 'photos': {
      // Exclude video files - using same pattern as deck selectors
      const videoConditions = VIDEO_EXTENSIONS.map((ext) => `a.filename NOT LIKE '%.${ext}'`).join(
        ' AND '
      );
      return `AND (${videoConditions})`;
    }
    case 'screenshots':
      return 'AND a.is_screenshot = 1';
    case 'videos': {
      // Include video files - using same pattern as deck selectors
      const videoConditions = VIDEO_EXTENSIONS.map((ext) => `a.filename LIKE '%.${ext}'`).join(
        ' OR '
      );
      return `AND (${videoConditions})`;
    }
    case 'large':
      return 'AND a.size_bytes > 10485760'; // > 10MB
    case 'duplicates':
      // This would need a more complex query with GROUP BY
      return '';
    default:
      return '';
  }
}

export async function getMonthBuckets({
  filter = 'all',
  sortOrder = 'newest',
  limit = 12,
  offset = 0,
}: GetMonthBucketsOptions = {}): Promise<MonthBucket[]> {
  try {
    const db = await getDatabase();
    const filterSQL = getFilterSQL(filter);
    const orderDirection = sortOrder === 'newest' ? 'DESC' : 'ASC';

    // First, get the month groups with counts
    const monthsQuery = `
      SELECT 
        strftime('%Y-%m', datetime(created_at / 1000, 'unixepoch')) as month_key,
        CAST(strftime('%Y', datetime(created_at / 1000, 'unixepoch')) AS INTEGER) as year,
        CAST(strftime('%m', datetime(created_at / 1000, 'unixepoch')) AS INTEGER) as month,
        COUNT(*) as count
      FROM assets a
      LEFT JOIN intents i ON a.id = i.asset_id
      WHERE i.id IS NULL ${filterSQL}
      GROUP BY month_key
      ORDER BY month_key ${orderDirection}
      LIMIT ? OFFSET ?
    `;

    const monthGroups = await db.getAllAsync<{
      month_key: string;
      year: number;
      month: number;
      count: number;
    }>(monthsQuery, [limit, offset]);

    if (!monthGroups || monthGroups.length === 0) {
      return [];
    }

    // Get all preview assets in a single query
    const monthKeys = monthGroups.map((g) => g.month_key);
    const placeholders = monthKeys.map(() => '?').join(',');

    const allAssetsQuery = `
      SELECT 
        a.id, a.uri, a.filename, a.size_bytes, 
        a.width, a.height, a.created_at, a.is_screenshot,
        strftime('%Y-%m', datetime(a.created_at / 1000, 'unixepoch')) as month_key
      FROM (
        SELECT a.*, 
          ROW_NUMBER() OVER (
            PARTITION BY strftime('%Y-%m', datetime(a.created_at / 1000, 'unixepoch'))
            ORDER BY a.created_at DESC
          ) as rn
        FROM assets a
        LEFT JOIN intents i ON a.id = i.asset_id
        WHERE i.id IS NULL 
          AND strftime('%Y-%m', datetime(a.created_at / 1000, 'unixepoch')) IN (${placeholders})
          ${filterSQL}
      ) ranked
      WHERE rn <= 6
      ORDER BY month_key, ranked.created_at DESC
    `;

    // Fallback for SQLite without window functions
    let allAssets: (Asset & { month_key: string })[] = [];
    try {
      allAssets = await db.getAllAsync(allAssetsQuery, monthKeys);
    } catch (windowFuncError) {
      // If window functions aren't supported, use simpler approach
      logger.warn('Window functions not supported, using fallback query');

      const fallbackQuery = `
        SELECT 
          a.id, a.uri, a.filename, a.size_bytes, 
          a.width, a.height, a.created_at, a.is_screenshot,
          strftime('%Y-%m', datetime(a.created_at / 1000, 'unixepoch')) as month_key
        FROM assets a
        LEFT JOIN intents i ON a.id = i.asset_id
        WHERE i.id IS NULL 
          AND strftime('%Y-%m', datetime(a.created_at / 1000, 'unixepoch')) IN (${placeholders})
          ${filterSQL}
        ORDER BY a.created_at DESC
        LIMIT 1000
      `;

      const allAssetsUnfiltered = await db.getAllAsync<Asset & { month_key: string }>(
        fallbackQuery,
        monthKeys
      );

      // Log warning if we hit the limit
      if (allAssetsUnfiltered.length === 1000) {
        logger.warn(
          'Fallback query hit safety limit of 1000 assets. Some preview images may be missing.'
        );
      }

      // Group and limit in memory
      const assetsByMonth = new Map<string, (Asset & { month_key: string })[]>();
      for (const asset of allAssetsUnfiltered) {
        const monthAssets = assetsByMonth.get(asset.month_key) || [];
        if (monthAssets.length < 6) {
          monthAssets.push(asset);
          assetsByMonth.set(asset.month_key, monthAssets);
        }
      }

      allAssets = Array.from(assetsByMonth.values()).flat();
    }

    // Group assets by month
    const assetsByMonth = new Map<string, Asset[]>();
    for (const asset of allAssets) {
      const { month_key, ...assetWithoutMonth } = asset;
      const monthAssets = assetsByMonth.get(month_key) || [];
      monthAssets.push(assetWithoutMonth as Asset);
      assetsByMonth.set(month_key, monthAssets);
    }

    // Build final buckets
    const buckets: MonthBucket[] = monthGroups.map((group) => ({
      monthKey: group.month_key,
      label: formatMonthLabel(group.year, group.month, true),
      count: group.count,
      assets: assetsByMonth.get(group.month_key) || [],
      year: group.year,
      month: group.month,
    }));

    return buckets;
  } catch (error) {
    logger.error('Failed to get month buckets', error);
    throw error;
  }
}

export async function getMonthBucketCount(filter: LibraryFilterType = 'all'): Promise<number> {
  try {
    const db = await getDatabase();
    const filterSQL = getFilterSQL(filter);

    const query = `
      SELECT COUNT(DISTINCT strftime('%Y-%m', datetime(created_at / 1000, 'unixepoch'))) as count
      FROM assets a
      LEFT JOIN intents i ON a.id = i.asset_id
      WHERE i.id IS NULL ${filterSQL}
    `;

    const result = await db.getFirstAsync<{ count: number }>(query);
    return result?.count || 0;
  } catch (error) {
    logger.error('Failed to get month bucket count', error);
    throw error;
  }
}

export async function getAssetsForMonth(
  monthKey: string,
  filter: LibraryFilterType = 'all',
  limit = 50,
  offset = 0
): Promise<Asset[]> {
  try {
    const db = await getDatabase();
    const filterSQL = getFilterSQL(filter);

    const query = `
      SELECT 
        a.id, a.uri, a.filename, a.size_bytes, 
        a.width, a.height, a.created_at, a.is_screenshot
      FROM assets a
      LEFT JOIN intents i ON a.id = i.asset_id
      WHERE i.id IS NULL 
        AND strftime('%Y-%m', datetime(a.created_at / 1000, 'unixepoch')) = ?
        ${filterSQL}
      ORDER BY a.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const assets = await db.getAllAsync<Asset>(query, [monthKey, limit, offset]);
    return assets || [];
  } catch (error) {
    logger.error('Failed to get assets for month', error);
    throw error;
  }
}
