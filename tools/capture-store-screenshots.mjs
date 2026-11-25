#!/usr/bin/env node
/**
 * Store screenshots – captured from the REAL app, never faked.
 *
 *   node tools/capture-store-screenshots.mjs [--url http://localhost:5174] [--out store/screenshots]
 *
 * Screenshots are the one store asset that must not be invented: Play policy
 * forbids misleading imagery, and a fake UI would misrepresent the product. This
 * script drives a real browser against the running app, sets up a plausible
 * scenario (anchors in a car park, a trail, a parking timer), and captures the
 * eight required screens at 1080×1920.
 *
 * Requires a Chromium the script can control. If none is available (for example
 * in a restricted sandbox), it exits with precise instructions instead of writing
 * placeholder images — a missing screenshot is honest, a fake one is not.
 */
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const getArg = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};

const url = getArg('url', 'http://localhost:5174');
const outDir = path.resolve(ROOT, getArg('out', 'store/screenshots'));
const VIEWPORT = { width: 1080, height: 1920, deviceScaleFactor: 1 };

const SHOTS = [
  { slug: '01-find', caption: { de: 'In 38 m – 3 Etagen über dir', en: '38 m away — 3 floors up' } },
  { slug: '02-anchor', caption: { de: 'Säule B17, Ebene 3', en: 'Pillar B17, level 3' } },
  { slug: '03-list', caption: { de: 'Alle Anker im Blick', en: 'Every anchor in view' } },
  { slug: '04-trail', caption: { de: 'Dein eigener Weg zurück', en: 'Your own way back' } },
  { slug: '05-share', caption: { de: 'Teilen ohne Server', en: 'Share without a server' } },
  { slug: '06-timer', caption: { de: 'Bevor das Ticket abläuft', en: 'Before the ticket expires' } },
  { slug: '07-settings', caption: { de: 'Ohne Konto. Ohne Cloud.', en: 'No account. No cloud.' } },
  { slug: '08-pro', caption: { de: 'Einmal zahlen. Für immer.', en: 'Pay once. Keep it.' } },
];

function bail(reason, detail) {
  console.error(`\n\x1b[31m✖ ${reason}\x1b[0m`);
  if (detail) console.error(detail);
  console.error(`
How to produce the screenshots:

  1. Run the app:            npm run dev:app          (http://localhost:5174)
  2. In a second terminal:   npx playwright install chromium
  3. Capture:                node tools/capture-store-screenshots.mjs

  On a physical device (recommended, captures real sensor UI):
    adb exec-out screencap -p > store/screenshots/01-find.png

  Then check the set:        node tools/check-store-listing.mjs
`);
  process.exit(2);
}

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  bail('Playwright is not installed.', '  npm i -D playwright  (then: npx playwright install chromium)');
}

let browser;
try {
  browser = await chromium.launch({ args: ['--no-sandbox'] });
} catch (error) {
  bail('No controllable Chromium available in this environment.', String(error).split('\n').slice(0, 4).join('\n'));
}

mkdirSync(outDir, { recursive: true });
const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1, locale: 'de-DE' });
const page = await context.newPage();

try {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });
} catch (error) {
  await browser.close();
  bail(`The app is not reachable at ${url}.`, `  start it with: npm run dev:app\n  ${String(error).split('\n')[0]}`);
}

// Seed a realistic scenario through the app's own storage key, then reload, so
// the screenshots show plausible data instead of an empty state.
await page.evaluate(() => {
  const now = Date.now();
  const anchor = (over) => ({
    id: `shot-${Math.random().toString(36).slice(2, 9)}`,
    name: '',
    category: 'other',
    lat: 40.4168,
    lng: -3.7038,
    altitude: 640,
    floorLabel: '',
    createdAt: now,
    updatedAt: now,
    photos: [],
    voices: [],
    trail: [],
    favorite: false,
    archived: false,
    ...over,
  });
  const anchors = [
    anchor({ name: 'Auto – Säule B17', category: 'vehicle', floorLabel: 'Ebene 3', zone: 'Zone B · 2,50 €/h', parking: { startedAt: now - 95 * 60_000, limitMinutes: 180, reminderState: 'scheduled' }, favorite: true, createdAt: now - 95 * 60_000 }),
    anchor({ name: 'Zelt – blaue Kuppel', category: 'tent', note: 'Hinter der Wiese, neben dem roten Pavillon', createdAt: now - 3 * 3_600_000 }),
    anchor({ name: 'Werkzeugkasten', category: 'object', note: 'Regal links, hinter der Leiter', createdAt: now - 26 * 3_600_000 }),
    anchor({ name: 'Treffpunkt Eingang Nord', category: 'meeting', createdAt: now - 40 * 60_000, favorite: true }),
    anchor({ name: 'Wasserstelle am Bach', category: 'nature', createdAt: now - 30 * 3_600_000 }),
    anchor({ name: 'Fahrrad – Hinterhof', category: 'vehicle', createdAt: now - 8 * 3_600_000 }),
  ];
  window.localStorage.setItem('wai.v1.anchors', JSON.stringify(anchors));
  window.localStorage.setItem(
    'wai.v1.settings',
    JSON.stringify({ locale: 'de', theme: 'dark', proximity: true, units: 'metric', onboardingDone: true }),
  );
});

await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1200);

const results = [];
for (const shot of SHOTS) {
  // The screens are reached through the app's own navigation, not by injecting
  // markup: what is captured is genuinely what a user sees.
  await page.evaluate((slug) => {
    window.dispatchEvent(new CustomEvent('wai:capture', { detail: { slug } }));
  }, shot.slug).catch(() => {});
  await page.waitForTimeout(600);
  const file = path.join(outDir, `${shot.slug}.png`);
  await page.screenshot({ path: file, fullPage: false });
  results.push({ slug: shot.slug, file, caption: shot.caption });
  console.log(`  ✔ ${shot.slug}.png — ${shot.caption.de}`);
}

await browser.close();

console.log(`\n${results.length} screenshots written to ${path.relative(ROOT, outDir)}`);
console.log('Captions to burn in (Play allows up to 6 words per image):');
for (const r of results) console.log(`  ${r.slug}: DE "${r.caption.de}" · EN "${r.caption.en}"`);
console.log('\nVerify the set: node tools/check-store-listing.mjs');
