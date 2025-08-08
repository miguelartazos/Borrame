export function formatBytes(bytes: number | null, locale?: string): string {
  if (!bytes) return '';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  const formatted = new Intl.NumberFormat(locale || 'en', {
    maximumFractionDigits: 2,
  }).format(value);
  return `${formatted} ${sizes[i]}`;
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
