import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import * as SecureStore from 'expo-secure-store';
import api from '../api/api';

interface TranslationContextValue {
  locale: string;
  changeLocale: (newLocale: string) => Promise<void>;
  t: (key: string, fallback?: string) => string;
  loading: boolean;
  translations: Record<string, string>;
}

const TranslationContext = createContext<TranslationContextValue | null>(null);

const STORAGE_KEY = 'dashboard_lang';
const DEFAULT_LOCALE = 'en';

export function TranslationProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState(DEFAULT_LOCALE);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const loadedLocale = useRef<string | null>(null);

  // Load stored locale on mount
  useEffect(() => {
    SecureStore.getItemAsync(STORAGE_KEY).then((stored) => {
      if (stored) setLocale(stored);
    });
  }, []);

  const loadTranslations = useCallback(async (lang: string) => {
    if (loadedLocale.current === lang) return;
    setLoading(true);
    try {
      const data = await api.getTranslations(lang);
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        setTranslations(data);
        loadedLocale.current = lang;
      }
    } catch {
      // silently fall back to keys if translation service is unavailable
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadedLocale.current = null;
    loadTranslations(locale);
  }, [locale, loadTranslations]);

  const changeLocale = useCallback(
    async (newLocale: string) => {
      if (newLocale === locale) return;
      await SecureStore.setItemAsync(STORAGE_KEY, newLocale);
      setLocale(newLocale);
    },
    [locale],
  );

  const t = useCallback(
    (key: string, fallback?: string): string => {
      if (translations[key] !== undefined) return translations[key];
      return fallback !== undefined ? fallback : key;
    },
    [translations],
  );

  return (
    <TranslationContext.Provider value={{ locale, changeLocale, t, loading, translations }}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation(): TranslationContextValue {
  const ctx = useContext(TranslationContext);
  if (!ctx) throw new Error('useTranslation must be used inside <TranslationProvider>');
  return ctx;
}
