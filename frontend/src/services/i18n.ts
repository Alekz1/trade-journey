import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import bg from "./locales/bg.json";

i18n
  .use(initReactI18next)
  .init({
    lng: localStorage.getItem("language") || "bg",
    fallbackLng: "en",
    interpolation: {
      escapeValue: false,
    },
    resources: {
      en: { translation: en },
      bg: { translation: bg },
    },
  });

export default i18n;