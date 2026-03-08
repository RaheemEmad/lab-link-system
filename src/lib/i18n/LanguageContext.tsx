import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { Language, Translations } from "./types";
import { en } from "./en";
import { ar } from "./ar";

const dictionaries: Record<Language, Translations> = { en, ar };

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const stored = localStorage.getItem("lablink_language");
    return (stored === "ar" ? "ar" : "en") as Language;
  });

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("lablink_language", lang);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.dir = language === "ar" ? "rtl" : "ltr";
    root.lang = language;
  }, [language]);

  const value: LanguageContextValue = {
    language,
    setLanguage,
    t: dictionaries[language],
    isRTL: language === "ar",
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextValue => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
};
