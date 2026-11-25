/** Structured legal-document model (bilingual, renderable, exportable). */

export type LegalBlock =
  | { type: 'p'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'note'; text: string }
  | { type: 'quote'; text: string }
  | { type: 'table'; head: string[]; rows: string[][] };

export interface LegalSection {
  id: string;
  title: string;
  blocks: LegalBlock[];
}

export interface LegalLanguageContent {
  title: string;
  subtitle: string;
  intro: string[];
  sections: LegalSection[];
  outro?: string[];
}

export type LegalSlug =
  | 'terms'
  | 'privacy'
  | 'disclaimer'
  | 'imprint'
  | 'crypto-guide'
  | 'withdrawal';

export interface LegalDocument {
  slug: LegalSlug;
  /** Bumped whenever the text changes – shown in the UI and stored in exports. */
  updated: string;
  version: string;
  de: LegalLanguageContent;
  en: LegalLanguageContent;
}

/** Placeholder values resolved at render time. */
export const LEGAL_VARS = {
  brand: 'AndrexTheDev',
  product: 'wAI',
  email: 'hippie.highho@gmail.com',
  jurisdictionDe: 'Bundesrepublik Deutschland',
} as const;
