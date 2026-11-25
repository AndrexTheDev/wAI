import type { LegalDocument, LegalSlug } from './types';
import { terms } from './terms';
import { privacy } from './privacy';
import { disclaimer } from './disclaimer';
import { imprint } from './imprint';
import { cryptoGuide } from './cryptoGuide';
import { withdrawal } from './withdrawal';
import type { Locale } from '../i18n';

export * from './types';
export { terms, privacy, disclaimer, imprint, cryptoGuide, withdrawal };

export const LEGAL_DOCUMENTS: Record<LegalSlug, LegalDocument> = {
  terms,
  privacy,
  disclaimer,
  imprint,
  'crypto-guide': cryptoGuide,
  withdrawal,
};

export const LEGAL_NAV: { slug: LegalSlug; path: string; de: string; en: string }[] = [
  { slug: 'disclaimer', path: '/legal/disclaimer', de: 'Haftungsausschluss', en: 'Disclaimer' },
  { slug: 'terms', path: '/legal/terms', de: 'AGB', en: 'Terms' },
  {
    slug: 'withdrawal',
    path: '/legal/withdrawal',
    de: 'Widerrufsbelehrung',
    en: 'Withdrawal notice',
  },
  { slug: 'privacy', path: '/legal/privacy', de: 'Datenschutz', en: 'Privacy' },
  { slug: 'imprint', path: '/legal/imprint', de: 'Impressum', en: 'Imprint' },
  { slug: 'crypto-guide', path: '/legal/crypto-guide', de: 'Krypto-Kaufanleitung', en: 'Crypto guide' },
];

export const getLegalDocument = (slug: string): LegalDocument | undefined =>
  slug in LEGAL_DOCUMENTS ? LEGAL_DOCUMENTS[slug as LegalSlug] : undefined;

export const getLegalContent = (slug: string, locale: Locale) => {
  const doc = getLegalDocument(slug);
  if (!doc) return undefined;
  return { doc, content: doc[locale] };
};

/** Path helper shared by routing and the footer links. */
export const legalPath = (slug: LegalSlug): string => `/legal/${slug}`;
