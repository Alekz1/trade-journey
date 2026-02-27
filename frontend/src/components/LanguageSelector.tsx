import { useTranslation } from "react-i18next";
import { LANGUAGES } from "../services";
import React, { useEffect } from "react";

export const LanguageSelector: React.FC = () => {
  const { i18n } = useTranslation();
  const [selectedLang, setSelectedLang] = React.useState<string>(i18n.language);

  useEffect(() => {
    const storedLang = localStorage.getItem("i18nextLng");
    const lang = storedLang || i18n.language || "bg";
    i18n.changeLanguage(lang).catch(() => {});
    setSelectedLang(lang);
  }, [i18n]);

  const onChangeLang = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const lang_code = e.target.value;
    i18n.changeLanguage(lang_code);
    setSelectedLang(lang_code);
    localStorage.setItem("i18nextLng", lang_code);
  };

  return (
    <select
      value={selectedLang}
      onChange={onChangeLang}
      className="border border-green-600/60 text-green-600 bg-black px-2 py-1.5 text-sm
                 focus:outline-none focus:ring-1 focus:ring-green-500 rounded
                 max-w-[80px] sm:max-w-none"
      title="Language"
    >
      {LANGUAGES.map(({ code, label }) => (
        <option key={code} value={code}>
          {/* Short code on very small screens via option text truncation isn't possible in HTML,
              so we show the full label and let the select itself truncate */}
          {label}
        </option>
      ))}
    </select>
  );
};