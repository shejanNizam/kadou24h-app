/**
 * i18next setup. French is the default; English is the second language.
 * The chosen language is stored in prefs (see store/prefsSlice).
 */
import { getLocales } from 'expo-localization';
import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from '@/locales/en.json';
import fr from '@/locales/fr.json';
import { Language } from '@/types/api';

/** The phone's language if we support it, else French. */
export const deviceLanguage = (): Language => {
  try {
    return getLocales()[0]?.languageCode === 'en' ? Language.en : Language.fr;
  } catch {
    return Language.fr;
  }
};

const i18n = createInstance();

void i18n.use(initReactI18next).init({
  resources: { fr: { translation: fr }, en: { translation: en } },
  lng: deviceLanguage(),
  fallbackLng: 'fr',
  interpolation: { escapeValue: false },
  returnNull: false,
});

export default i18n;
