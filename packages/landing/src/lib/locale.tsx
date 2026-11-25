import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  createTranslator,
  getDictionary,
  resolveInitialLocale,
  persistLocale,
  LOCALE_STORAGE_KEY,
  type Dictionary,
  type Locale,
  type TFunction,
} from '@wai/shared';

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: TFunction;
  dict: Dictionary;
  /** Path for the current page in the other language (used by the switcher). */
  altLocale: Locale;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

/** Reads ?lang= from the URL (shareable links) then localStorage, then device. */
function initialLocale(): Locale {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get('lang');
    if (fromUrl === 'de' || fromUrl === 'en') {
      try {
        localStorage.setItem(LOCALE_STORAGE_KEY, fromUrl);
      } catch {
        /* ignore */
      }
      return fromUrl;
    }
  }
  return resolveInitialLocale(typeof window !== 'undefined' ? window.localStorage : undefined);
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    persistLocale(next, window.localStorage);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dataset.locale = locale;
    // Keep the query param in sync so copied links keep the language.
    const url = new URL(window.location.href);
    if (url.searchParams.get('lang') !== locale) {
      url.searchParams.set('lang', locale);
      window.history.replaceState({}, '', url);
    }
  }, [locale]);

  const value = useMemo<LocaleContextValue>(() => {
    const dict = getDictionary(locale);
    return {
      locale,
      setLocale,
      t: createTranslator(locale),
      dict,
      altLocale: locale === 'de' ? 'en' : 'de',
    };
  }, [locale, setLocale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used inside <LocaleProvider>');
  return ctx;
}
