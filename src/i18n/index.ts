import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import en from './strings.en.json';
import es from './strings.es.json';

const resources = {
  en: { translation: en },
  es: { translation: es },
};

const locale = getLocales()[0]?.languageCode ?? 'en';

i18n.use(initReactI18next).init({
  resources,
  lng: locale,
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
  pluralSeparator: '_',
  contextSeparator: '_',
  returnNull: false,
});

export default i18n;
