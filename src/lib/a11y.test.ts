import {
  getContrastRatio,
  meetsContrastStandard,
  validateColorContrasts,
  testID,
  calculateHitSlop,
} from './a11y';
import { colors } from '../ui/tokens';

describe('Accessibility Utilities', () => {
  describe('getLuminance edge cases', () => {
    it('should handle invalid hex colors gracefully', () => {
      // Invalid formats should not throw
      expect(() => getContrastRatio('invalid', '#000000')).not.toThrow();
      expect(() => getContrastRatio('#GGG', '#000000')).not.toThrow();
      expect(() => getContrastRatio('', '#000000')).not.toThrow();
      expect(() => getContrastRatio('#12', '#000000')).not.toThrow();
      expect(() => getContrastRatio('#1234567', '#000000')).not.toThrow();
    });

    it('should return 1 for invalid color combinations', () => {
      const ratio = getContrastRatio('invalid', 'invalid');
      expect(ratio).toBe(1); // Both return 0 luminance, ratio becomes 1
    });

    it('should handle null/undefined inputs', () => {
      // Test with explicit null/undefined casting for edge case testing
      const nullInput = null as unknown as string;
      const undefinedInput = undefined as unknown as string;
      expect(() => getContrastRatio(nullInput, '#000000')).not.toThrow();
      expect(() => getContrastRatio(undefinedInput, '#000000')).not.toThrow();
    });
  });
  describe('calculateHitSlop', () => {
    it('should return undefined for elements meeting minimum size', () => {
      expect(calculateHitSlop(44, 44)).toBeUndefined();
      expect(calculateHitSlop(50, 50)).toBeUndefined();
    });

    it('should calculate hit slop for small elements', () => {
      const hitSlop = calculateHitSlop(30, 30);
      expect(hitSlop).toEqual({
        top: 7,
        bottom: 7,
        left: 7,
        right: 7,
      });
    });

    it('should handle asymmetric dimensions', () => {
      const hitSlop = calculateHitSlop(44, 20);
      expect(hitSlop).toEqual({
        top: 12,
        bottom: 12,
        left: 0,
        right: 0,
      });
    });
  });

  describe('getContrastRatio', () => {
    it('should calculate correct contrast ratio for white on black', () => {
      const ratio = getContrastRatio('#FFFFFF', '#000000');
      expect(ratio).toBeCloseTo(21, 1);
    });

    it('should calculate correct contrast ratio for black on white', () => {
      const ratio = getContrastRatio('#000000', '#FFFFFF');
      expect(ratio).toBeCloseTo(21, 1);
    });

    it('should calculate correct contrast ratio for primary on background', () => {
      const ratio = getContrastRatio(colors.primary, colors.bg);
      expect(ratio).toBeGreaterThan(3);
    });
  });

  describe('meetsContrastStandard', () => {
    it('should pass for white on black (normal text)', () => {
      expect(meetsContrastStandard('#FFFFFF', '#000000')).toBe(true);
    });

    it('should pass for white on black (large text)', () => {
      expect(meetsContrastStandard('#FFFFFF', '#000000', true)).toBe(true);
    });

    it('should fail for low contrast colors', () => {
      expect(meetsContrastStandard('#777777', '#888888')).toBe(false);
    });

    it('should have lower threshold for large text', () => {
      const fg = '#666666';
      const bg = '#CCCCCC';
      expect(meetsContrastStandard(fg, bg, false)).toBe(false);
      expect(meetsContrastStandard(fg, bg, true)).toBe(true);
    });
  });

  describe('validateColorContrasts', () => {
    it('should validate all color combinations', () => {
      const results = validateColorContrasts();

      expect(results).toBeInstanceOf(Array);
      expect(results.length).toBeGreaterThan(0);

      results.forEach((result) => {
        expect(result).toHaveProperty('name');
        expect(result).toHaveProperty('ratio');
        expect(result).toHaveProperty('passes');
        expect(result).toHaveProperty('required');
      });
    });

    it('should ensure critical text colors meet WCAG AA standards', () => {
      const results = validateColorContrasts();

      const criticalChecks = [
        'Primary text on background',
        'Secondary text on background',
        'Primary text on card',
      ];

      criticalChecks.forEach((checkName) => {
        const result = results.find((r) => r.name === checkName);
        expect(result).toBeDefined();
        expect(result?.passes).toBe(true);
        expect(parseFloat(result?.ratio || '0')).toBeGreaterThanOrEqual(4.5);
      });
    });
  });

  describe('testID', () => {
    it('should generate consistent testIDs', () => {
      expect(testID('home', 'button')).toBe('home.button');
      expect(testID('home', 'button', 'submit')).toBe('home.button.submit');
    });

    it('should handle empty key parameter', () => {
      expect(testID('screen', 'component')).toBe('screen.component');
      expect(testID('screen', 'component', undefined)).toBe('screen.component');
    });

    it('should generate proper testIDs for all required elements', () => {
      // Home screen elements
      expect(testID('home', 'topBar', 'logo')).toBe('home.topBar.logo');
      expect(testID('home', 'hero', 'cta')).toBe('home.hero.cta');
      expect(testID('home', 'chip', 'screenshots')).toBe('home.chip.screenshots');
      expect(testID('home', 'bundle', 'duplicates')).toBe('home.bundle.duplicates');
      expect(testID('home', 'month', '01')).toBe('home.month.01');
      expect(testID('home', 'month', '12')).toBe('home.month.12');
    });
  });
});
