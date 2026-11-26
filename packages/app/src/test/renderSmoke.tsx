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
import { anchorFromShareCode } from '../store/shareImport';
import { EmptyState } from '../screens/EmptyState';
import { AnchorCard } from '../screens/HomeScreen';
import { CarSpotCard } from '../screens/CarSpotCard';
import { formatDistance, formatHeight } from '@wai/shared';
import { encodeSharePayload, buildShareLink, buildIntentLink } from '@wai/shared';

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

/**
 * 2b. Incoming share links and deep links must end up as a usable anchor —
 * the same code path serves the import field, the https preview hand-off and
 * the wai:// intent. A broken link must be rejected instead of half-imported.
 */
{
  const code = encodeSharePayload({
    v: 1,
    a: { lat: 41.38744, lng: 2.17006, n: 'Parkhaus BSM', cat: 'car', alt: 12, note: 'Ebene 2, Säule B17', zone: 'Zona 3' },
  } as never);
  const sources = [
    ['bare code', code],
    ['share link', buildShareLink(code, 'https://andrexthedev.github.io/wAI')],
    ['hash only', `#${code}`],
    ['query', `?code=${code}`],
    ['intent', buildIntentLink(code, 'https://andrexthedev.github.io/wAI')],
    ['deep link', `wai://anchor/${code}`],
  ] as const;

  const problems: string[] = [];
  for (const [label, input] of sources) {
    const anchor = anchorFromShareCode(input);
    if (!anchor) {
      problems.push(`${label}: not parsed`);
      continue;
    }
    if (anchor.name !== 'Parkhaus BSM') problems.push(`${label}: wrong name (${anchor.name})`);
    if (Math.abs(anchor.lat - 41.38744) > 1e-9) problems.push(`${label}: wrong latitude`);
    if (anchor.note !== 'Ebene 2, Säule B17') problems.push(`${label}: note lost`);
    if (anchor.photos.length || anchor.voices.length) problems.push(`${label}: media imported without consent`);
  }
  for (const broken of ['', 'kein code', 'WAIX1.unsinn', `${code.slice(0, 20)}`]) {
    if (anchorFromShareCode(broken)) problems.push(`broken input accepted: "${broken}"`);
  }

  if (problems.length) {
    failures++;
    console.log(`✖ share links: ${problems.join(' · ')}`);
  } else {
    console.log(`✔ share links (${sources.length} forms, 4 rejected inputs)`);
  }
}

/**
 * 2c. The things a user *sees* – empty state, level display, unit switch.
 * These are exactly the places where the audit found false promises, so they
 * are asserted by text, not by "it rendered without throwing".
 */
{
  const problems: string[] = [];

  // The empty state must not be titled "Untitled anchor" – that placeholder was
  // the very first screen a new install saw.
  for (const locale of ['de', 'en'] as Locale[]) {
    const tr = createTranslator(locale);
    const html = renderToString(
      createElement(EmptyState, {
        icon: null,
        title: tr('app.home.emptyTitle'),
        body: tr('app.home.emptyBody'),
        action: createElement('button', null, tr('app.home.emptyCta')),
      }),
    );
    if (/Untitled anchor|Unbenannter Anker/.test(html)) problems.push(`${locale}: empty state shows the placeholder title`);
    if (!html.includes(tr('app.home.emptyCta'))) problems.push(`${locale}: empty state has no "how it works" action`);
    if (html.length < 200) problems.push(`${locale}: empty state too short (${html.length})`);
  }

  // Units: the switch must change real output (it used to be inert).
  const metric = formatDistance(1200, 'de', 'metric');
  const imperial = formatDistance(1200, 'de', 'imperial');
  if (metric === imperial) problems.push('imperial and metric render identically');
  if (!imperial.includes('mi')) problems.push(`imperial distance lacks miles: ${imperial}`);
  if (formatHeight(12, 'en', 'imperial') !== '39 ft') problems.push('imperial height wrong');

  // A vehicle card must offer the parking timer without opening the editor.
  const tr = createTranslator('de');
  const carHtml = renderToString(
    // AnchorCard reads the unit system from the store, so it needs the provider.
    createElement(AppProvider, null, createElement(AnchorCard, {
      anchor: {
        id: 'a_car',
        name: 'Auto Ebene 3',
        category: 'car',
        lat: 48.1,
        lng: 11.5,
        source: 'demo',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        photos: [],
        voices: [],
        favorite: false,
        archived: false,
        floorLabel: '−3',
      },
      onOpen: () => {},
      onFind: () => {},
      onTimer: () => {},
      originLat: 48.1001,
      originLng: 11.5001,
      locale: 'de',
      t: tr,
    } as never)),
  );
  if (!carHtml.includes('anchor-card__timer')) problems.push('vehicle card has no timer shortcut');

  // "Where is my car?" card: level, distance and a way back to the compass.
  const spotHtml = renderToString(
    createElement(AppProvider, null, createElement(CarSpotCard, {
      anchor: {
        id: 'a_spot',
        name: 'Auto Ebene 3',
        category: 'car',
        lat: 48.1,
        lng: 11.5,
        source: 'demo',
        createdAt: Date.now() - 3_600_000,
        updatedAt: Date.now(),
        photos: [],
        voices: [],
        favorite: false,
        archived: false,
        floorLabel: '−3',
        parking: { startedAt: Date.now() - 1_800_000, limitMinutes: 120, reminderState: 'scheduled' as const },
      },
      distanceMeters: 240,
      onFind: () => {},
      onTimer: () => {},
    })),
  );
  if (!spotHtml.includes('carspot')) problems.push('car-spot card did not render');
  if (!spotHtml.includes('−3')) problems.push('car-spot card lost the level');
  if (!spotHtml.includes('240')) problems.push('car-spot card lost the distance');

  // Ein Anker 1400 km entfernt: die Kachel darf keine Kilometer behaupten,
  // sondern muss auf die Etage zurückfallen (Screenshot-Befund).
  const farHtml = renderToString(
    createElement(AppProvider, null, createElement(CarSpotCard, {
      anchor: {
        id: 'a_far', name: 'Auto weit weg', category: 'car', lat: 40.4, lng: -3.7,
        source: 'demo', createdAt: Date.now(), updatedAt: Date.now(),
        photos: [], voices: [], favorite: false, archived: false, floorLabel: '−3',
      },
      distanceMeters: null,
      onFind: () => {},
      onTimer: () => {},
    })),
  );
  if (!farHtml.includes('−3')) problems.push('far anchor: card lost the fallback level');
  if (!/Zum Auto|To the car/.test(spotHtml)) problems.push('car-spot card has no way to the compass');

  if (problems.length) {
    failures++;
    console.log(`✖ visible promises: ${problems.join(' · ')}`);
  } else {
    console.log('✔ visible promises (empty state, units, timer shortcut)');
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
