import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'

import translationAR from '@/locales/ar/translation.json'
import translationEN from '@/locales/en/translation.json'
import translationES from '@/locales/es/translation.json'
import translationFR from '@/locales/fr/translation.json'

function applyDocumentLangDir(lng: string) {
  if (typeof document === 'undefined') return
  document.documentElement.lang = lng
  document.documentElement.dir = i18n.dir(lng)
}

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      fr: { translation: translationFR },
      en: { translation: translationEN },
      es: { translation: translationES },
      ar: { translation: translationAR },
    },
    // No fixed `lng` here — LanguageDetector must read `localStorage.i18nextLng` on load.
    // Default when nothing stored / detected: French, then English for missing keys.
    fallbackLng: ['fr', 'en'],
    supportedLngs: ['fr', 'en', 'es', 'ar'],
    defaultNS: 'translation',
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
    react: { useSuspense: true },
  })
  .then(() => {
    applyDocumentLangDir(i18n.language)
  })

i18n.on('languageChanged', (lng) => {
  applyDocumentLangDir(lng)
})

export default i18n
