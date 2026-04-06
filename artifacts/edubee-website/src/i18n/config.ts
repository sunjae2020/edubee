import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import enRaw from './locales/en.json'
import koRaw from './locales/ko.json'
import jaRaw from './locales/ja.json'
import zhRaw from './locales/zh.json'
import thRaw from './locales/th.json'
import viRaw from './locales/vi.json'

if (!i18n.isInitialized) {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources: {
        en: { translation: enRaw },
        ko: { translation: koRaw },
        ja: { translation: jaRaw },
        zh: { translation: zhRaw },
        th: { translation: thRaw },
        vi: { translation: viRaw },
      },
      fallbackLng: 'en',
      defaultNS: 'translation',
      detection: { order: ['localStorage', 'navigator'], caches: ['localStorage'] },
      interpolation: { escapeValue: false },
    })
}

export default i18n
