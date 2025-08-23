import i18n from './index';

describe('i18n Configuration', () => {
  it('should initialize with default language', () => {
    expect(i18n.language).toBeDefined();
    expect(['en', 'es']).toContain(i18n.language);
  });

  it('should have English translations loaded', () => {
    const enTranslations = i18n.getResourceBundle('en', 'translation');
    expect(enTranslations).toBeDefined();
    expect(enTranslations.landing).toBeDefined();
    expect(enTranslations.landing.continue).toBe('Continue');
  });

  it('should have Spanish translations loaded', () => {
    const esTranslations = i18n.getResourceBundle('es', 'translation');
    expect(esTranslations).toBeDefined();
    expect(esTranslations.landing).toBeDefined();
    expect(esTranslations.landing.continue).toBe('Continuar');
  });

  it('should translate keys correctly', () => {
    // Test English
    i18n.changeLanguage('en');
    expect(i18n.t('landing.continue')).toBe('Continue');
    expect(i18n.t('common.cancel')).toBe('Cancel');
    expect(i18n.t('deck.filters.all')).toBe('All');

    // Test Spanish
    i18n.changeLanguage('es');
    expect(i18n.t('landing.continue')).toBe('Continuar');
    expect(i18n.t('common.cancel')).toBe('Cancelar');
    expect(i18n.t('deck.filters.all')).toBe('Todas');
  });

  it('should handle interpolation correctly', () => {
    i18n.changeLanguage('en');
    expect(i18n.t('pending.selected', { count: 5 })).toBe('5 selected');
    expect(i18n.t('limits.meter', { remaining: 10 })).toBe('You can delete 10 more today');

    i18n.changeLanguage('es');
    expect(i18n.t('pending.selected', { count: 5 })).toBe('5 seleccionadas');
    expect(i18n.t('limits.meter', { remaining: 10 })).toBe('Puedes eliminar 10 más hoy');
  });

  it('should fallback to English for missing translations', () => {
    i18n.changeLanguage('fr'); // Non-existent language
    expect(i18n.t('landing.continue')).toBe('Continue');
  });
});
