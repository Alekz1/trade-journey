import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { LANGUAGES } from "../services";

export const LanguageSelector: React.FC = () => {
  const { i18n } = useTranslation();
  const [selectedLang, setSelectedLang] = useState<string>(i18n.language);

  useEffect(() => {
    // Restore persisted language on mount; fall back to browser language then "bg"
    const stored = localStorage.getItem("i18nextLng");
    const lang   = stored ?? i18n.language ?? "bg";
    i18n.changeLanguage(lang).catch(() => {});
    setSelectedLang(lang);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally run once on mount — i18n reference is stable

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    i18n.changeLanguage(code);
    setSelectedLang(code);
    localStorage.setItem("i18nextLng", code);
  };

  return (
    <select
      value={selectedLang}
      onChange={handleChange}
      title="Language"
      className="border border-green-600/60 text-green-600 bg-black px-2 py-1.5 text-sm
                 focus:outline-none focus:ring-1 focus:ring-green-500
                 max-w-[80px] sm:max-w-none"
    >
      {LANGUAGES.map(({ code, label }: { code: string; label: string }) => (
        <option key={code} value={code}>{label}</option>
      ))}
    </select>
  );
};
