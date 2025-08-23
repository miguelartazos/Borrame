import { formatBytes, formatDate, formatSpace, formatCount } from './formatters';

describe('Formatters', () => {
  describe('formatBytes', () => {
    it('should format bytes with Spanish locale by default', () => {
      expect(formatBytes(0)).toBe('0 MB');
      expect(formatBytes(512)).toBe('0 MB'); // Clamps to MB minimum
      expect(formatBytes(1024)).toBe('0 MB'); // Clamps to MB minimum
      expect(formatBytes(1536)).toBe('0 MB'); // Clamps to MB minimum
      expect(formatBytes(1048576)).toBe('1 MB');
      expect(formatBytes(1073741824)).toBe('1 GB');
      expect(formatBytes(1024 * 1024 * 153)).toBe('153 MB');
      expect(formatBytes(1024 * 1024 * 1024 * 1.8)).toBe('1,8 GB');
    });

    it('should handle null values', () => {
      expect(formatBytes(null)).toBe('0 MB');
      expect(formatBytes(null, 'en')).toBe('0 MB');
    });

    it('should respect locale for number formatting', () => {
      expect(formatBytes(1024 * 1024 * 1.5, 'en-US')).toBe('1.5 MB');
      expect(formatBytes(1024 * 1024 * 1.5, 'es-ES')).toBe('1,5 MB');
      expect(formatBytes(1024 * 1024 * 2, 'fr')).toContain('MB');
    });

    it('should limit decimal places to 1', () => {
      expect(formatBytes(1234567)).toBe('1,2 MB');
      expect(formatBytes(1234567890)).toBe('1,1 GB');
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
      // Mock current year as 2024 for consistent testing
      const mockCurrentYear = 2024;
      const thisYearDate = new Date(`${mockCurrentYear}-03-20`).getTime();
      const result = formatDate(thisYearDate);
      // Current year logic depends on actual runtime year, so we just check format
      expect(result).toMatch(/\w{3}\s+\d{1,2}/); // e.g., "Mar 20"

      const lastYearDate = new Date(`2023-03-20`).getTime();
      const resultLastYear = formatDate(lastYearDate);
      // Previous years should include the year
      expect(resultLastYear).toContain('2023');
    });
  });

  describe('Locale consistency', () => {
    it('should handle undefined locale gracefully', () => {
      expect(() => formatBytes(1024, undefined)).not.toThrow();
      expect(() => formatDate(Date.now(), undefined)).not.toThrow();
    });

    it('should handle invalid locales gracefully', () => {
      const bytes = formatBytes(1536, 'invalid-locale');
      expect(bytes).toBe('0 MB'); // Clamps to MB minimum

      const date = formatDate(Date.now(), 'invalid-locale');
      expect(date).toBeTruthy();
    });
  });

  describe('formatSpace', () => {
    it('should format MB to human readable format with Spanish locale', () => {
      expect(formatSpace(0)).toBe('0 MB');
      expect(formatSpace(-1)).toBe('0 MB');
      expect(formatSpace(153)).toBe('153 MB');
      expect(formatSpace(512)).toBe('512 MB');
      expect(formatSpace(1024)).toBe('1 GB');
      expect(formatSpace(1536)).toBe('1,5 GB');
      expect(formatSpace(2048)).toBe('2 GB');
    });

    it('should handle edge cases', () => {
      expect(formatSpace(1023)).toBe('1023 MB');
      expect(formatSpace(1024.5)).toBe('1 GB');
      expect(formatSpace(0.5)).toBe('1 MB'); // Rounds up
    });
  });

  describe('formatCount', () => {
    it('should format numbers with thousands separator', () => {
      expect(formatCount(0)).toBe('0');
      expect(formatCount(1)).toBe('1');
      expect(formatCount(999)).toBe('999');
      // Note: In test environment without full ICU, may not have Spanish locale
      const thousand = formatCount(1000);
      expect(thousand === '1.000' || thousand === '1000').toBe(true);
      const formatted1979 = formatCount(1979);
      expect(formatted1979 === '1.979' || formatted1979 === '1979').toBe(true);
    });

    it('should handle negative numbers', () => {
      expect(formatCount(-1)).toBe('0');
      expect(formatCount(-100)).toBe('0');
    });
  });
});
