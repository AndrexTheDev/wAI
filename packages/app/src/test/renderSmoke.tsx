/**
 * App render smoke test.
 *
 * Renders the real app shell in a node environment with browser shims, for both
 * languages, and asserts that no translation key is missing and no `undefined`
 * leaks into the markup. This catches the most common regression in a bilingual
 * app before it ever reaches a device.
 */
import './testEnv';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { AppProvider } from '../store/AppStore';
import { ToastProvider } from '../ui/Toast';
import { AppShell } from '../screens/AppShell';
import { en, de, createTranslator, resolvePath, LEGAL_NAV, loadLegalDocument, type Locale } from '@wai/shared';
import { LegalDocumentView } from '../screens/LegalSheet';

let failures = 0;

/** 1. Dictionary completeness: every German text leaf must exist in English. */
function collectPaths(source: unknown, prefix = ''): string[] {
  if (source == null) return [];
  if (typeof source === 'string') return [prefix];
  if (typeof source === 'number' || typeof source === 'boolean') return [];
  if (Array.isArray(source)) return source.flatMap((item, i) => collectPaths(item, `${prefix}.${i}`));
  if (typeof source === 'object') {
    return Object.entries(source as Record<string, unknown>).flatMap(([key, value]) =>
      collectPaths(value, prefix ? `${prefix}.${key}` : key),
    );
  }
  return [prefix];
}

const dePaths = collectPaths(de);
const missingInEn = dePaths.filter((path) => typeof resolvePath(en, path) !== 'string');
if (missingInEn.length) {
  failures++;
  console.log(`✖ EN dictionary incomplete: ${missingInEn.slice(0, 10).join(', ')}${missingInEn.length > 10 ? ` (+${missingInEn.length - 10})` : ''}`);
} else {
  console.log(`✔ dictionaries complete (${dePaths.length} keys in DE and EN)`);
}

/** 2. Spot-check placeholders survive translation. */
const placeholderChecks = ['app.home.accuracy', 'app.pro.limitBanner', 'landing.download.steps.0.body'];
for (const key of placeholderChecks) {
  const t = createTranslator('de');
  const value = t(key, { meters: 5, limit: 3 });
  if (value.includes('{')) {
    failures++;
    console.log(`✖ placeholder not interpolated: ${key} → ${value}`);
  }
}

/** 3. Render the app shell. */
for (const locale of ['de', 'en'] as Locale[]) {
  const storage = (globalThis as unknown as { window: { localStorage: Storage } }).window.localStorage;
  storage.clear();
  storage.setItem(
    'wai.v1.settings',
    JSON.stringify({
      locale,
      units: 'metric',
      theme: 'dark',
      onboardingDone: true,
      proximityFeedback: true,
      hapticsOnly: true,
      voiceGuidance: false,
    }),
  );
  storage.setItem(
    'wai.v1.anchors',
    JSON.stringify([
      {
        id: 'a_demo1',
        name: locale === 'de' ? 'Auto Ebene 3' : 'Car level 3',
        category: 'car',
        lat: 48.1351,
        lng: 11.582,
        altitude: 412,
        accuracy: 6,
        source: 'demo',
        createdAt: Date.now() - 3600_000,
        updatedAt: Date.now(),
        note: 'Säule B17',
        photos: [],
        voices: [],
        favorite: true,
        archived: false,
        trail: [],
      },
    ]),
  );

  const warnings: string[] = [];
  const originalWarn = console.warn;
  const originalError = console.error;
  console.warn = (...args: unknown[]) => warnings.push(args.join(' '));
  console.error = (...args: unknown[]) => warnings.push(args.join(' '));

  let html = '';
  try {
    html = renderToString(
      createElement(AppProvider, null, createElement(ToastProvider, null, createElement(AppShell))),
    );
  } catch (error) {
    console.warn = originalWarn;
    console.error = originalError;
    failures++;
    console.log(`✖ ${locale} app render threw: ${(error as Error).message}`);
    continue;
  } finally {
    console.warn = originalWarn;
    console.error = originalError;
  }

  const missing = [...html.matchAll(/\[i18n\] missing key: ([\w.]+)/g)].map((m) => m[1]);
  const undefinedCount = (html.match(/\bundefined\b/g) ?? []).length;
  const problems = [
    missing.length ? `missing: ${[...new Set(missing)].join(', ')}` : '',
    undefinedCount ? `${undefinedCount}× "undefined"` : '',
    warnings.length ? `warnings: ${warnings.slice(0, 2).join(' | ')}` : '',
  ].filter(Boolean);

  if (problems.length) {
    failures++;
    console.log(`✖ ${locale} app shell      ${problems.join(' · ')}`);
  } else {
    console.log(`✔ ${locale} app shell      ${html.length} chars`);
  }
}

/**
 * 3. Every legal document must render offline in both languages. The documents are
 * code-split, so this also proves that all six chunks exist and that none of them
 * depends on a network request.
 */
const storage = (globalThis as unknown as { window: { localStorage: Storage } }).window.localStorage;

const decodeEntities = (text: string) =>
  text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#x27;/g, "'");

for (const locale of ['de', 'en'] as Locale[]) {
  // The reader takes its language from app state, so seed it explicitly.
  storage.setItem(
    'wai.v1.settings',
    JSON.stringify({
      locale,
      units: 'metric',
      theme: 'dark',
      onboardingDone: true,
      proximityFeedback: true,
      hapticsOnly: true,
      voiceGuidance: false,
    }),
  );

  for (const item of LEGAL_NAV) {
    const doc = await loadLegalDocument(item.slug);
    if (!doc) {
      failures++;
      console.log(`✖ ${locale} legal/${item.slug}  document did not load`);
      continue;
    }
    const content = doc[locale];
    const problems: string[] = [];
    if (!content.title?.trim()) problems.push('empty title');
    if (!content.sections.length) problems.push('no sections');
    if (content.sections.some((section) => !section.title?.trim())) problems.push('section without title');
    if (content.sections.some((section) => !section.blocks.length)) problems.push('section without content');
    // A rendering pass proves the block types are all supported.
    let html = '';
    try {
      html = renderToString(
        createElement(AppProvider, null, createElement(LegalDocumentView, { doc })),
      );
    } catch (error) {
      problems.push(`render threw: ${(error as Error).message}`);
    }
    if (/(undefined|\[object Object\])/.test(html)) problems.push('undefined leaked into markup');
    if (html.length < 2000) problems.push(`markup suspiciously short (${html.length} chars)`);
    if (!decodeEntities(html).includes(content.title)) problems.push('title missing from markup');

    if (problems.length) {
      failures++;
      console.log(`✖ ${locale} legal/${item.slug}  ${problems.join(' · ')}`);
    } else {
      console.log(`✔ ${locale} legal/${item.slug}  ${content.sections.length} sections, ${html.length} chars`);
    }
  }
}

if (failures) {
  console.log(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log('\nAll app checks passed.');
