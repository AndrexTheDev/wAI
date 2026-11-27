/**
 * Bilingual runtime (DE/EN) shared by the app and the landing page.
 *
 * - `useLocale()`-style state helpers live in the consumers; this module is
 *   framework agnostic so it can be unit tested with plain node.
 * - English is type-checked against the German master dictionary, so a forgotten
 *   translation is a compile-time error instead of a "undefined" in the UI.
 */
import { de, type GermanDictionary } from './de';
import { en } from './en';

export type Locale = 'de' | 'en';

export const LOCALES: readonly Locale[] = ['de', 'en'] as const;

/** German master literal types widened to plain strings. */
export type Widen<T> = T extends string
  ? string
  : T extends readonly (infer U)[]
    ? Widen<U>[]
    : { [K in keyof T]: Widen<T[K]> };

export type Dictionary = Widen<GermanDictionary>;

const dictionaries: Record<Locale, Dictionary> = { de: de as unknown as Dictionary, en };

export const getDictionary = (locale: Locale): Dictionary =>
  dictionaries[locale] ?? dictionaries.de;

export const isLocale = (value: unknown): value is Locale =>
  typeof value === 'string' && (LOCALES as readonly string[]).includes(value);

/**
 * Pick the best locale for the current device/browser. German for any `de-*`
 * tag, everything else falls back to English (the international default).
 */
export function detectLocale(
  languages: readonly string[] = typeof navigator !== 'undefined'
    ? navigator.languages ?? [navigator.language]
    : ['de'],
): Locale {
  for (const raw of languages) {
    const tag = (raw || '').toLowerCase();
    if (tag.startsWith('de')) return 'de';
    if (tag.startsWith('en')) return 'en';
  }
  return 'de';
}

export const LOCALE_STORAGE_KEY = 'wai.locale';

/** Read a stored locale, falling back to device detection. */
export function resolveInitialLocale(storage?: Pick<Storage, 'getItem'>): Locale {
  try {
    const stored = storage?.getItem(LOCALE_STORAGE_KEY);
    if (isLocale(stored)) return stored;
  } catch {
    /* storage may be blocked (private mode) – ignore */
  }
  return detectLocale();
}

export function persistLocale(locale: Locale, storage?: Pick<Storage, 'setItem'>): void {
  try {
    storage?.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    /* ignore */
  }
}

/** Interpolate `{name}` placeholders. Unknown vars are left untouched. */
export function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match,
  );
}

/**
 * Resolve a dotted path such as `landing.hero.title` or
 * `landing.features.items.2.title`. Returns the path itself when missing so the
 * UI degrades visibly (and tests can catch it) instead of rendering "undefined".
 */
export function resolvePath(source: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, part) => {
    if (acc == null) return undefined;
    if (Array.isArray(acc)) {
      const idx = Number(part);
      return Number.isInteger(idx) ? acc[idx] : undefined;
    }
    if (typeof acc === 'object') return (acc as Record<string, unknown>)[part];
    return undefined;
  }, source);
}

/** Vite-independent dev detection (works in node, bundlers and the WebView). */
function isDevBuild(): boolean {
  try {
    const env = (import.meta as unknown as { env?: { DEV?: boolean } }).env;
    if (env && typeof env.DEV === 'boolean') return env.DEV;
  } catch {
    /* import.meta.env unavailable */
  }
  const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  return proc?.env?.NODE_ENV !== 'production';
}

export type TFunction = (path: string, vars?: Record<string, string | number>) => string;

/**
 * Platzhalter wie „Etage(n)" sind keine deutsche Schreibweise – sie standen im
 * Store-Screenshot als „ca. 3 Etage(n)". Übersetzungen sagen deshalb `{floorWord}`
 * und `{floorSuffix}`, und hier wird die passende Form gewählt.
 *
 * `Etage` + Suffix `n` ergibt „Etagen", `floor` + `s` ergibt „floors" – das Muster
 * deckt beide Sprachen mit einem Schlüsselpaar ab.
 */
export const FLOOR_FORMS = {
  de: { one: 'Etage', many: 'Etagen' },
  en: { one: 'floor', many: 'floors' },
} as const;

export function floorForm(floors: number, locale: Locale): string {
  const forms = FLOOR_FORMS[locale] ?? FLOOR_FORMS.de;
  return floors === 1 ? forms.one : forms.many;
}

/** Build a translator for a locale. Missing keys fall back to German, then the path. */
export function createTranslator(locale: Locale): TFunction {
  const primary = getDictionary(locale);
  const fallback = dictionaries.de;
  /**
   * `{floorWord}` wird aus `floors` abgeleitet, statt an jeder Aufrufstelle
   * mitgegeben zu werden – sonst geriete eine davon ins Vergessen und die
   * Pluralform stünde als Platzhalter im Text.
   */
  const withVars = (vars?: Record<string, string | number>) => {
    if (!vars || !('floors' in vars)) return vars;
    const floors = Number(vars.floors);
    return Number.isFinite(floors) ? { ...vars, floorWord: floorForm(floors, locale) } : vars;
  };
  return (path, vars) => {
    const value = resolvePath(primary, path);
    if (typeof value === 'string') return interpolate(value, withVars(vars));
    const deValue = resolvePath(fallback, path);
    if (typeof deValue === 'string') return interpolate(deValue, withVars(vars));
    if (isDevBuild()) console.warn(`[i18n] missing key: ${path}`);
    return path;
  };
}

/** Typed array access helper (e.g. FAQ items, feature cards). */
export function tArray<T = Record<string, string>>(
  locale: Locale,
  path: string,
): T[] {
  const value = resolvePath(getDictionary(locale), path) ?? resolvePath(dictionaries.de, path);
  return Array.isArray(value) ? (value as T[]) : [];
}

/** Typed object access helper. */
export function tObject<T>(locale: Locale, path: string): T {
  const value = resolvePath(getDictionary(locale), path) ?? resolvePath(dictionaries.de, path);
  return (value ?? {}) as T;
}

/** Locale-aware number formatting (German uses comma decimals). */
export function formatNumber(value: number, locale: Locale, digits = 0): string {
  return new Intl.NumberFormat(locale === 'de' ? 'de-DE' : 'en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

/** Locale-aware date-time, 24h for DE, 12h for EN. */
export function formatDateTime(epochMs: number, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(epochMs));
}

export function formatTime(epochMs: number, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'en-US', {
    timeStyle: 'short',
  }).format(new Date(epochMs));
}

/**
 * Short duration: "2 T 4 Std." / "2 d 4 h".
 *
 * Genau volle Einheiten lassen die kleinere Einheit weg. Vorher stand auf dem
 * Screenshot „8 Std. 0 Min." für einen Anker, der nur acht Stunden alt war –
 * die Null war Rauschen, das wie eine Messung aussah.
 */
export function formatDuration(ms: number, locale: Locale): string {
  const totalMinutes = Math.max(0, Math.floor(ms / 60000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  const d = locale === 'de' ? 'T' : 'd';
  const h = locale === 'de' ? 'Std.' : 'h';
  const m = locale === 'de' ? 'Min.' : 'min';
  if (days > 0) return hours > 0 ? `${days} ${d} ${hours} ${h}` : `${days} ${d}`;
  if (hours > 0) return minutes > 0 ? `${hours} ${h} ${minutes} ${m}` : `${hours} ${h}`;
  return `${minutes} ${m}`;
}

/** Human readable byte size for the storage row in settings. */
export function formatBytes(bytes: number, locale: Locale): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  const text = (unit === 0 ? Math.round(value) : Math.round(value * 10) / 10)
    .toString()
    .replace('.', locale === 'de' ? ',' : '.');
  return `${text} ${units[unit]}`;
}

export type { GermanDictionary };
export { de, en };
