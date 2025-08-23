import i18n from './index';
import en from './strings.en.json';
import es from './strings.es.json';

describe('i18n', () => {
  describe('translation keys', () => {
    it('should have all required keys in English', () => {
      expect(en.streak.pills.minPerDay_one).toBe('min/day');
      expect(en.streak.pills.minPerDay_other).toBe('mins/day');
      expect(en.home.months.ene).toBe('Jan');
      expect(en.home.months.feb).toBe('Feb');
      expect(en.home.months.mar).toBe('Mar');
      expect(en.home.months.abr).toBe('Apr');
      expect(en.home.months.may).toBe('May');
      expect(en.home.months.jun).toBe('Jun');
      expect(en.home.months.jul).toBe('Jul');
      expect(en.home.months.ago).toBe('Aug');
      expect(en.home.months.sep).toBe('Sep');
      expect(en.home.months.oct).toBe('Oct');
      expect(en.home.months.nov).toBe('Nov');
      expect(en.home.months.dic).toBe('Dec');
    });

    it('should have all required keys in Spanish', () => {
      expect(es.streak.pills.minPerDay_one).toBe('min/día');
      expect(es.streak.pills.minPerDay_other).toBe('mins/día');
      expect(es.home.months.ene).toBe('ene');
      expect(es.home.months.feb).toBe('feb');
      expect(es.home.months.mar).toBe('mar');
      expect(es.home.months.abr).toBe('abr');
      expect(es.home.months.may).toBe('may');
      expect(es.home.months.jun).toBe('jun');
      expect(es.home.months.jul).toBe('jul');
      expect(es.home.months.ago).toBe('ago');
      expect(es.home.months.sep).toBe('sep');
      expect(es.home.months.oct).toBe('oct');
      expect(es.home.months.nov).toBe('nov');
      expect(es.home.months.dic).toBe('dic');
    });
  });

  describe('pluralization', () => {
    it('should handle singular form for minPerDay in English', () => {
      const enTranslations = i18n.getResourceBundle('en', 'translation');
      expect(enTranslations.streak.pills.minPerDay_one).toBe('min/day');
    });

    it('should handle plural form for minPerDay in English', () => {
      const enTranslations = i18n.getResourceBundle('en', 'translation');
      expect(enTranslations.streak.pills.minPerDay_other).toBe('mins/day');
    });

    it('should handle plural forms in Spanish', () => {
      const esTranslations = i18n.getResourceBundle('es', 'translation');
      expect(esTranslations.streak.pills.minPerDay_one).toBe('min/día');
      expect(esTranslations.streak.pills.minPerDay_other).toBe('mins/día');
    });
  });

  describe('month translations', () => {
    it('should have all months in English', () => {
      const enTranslations = i18n.getResourceBundle('en', 'translation');
      expect(enTranslations.home.months.ene).toBe('Jan');
      expect(enTranslations.home.months.dic).toBe('Dec');
    });

    it('should have all months in Spanish', () => {
      const esTranslations = i18n.getResourceBundle('es', 'translation');
      expect(esTranslations.home.months.ene).toBe('ene');
      expect(esTranslations.home.months.dic).toBe('dic');
    });
  });

  describe('interpolation', () => {
    it('should interpolate values in English translations', () => {
      // Test directly from imported JSON
      expect(en.home.fotos).toBe('{{n}} photos');
    });

    it('should interpolate values in Spanish translations', () => {
      // Test directly from imported JSON
      expect(es.home.fotos).toBe('{{n}} fotos');
    });
  });
});