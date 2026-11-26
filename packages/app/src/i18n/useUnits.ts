import { useMemo } from 'react';
import { formatDistance, formatHeight, getDictionary, createTranslator } from '@wai/shared';
import { useApp } from '../store/AppStore';

/**
 * One place that knows the user's language *and* unit system.
 *
 * Screens use `useT()` for text and this hook for measurements, so a number can
 * never be formatted with a unit the user did not choose — the imperial switch
 * used to be purely decorative.
 */
export function useUnits() {
  const { locale, settings } = useApp();
  const units = settings.units;
  return useMemo(
    () => ({
      units,
      locale,
      t: createTranslator(locale),
      dict: getDictionary(locale),
      /** Distance with the chosen unit system, e.g. "42 m" / "138 ft". */
      distance: (meters: number) => formatDistance(meters, locale, units),
      /** Vertical distance, same unit system. */
      height: (meters: number) => formatHeight(meters, locale, units),
    }),
    [locale, units],
  );
}
