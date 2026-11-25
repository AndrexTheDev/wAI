import type { LegalDocument, LegalSlug } from './types';
import type { Locale } from '../i18n';

export * from './types';
export { LEGAL_NAV, legalPath } from './nav';

/**
 * Legal documents are loaded on demand.
 *
 * The six documents total roughly 100 kB of prose. Shipping them in the initial
 * bundle would slow down the first paint of the app and of the landing page for
 * content that most visitors never open. Instead every document is its own chunk:
 * the store and the UI only ever import `LEGAL_NAV` (a few hundred bytes), and a
 * reader pulls exactly the one document they asked for.
 *
 * The dynamic imports are static enough for the bundler to split them, and each
 * document stays in the bundle – so this still works completely offline.
 */
const LOADERS: Record<LegalSlug, () => Promise<LegalDocument>> = {
  terms: () => import('./terms').then((m) => m.terms),
  privacy: () => import('./privacy').then((m) => m.privacy),
  disclaimer: () => import('./disclaimer').then((m) => m.disclaimer),
  imprint: () => import('./imprint').then((m) => m.imprint),
  'crypto-guide': () => import('./cryptoGuide').then((m) => m.cryptoGuide),
  withdrawal: () => import('./withdrawal').then((m) => m.withdrawal),
};

export const LEGAL_SLUGS = Object.keys(LOADERS) as LegalSlug[];

export const isLegalSlug = (slug: string): slug is LegalSlug => slug in LOADERS;

/** Loads one document. Resolves to `undefined` for unknown slugs. */
export const loadLegalDocument = async (slug: string): Promise<LegalDocument | undefined> =>
  isLegalSlug(slug) ? LOADERS[slug]() : undefined;

/** Loads one document in one language, ready to render. */
export const loadLegalContent = async (slug: string, locale: Locale) => {
  const doc = await loadLegalDocument(slug);
  if (!doc) return undefined;
  return { doc, content: doc[locale] };
};
