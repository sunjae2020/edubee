import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "../locales/en/translation.json";
import ko from "../locales/ko/translation.json";
import ja from "../locales/ja/translation.json";
import th from "../locales/th/translation.json";

const STORAGE_KEY = "edubee_lang";
const savedLang = localStorage.getItem(STORAGE_KEY) || "en";

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ko: { translation: ko },
    ja: { translation: ja },
    th: { translation: th },
  },
  lng: savedLang,
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

// Persist language changes
i18n.on("languageChanged", (lng) => {
  localStorage.setItem(STORAGE_KEY, lng);
});

export default i18n;
