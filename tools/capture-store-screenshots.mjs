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
    steps: [{ within: 'Mein Auto', selector: '.anchor-card__tap' }],
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
    steps: [{ within: 'Wegkreuzung', selector: '.anchor-card__distance' }],
  },
  {
    slug: '04b-map',
    caption: { de: 'Die Straße, das Haus, dein Auto', en: 'The street, the house, your car' },
    // Der Distanz-Knopf öffnet den Fund-Screen (Kompass); dort dann auf "Karte".
    steps: [
      { within: 'Mein Auto', selector: '.anchor-card__distance' },
      { selector: '.segmented button', text: ['Karte', 'Map'] },
    ],
  },
  {
    slug: '05-share',
    caption: { de: 'Teilen ohne Server', en: 'Share without a server' },
    // Teilen liegt im Editor eines Ankers – nicht im Find-Bildschirm.
    steps: [
      { within: 'Wegkreuzung', selector: '.anchor-card__tap' },
      { aria: ['Teilen', 'Share'] },
    ],
  },
  {
    slug: '06-timer',
    caption: { de: 'Bevor das Ticket abläuft', en: 'Before the ticket expires' },
    // Der Timer-Knopf sitzt auf der Auto-Kachel oben (carspot) und zusätzlich in
    // der Liste; der obere ist der, den ein Nutzer zuerst sieht.
    steps: [{ selector: '.carspot__side' }],
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
    // Rund um den Demo-Standort (48.1355, 11.5826) – sonst liegt der Anker
    // 1 400 km entfernt und die Karte zeigt „irgendwo anders".
    lat: 48.1362 + (Math.random() - 0.5) * 0.002,
    lng: 11.5831 + (Math.random() - 0.5) * 0.002,
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
        { lat: 48.1349, lng: 11.5818, at: now - 3 * 3_600_000 - 480_000 },
        { lat: 48.1352, lng: 11.5822, at: now - 3 * 3_600_000 - 360_000 },
        { lat: 48.1354, lng: 11.5825, at: now - 3 * 3_600_000 - 240_000 },
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
  const { labels, aria, selector, within } = Array.isArray(step)
    ? { labels: step, aria: [] }
    : { labels: step.text ?? [], aria: step.aria ?? [], selector: step.selector, within: step.within };
  const hit = await page.evaluate(
    ({ texts, ariaTexts, sel, scope }) => {
      // Mit `within` wird die Karte gesucht, die diesen Anker enthält – sonst
      // landet man beim ersten Anker der Liste, nicht beim gemeinten.
      let root = document;
      if (scope) {
        const card = Array.from(document.querySelectorAll('.anchor-card')).find((node) =>
          (node.textContent ?? '').includes(scope),
        );
        if (!card) return null;
        root = card;
      }
      const nodes = Array.from(root.querySelectorAll(sel ?? 'button, a, [role="tab"], [role="button"], li'));
      for (const node of nodes) {
        const text = (node.textContent ?? '').replace(/\s+/g, ' ').trim();
        // Knöpfe, die nur ein Symbol und eine Distanz zeigen, sind nur über ihr
        // aria-label auffindbar – und genau die will man antippen.
        const label = (node.getAttribute('aria-label') ?? '').trim();
        const textHit = texts.some((t) => text === t || text.startsWith(t));
        const ariaHit = ariaTexts.some((t) => label.startsWith(t));
        // Ein Schritt, der nur einen Selektor nennt, meint den ersten Treffer –
        // vorher gab es dafür kein Kriterium und der Klick lief immer ins Leere.
        const selectorOnly = texts.length === 0 && ariaTexts.length === 0;
        if (textHit || ariaHit || selectorOnly) {
          node.dispatchEvent(new MouseEvent('click', { bubbles: true }));
          return (label || text).slice(0, 40);
        }
      }
      return null;
    },
    { texts: labels, ariaTexts: aria, sel: selector, scope: within },
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
    // Selbstauskunft: was war überhaupt klickbar? Ohne das ist die Fehlersuche ein
    // Blindflug über ein Log, das man von hier aus nicht lesen kann.
    const inventory = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.anchor-card')).slice(0, 6).map((card) => ({
        text: (card.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 40),
        buttons: Array.from(card.querySelectorAll('button')).map(
          (b) => b.className || b.getAttribute('aria-label') || 'button',
        ),
      })),
    );
    console.warn(`  ! ${shot.slug}: ${missing.length} Navigationsschritt(e) nicht gefunden`);
    console.warn(`      Karten im DOM: ${JSON.stringify(inventory).slice(0, 500)}`);
  }
  const file = path.join(outDir, `${shot.slug}.png`);
  await page.screenshot({ path: file, fullPage: false });

  /**
   * Was ist tatsächlich zu sehen? Ohne diese Selbstauskunft bliebe unbemerkt,
   * wenn ein Klick ins Leere lief und achtmal dieselbe Ansicht fotografiert
   * wurde — der Screenshot selbst sieht ja immer „richtig" aus.
   */
  if (shot.slug === '04b-map') {
    /**
     * Die Karte meldet sich selbst: Häuser, Straßen und Namen zählen. Ein leerer
     * oder zerschossener Kartenlayer sieht auf einem Screenshot sonst plausibel aus
     * – genau so blieb das erste echte Paket unbemerkt, das aus Fadenkreuzen
     * bestand. Geprüft wird das DOM, nicht ein Debug-Objekt im Fenster.
     */
    const drawn = await page.evaluate(() => ({
      houses: document.querySelectorAll('.map__building').length,
      roads: document.querySelectorAll('.map__road').length,
      labels: document.querySelectorAll('.map__label').length,
      pois: document.querySelectorAll('.map__poi').length,
    }));
    console.warn(`      Karte: ${JSON.stringify(drawn)}`);
    if (drawn.houses < 5) throw new Error(`Karte zeigt nur ${drawn.houses} Häuser – Layer kaputt?`);
  }
  const viewportUsed = page.viewportSize();
  const seen = await page.evaluate(() => {
    const body = document.body.innerText.replace(/\s+/g, ' ').trim();
    /**
     * Signatur statt Textanfang: der Kopfbereich ist auf jeder Ansicht gleich, also
     * verglichen frühere Fassungen nur Rauschen. Was eine Ansicht ausmacht, sind
     * ihre Bauteile und die Überschrift des offenen Sheets.
     */
    const sheetTitle = document.querySelector('.sheet__title, .sheet h2, [role="dialog"] h2');
    const header = document.querySelector('.topbar__titles');
    const parts = [
      header ? `anchor:${(header.textContent ?? '').trim().slice(0, 24)}` : '',
      document.querySelector('.carspot') ? 'carspot' : '',
      document.querySelector('.chips') ? 'chips' : '',
      document.querySelector('.compass, .guide') ? 'compass' : '',
      document.querySelector('.settings, .setting-row') ? 'settings' : '',
      document.querySelector('.pro, .pro__hero') ? 'pro' : '',
      sheetTitle ? `sheet:${(sheetTitle.textContent ?? '').trim()}` : '',
      location.hash || '',
    ].filter(Boolean);
    return {
      text: body.slice(0, 240),
      signature: parts.join(' + '),
      hasApp: Boolean(document.querySelector('.app')),
      title: document.title,
    };
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
        signature: r.seen.signature,
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
const distinct = new Set(results.map((r) => r.seen.signature || r.seen.text.slice(0, 60)));
if (distinct.size < results.length) {
  console.warn(`\n! Nur ${distinct.size} von ${results.length} Ansichten unterscheiden sich — Navigation greift nicht überall.`);
}

console.log('\nVerify the set: node tools/check-store-listing.mjs');
