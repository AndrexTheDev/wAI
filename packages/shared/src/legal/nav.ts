import type { LegalSlug } from './types';

/**
 * Navigation metadata for the legal documents – deliberately separated from the
 * documents themselves so footers and settings screens can list the links without
 * pulling ~100 kB of legal prose into the initial bundle.
 */
export const LEGAL_NAV: { slug: LegalSlug; path: string; de: string; en: string }[] = [
  { slug: 'disclaimer', path: '/legal/disclaimer', de: 'Haftungsausschluss', en: 'Disclaimer' },
  { slug: 'terms', path: '/legal/terms', de: 'AGB', en: 'Terms' },
  { slug: 'withdrawal', path: '/legal/withdrawal', de: 'Widerrufsbelehrung', en: 'Withdrawal notice' },
  { slug: 'privacy', path: '/legal/privacy', de: 'Datenschutz', en: 'Privacy' },
  { slug: 'imprint', path: '/legal/imprint', de: 'Impressum', en: 'Imprint' },
  { slug: 'crypto-guide', path: '/legal/crypto-guide', de: 'Krypto-Kaufanleitung', en: 'Crypto guide' },
];

/** Path helper shared by routing and the footer links. */
export const legalPath = (slug: LegalSlug): string => `/legal/${slug}`;
