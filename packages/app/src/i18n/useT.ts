import { useMemo } from 'react';
import { createTranslator, getDictionary } from '@wai/shared';
import { useApp } from '../store/AppStore';

/**
 * Locale-aware translator for the app. Pods into the store so a language switch
 * re-renders every screen instantly (the store persists the choice).
 */
export function useT() {
  const { locale } = useApp();
  return useMemo(
    () => ({ t: createTranslator(locale), locale, dict: getDictionary(locale) }),
    [locale],
  );
}
