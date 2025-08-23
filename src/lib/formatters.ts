export function formatBytes(bytes: number | null, locale?: string): string {
  if (!bytes) return '0 MB';
  if (bytes === 0) return '0 MB';

  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  // Clamp to MB minimum
  const index = Math.max(2, Math.min(i, sizes.length - 1));
  const value = bytes / Math.pow(1024, index);
  const formatted = new Intl.NumberFormat(locale || 'es-ES', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value);
  return `${formatted} ${sizes[index]}`;
}

export function formatDate(timestamp: number, locale?: string): string {
  const date = new Date(timestamp);
  const currentYear = new Date().getFullYear();
  return date.toLocaleDateString(locale || 'en', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== currentYear ? 'numeric' : undefined,
  });
}

/**
 * Get ISO date string in UTC
 */
export function getTodayUTC(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Get yesterday's ISO date string in UTC
 */
export function getYesterdayUTC(): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().split('T')[0];
}

/**
 * Get week number of the year (ISO 8601)
 */
export function getWeekNumber(date: Date = new Date()): number {
  const target = new Date(date.valueOf());
  const dayNumber = (date.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNumber + 3);
  const firstThursday = target.valueOf();
  target.setUTCMonth(0, 1);
  if (target.getUTCDay() !== 4) {
    target.setUTCMonth(0, 1 + ((4 - target.getUTCDay() + 7) % 7));
  }
  return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
}

/**
 * Format MB to human readable format (MB/GB) with Spanish locale
 */
export function formatSpace(mb: number): string {
  if (mb <= 0) return '0 MB';
  if (mb >= 1024) {
    const gb = mb / 1024;
    const formatted = new Intl.NumberFormat('es-ES', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    }).format(gb);
    return `${formatted} GB`;
  }
  return `${Math.round(mb)} MB`;
}

/**
 * Format count with Spanish thousands separator for display
 */
export function formatCount(count: number): string {
  if (count < 0) return '0';
  // Use Spanish locale for number formatting (dot as thousands separator)
  return new Intl.NumberFormat('es-ES').format(count);
}

/**
 * Format percentage with 0-1 bounds
 */
export function formatProgress(progress: number): number {
  return Math.min(Math.max(progress, 0), 1);
}
