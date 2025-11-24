import { useTranslation } from "react-i18next";
import { LANGUAGES } from "../services";
import React, { useEffect } from "react";



export const LanguageSelector: React.FC = () => {
  const { i18n, t } = useTranslation()

  const [selectedLang, setSelectedLang] = React.useState<string>(i18n.language);
  

  useEffect(() => {
    const storedLang = localStorage.getItem("i18nextLng");
    console.log("storedLang from localStorage:", storedLang);
    const lang = storedLang || i18n.language || "bg";
    // changeLanguage returns a promise; handle errors silently
    i18n.changeLanguage(lang).catch(() => {});
    setSelectedLang(lang);
    console.log("Selected language set to:", lang);
  }, [i18n])

  const onChangeLang = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const lang_code = e.target.value
      i18n.changeLanguage(lang_code)
      setSelectedLang(lang_code)
      localStorage.setItem("i18nextLng", lang_code);
  }


return (
    <select value={selectedLang} onChange={onChangeLang} className="border rounded px-3 py-2 border-green-600/60 text-green-600 bg-black shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 h-full">
        {LANGUAGES.map(({ code, label }) => (
          <option key={code} value={code}>
            {label}
          </option>
        ))}
      </select>
);  
}