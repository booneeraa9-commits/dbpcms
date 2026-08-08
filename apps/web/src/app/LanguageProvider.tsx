import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type JSX,
  type ReactNode,
} from "react";

/**
 * Minimal i18n scaffolding. It tracks the selected language and remembers it,
 * and exposes a t() translator that looks up a dictionary. For now only English
 * strings exist; an Afaan Oromo dictionary can be dropped in later WITHOUT
 * touching screens — t() falls back to the key's English text meanwhile.
 *
 * This deliberately ships the toggle + plumbing only (per the plan); actual
 * Oromo translations come in a later localization pass.
 */
export type Language = "en" | "om"; // om = Afaan Oromo (ISO 639-1)

export const LANGUAGES: { code: Language; label: string }[] = [
  { code: "en", label: "English" },
  { code: "om", label: "Afaan Oromo" },
];

// Translation dictionaries. Only English is populated today.
const DICTIONARIES: Record<Language, Record<string, string>> = {
  en: {},
  om: {}, // to be filled during localization
};

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  /** Translate a key; falls back to the provided English default. */
  t: (key: string, fallback: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);
const STORAGE_KEY = "dbpcms-language";

export function LanguageProvider({ children }: { children: ReactNode }): JSX.Element {
  const [language, setLanguageState] = useState<Language>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "en" || stored === "om" ? stored : "en";
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = useCallback((lang: Language) => setLanguageState(lang), []);

  const t = useCallback(
    (key: string, fallback: string) => DICTIONARIES[language][key] ?? fallback,
    [language],
  );

  const value = useMemo(
    () => ({ language, setLanguage, t }),
    [language, setLanguage, t],
  );
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within <LanguageProvider>");
  return ctx;
}
