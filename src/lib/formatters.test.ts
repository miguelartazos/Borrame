import { formatBytes, formatDate } from './formatters';

describe('Formatters', () => {
  describe('formatBytes', () => {
    it('should format bytes with default locale', () => {
      expect(formatBytes(0)).toBe('0 B');
      expect(formatBytes(512)).toBe('512 B');
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(1536)).toBe('1.5 KB');
      expect(formatBytes(1048576)).toBe('1 MB');
      expect(formatBytes(1073741824)).toBe('1 GB');
    });

    it('should handle null values', () => {
      expect(formatBytes(null)).toBe('');
      expect(formatBytes(null, 'en')).toBe('');
    });

    it('should respect locale for number formatting', () => {
      expect(formatBytes(1536, 'en')).toBe('1.5 KB');
      expect(formatBytes(1536, 'de')).toBe('1,5 KB');
      expect(formatBytes(1536, 'fr')).toContain('KB');
    });

    it('should limit decimal places to 2', () => {
      expect(formatBytes(1234567)).toBe('1.18 MB');
      expect(formatBytes(1234567890)).toBe('1.15 GB');
    });
  });

  describe('formatDate', () => {
    const mockDate = new Date('2024-01-15T10:30:00Z').getTime();
    const currentYear = new Date().getFullYear();

    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-06-01'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should format date with default locale', () => {
      const result = formatDate(mockDate);
      expect(result).toContain('Jan');
      expect(result).toContain('15');
      expect(result).not.toContain('2024');
    });

    it('should include year for dates from different years', () => {
      const oldDate = new Date('2023-01-15T10:30:00Z').getTime();
      const result = formatDate(oldDate);
      expect(result).toContain('2023');
    });

    it('should respect locale for date formatting', () => {
      const resultEn = formatDate(mockDate, 'en');
      expect(resultEn).toContain('Jan');

      const resultDe = formatDate(mockDate, 'de');
      expect(resultDe).toMatch(/Jan|15/);
    });

    it('should handle current year correctly', () => {
      const thisYearDate = new Date(`${currentYear}-03-20`).getTime();
      const result = formatDate(thisYearDate);
      expect(result).not.toContain(currentYear.toString());

      const lastYearDate = new Date(`${currentYear - 1}-03-20`).getTime();
      const resultLastYear = formatDate(lastYearDate);
      expect(resultLastYear).toContain((currentYear - 1).toString());
    });
  });

  describe('Locale consistency', () => {
    it('should handle undefined locale gracefully', () => {
      expect(() => formatBytes(1024, undefined)).not.toThrow();
      expect(() => formatDate(Date.now(), undefined)).not.toThrow();
    });

    it('should fallback to en for invalid locales', () => {
      const bytes = formatBytes(1536, 'invalid-locale');
      expect(bytes).toBe('1.5 KB');

      const date = formatDate(Date.now(), 'invalid-locale');
      expect(date).toBeTruthy();
    });
  });
});
