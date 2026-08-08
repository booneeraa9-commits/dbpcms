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
import { en, type TranslationKey } from "./i18n/en.js";
import { om } from "./i18n/om.js";

/**
 * The i18n provider. It tracks the selected language, remembers it, and exposes
 * a typed t(key) translator. English is the source of truth; Afaan Oromo values
 * override it, and any missing Oromo key falls back to English automatically.
 *
 * To translate more of the app: add a key to en.ts (+ its Oromo value in om.ts)
 * and use t("that.key") in a component.
 */
export type Language = "en" | "om"; // om = Afaan Oromo (ISO 639-1)

export const LANGUAGES: { code: Language; label: string }[] = [
  { code: "en", label: "English" },
  { code: "om", label: "Afaan Oromoo" },
];

const DICTIONARIES: Record<Language, Partial<Record<TranslationKey, string>>> = {
  en,
  om,
};

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
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
    (key: TranslationKey): string => DICTIONARIES[language][key] ?? en[key] ?? key,
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
