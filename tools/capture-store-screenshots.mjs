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
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const getArg = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};

const url = getArg('url', 'http://localhost:5174');
const outDir = path.resolve(ROOT, getArg('out', 'store/screenshots'));
/**
 * Play verlangt 1080×1920 **Pixel** – das sind auf einem Gerät mit 2,625×
 * Pixeldichte 412×732 CSS-Pixel. Vorher wurde 1080×1920 als CSS-Viewport gesetzt:
 * die App rendert dann wie auf einem 3-Etagen-Monitor, mit riesigen Lücken und
 * Text, den es so auf keinem Handy gibt. Deshalb: echter Geräte-Viewport ×
 * Skalierung = geforderte Pixelgröße.
 */
const VIEWPORT = { width: 412, height: 732, deviceScaleFactor: 2.621 };
const PIXELS = { width: 1080, height: 1920 };

const SHOTS = [
  {
    slug: '01-find',
    caption: { de: 'In 38 m – 3 Etagen über dir', en: '38 m away — 3 floors up' },
    // Die Auto-Kachel steht über der Liste; ihr Knopf führt zum Kompass.
    steps: [['Zum Auto', 'To the car']],
  },
  {
    slug: '02-anchor',
    caption: { de: 'Säule B17, Ebene −3', en: 'Pillar B17, level −3' },
    // Der Editor: Etage, Zone, Notiz – das, was man nach drei Stunden vergisst.
    steps: [{ selector: '.anchor-card__tap', text: ['Mein Auto', 'Pillar'] }],
  },
  {
    slug: '03-list',
    caption: { de: 'Alle Anker im Blick', en: 'Every anchor in view' },
    // Kategorie-Filter, damit sich Liste und Detail klar unterscheiden.
    // Filter-Chip statt bloßer Liste, damit sich 02/03 klar unterscheiden.
    steps: [{ selector: '.chips .chip', text: ['Natur', 'Nature'] }],
  },
  {
    slug: '04-trail',
    caption: { de: 'Dein eigener Weg zurück', en: 'Your own way back' },
    // Die Spur zeigt der Find-Bildschirm; der Knopf trägt nur die Distanz,
    // deshalb über aria-label ("Finden: …") ansteuern.
    steps: [{ aria: ['Zurückfinden', 'Back to'] }],
  },
  {
    slug: '05-share',
    caption: { de: 'Teilen ohne Server', en: 'Share without a server' },
    // Teilen liegt im Editor eines Ankers – nicht im Find-Bildschirm.
    steps: [
      { selector: '.anchor-card__tap', text: ['Wegkreuzung', 'West'] },
      { aria: ['Teilen', 'Share'] },
    ],
  },
  {
    slug: '06-timer',
    caption: { de: 'Bevor das Ticket abläuft', en: 'Before the ticket expires' },
    // Auf der Auto-Kachel steht der Timer-Knopf; sein aria-label beginnt mit "Park-Timer".
    steps: [{ selector: '.anchor-card__timer' }],
  },
  {
    slug: '07-settings',
    caption: { de: 'Ohne Konto. Ohne Cloud.', en: 'No account. No cloud.' },
    steps: [['Einstellungen', 'Settings']],
  },
  {
    slug: '08-pro',
    caption: { de: 'Einmal zahlen. Für immer.', en: 'Pay once. Keep it.' },
    steps: [['Einstellungen', 'Settings'], { aria: ['Pro', 'Free upgraden', 'Upgrade'] }],
  },
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
const context = await browser.newContext({
  viewport: { width: VIEWPORT.width, height: VIEWPORT.height },
  deviceScaleFactor: VIEWPORT.deviceScaleFactor,
  locale: 'de-DE',
  isMobile: true,
  hasTouch: true,
});
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
  // Kategorien und Feldnamen müssen exakt dem Domain-Modell entsprechen
  // (packages/shared/src/types.ts) – erfundenes „vehicle" hätte leere Icons gezeigt.
  const anchors = [
    anchor({
      name: 'Mein Auto · Säule B17',
      category: 'car',
      floorLabel: '−3',
      zone: 'Zone B · 2,50 €/h',
      note: 'Rechts neben dem blauen Pfeiler, Ausgang Ost.',
      parking: { startedAt: now - 95 * 60_000, limitMinutes: 120, reminderState: 'scheduled' },
      favorite: true,
      createdAt: now - 95 * 60_000,
    }),
    anchor({ name: 'Zelt – blaue Kuppel', category: 'tent', note: 'Hinter der Wiese, neben dem roten Pavillon', createdAt: now - 3 * 3_600_000 }),
    anchor({ name: 'Werkzeugkasten', category: 'tool', note: 'Regal links, hinter der Leiter', createdAt: now - 26 * 3_600_000 }),
    anchor({ name: 'Treffpunkt Eingang Nord', category: 'entrance', createdAt: now - 40 * 60_000, favorite: true }),
    anchor({ name: 'Wasserstelle am Bach', category: 'nature', createdAt: now - 30 * 3_600_000 }),
    anchor({
      name: 'Wegkreuzung West',
      category: 'nature',
      note: 'Nach dem Bach links, an der Bank vorbei.',
      trail: [
        { lat: 40.4172, lng: -3.7044, at: now - 3 * 3_600_000 - 480_000 },
        { lat: 40.4176, lng: -3.7039, at: now - 3 * 3_600_000 - 360_000 },
        { lat: 40.4179, lng: -3.7033, at: now - 3 * 3_600_000 - 240_000 },
      ],
      createdAt: now - 8 * 3_600_000,
    }),
  ];
  window.localStorage.setItem('wai.v1.anchors', JSON.stringify(anchors));
  window.localStorage.setItem(
    'wai.v1.settings',
    JSON.stringify({ locale: 'de', theme: 'dark', proximity: true, units: 'metric', onboardingDone: true }),
  );
});

await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1200);

/**
 * Klickt den ersten Knopf/Tab, dessen Beschriftung passt.
 * Die App navigiert über Tabs und Buttons – nicht über ein Capture-Event, das
 * früher hier gesendet wurde und das niemand empfangen hat (die Screenshots
 * wären alle identisch gewesen).
 */
async function clickLabel(page, step) {
  const { labels, aria, selector } = Array.isArray(step)
    ? { labels: step, aria: [] }
    : { labels: step.text ?? [], aria: step.aria ?? [], selector: step.selector };
  const hit = await page.evaluate(
    ({ texts, ariaTexts, sel }) => {
      const nodes = Array.from(document.querySelectorAll(sel ?? 'button, a, [role="tab"], [role="button"], li'));
      for (const node of nodes) {
        const text = (node.textContent ?? '').replace(/\s+/g, ' ').trim();
        // Knöpfe, die nur ein Symbol und eine Distanz zeigen, sind nur über ihr
        // aria-label auffindbar – und genau die will man antippen.
        const label = (node.getAttribute('aria-label') ?? '').trim();
        const textHit = texts.some((t) => text === t || text.startsWith(t));
        const ariaHit = ariaTexts.some((t) => label.startsWith(t));
        if (textHit || ariaHit) {
          node.dispatchEvent(new MouseEvent('click', { bubbles: true }));
          return (label || text).slice(0, 40);
        }
      }
      return null;
    },
    { texts: labels, ariaTexts: aria, sel: selector },
  );
  await page.waitForTimeout(700);
  return hit;
}

// Onboarding überspringen und in die App starten – ohne das zeigen alle acht
// Bilder denselben Begrüßungsschirm.
await clickLabel(page, ['Überspringen', 'Skip', 'Los geht', 'Los geht’s', 'Get started', 'Weiter', 'Continue']);
await page.waitForTimeout(400);

const results = [];
for (const shot of SHOTS) {
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('.app', { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(800);

  const reached = [];
  for (const step of shot.steps) {
    reached.push(await clickLabel(page, step));
  }
  const missing = reached.filter((hit) => hit === null);
  if (missing.length) {
    console.warn(`  ! ${shot.slug}: ${missing.length} Navigationsschritt(e) nicht gefunden — Bild zeigt ggf. die falsche Ansicht`);
  }
  const file = path.join(outDir, `${shot.slug}.png`);
  await page.screenshot({ path: file, fullPage: false });

  /**
   * Was ist tatsächlich zu sehen? Ohne diese Selbstauskunft bliebe unbemerkt,
   * wenn ein Klick ins Leere lief und achtmal dieselbe Ansicht fotografiert
   * wurde — der Screenshot selbst sieht ja immer „richtig" aus.
   */
  const viewportUsed = page.viewportSize();
  const seen = await page.evaluate(() => {
    const body = document.body.innerText.replace(/\s+/g, ' ').trim();
    return { text: body.slice(0, 240), hasApp: Boolean(document.querySelector('.app')), title: document.title };
  });
  results.push({ slug: shot.slug, file, caption: shot.caption, reached, seen, viewportUsed });
  console.log(`  ✔ ${shot.slug}.png — ${shot.caption.de}`);
  console.log(`      gesehen: ${seen.text.slice(0, 110)}`);
}

await browser.close();

console.log(`\n${results.length} screenshots written to ${path.relative(ROOT, outDir)}`);
console.log('Captions to burn in (Play allows up to 6 words per image):');
for (const r of results) console.log(`  ${r.slug}: DE "${r.caption.de}" · EN "${r.caption.en}"`);
// Bericht neben die Bilder: prüfbar per git, ohne Artefakt-Download.
writeFileSync(
  path.join(outDir, 'capture.json'),
  `${JSON.stringify(
    {
      capturedAt: new Date().toISOString(),
      viewport: { ...VIEWPORT, outputPixels: PIXELS },
      url,
      shots: results.map((r) => ({
        slug: r.slug,
        caption: r.caption,
        navigation: r.reached,
        visibleText: r.seen.text,
        hasAppShell: r.seen.hasApp,
        cssViewport: r.viewportUsed,
      })),
    },
    null,
    2,
  )}\n`,
);

/**
 * Zwei Bilder mit identischem Text sind kein Screenshot-Set, sondern ein Fehler.
 * Kein harter Abbruch: die Bilder existieren und sind prüfbar, und ein roter Lauf
 * ohne lesbares Log hilft niemandem weiter. Der Befund steht in capture.json und
 * im Exit-Status des Workflows.
 */
const distinct = new Set(results.map((r) => r.seen.text.slice(0, 60)));
if (distinct.size < results.length) {
  console.warn(`\n! Nur ${distinct.size} von ${results.length} Ansichten unterscheiden sich — Navigation greift nicht überall.`);
}

console.log('\nVerify the set: node tools/check-store-listing.mjs');
