#!/usr/bin/env node
/**
 * Sind Knöpfe groß genug für einen Daumen?
 *
 *   node tools/check-tap-targets.mjs                     # Standard-Port 5174
 *   node tools/check-tap-targets.mjs --url http://…:5174 --out docs/TAP_TARGETS.md
 *
 * Warum das existiert
 * -------------------
 * `docs/DESIGN_SYSTEM.md` §4 sagt: „Tap targets ≥ 44×44 px; icon-only buttons
 * get a 44 px hit area via padding." Gemessen war das nirgends wahr: `icon-btn`
 * war 38×38, `chip` 43 hoch, die Segmente im Sprachschalter 42, der Schalter
 * selbst 46×27. In der Dokumentation stand die Zusage, im Stylesheet stand sie
 * nicht – und niemand hat je einen Finger daraufgelegt.
 *
 * Warum nicht `getBoundingClientRect()`
 * ------------------------------------
 * Weil die sichtbare Box nicht die Trefferfläche ist. Genau das ist ja der
 * Punkt der Zusage: ein 38-px-Knopf darf eine 44-px-Fläche haben, die man nicht
 * sieht. Der Test tastet deshalb mit `elementFromPoint` in alle vier Richtungen
 * vom Mittelpunkt nach außen, bis der Punkt nicht mehr zum Element gehört – das
 * ist die Fläche, die ein Finger tatsächlich trifft, inklusive Pseudo-Elementen
 * und aufgeweiteter Trefferflächen.
 *
 * Overlays werden übersprungen: liegt ein Sheet über der Seite, gehört der
 * Punkt darüber dem Sheet und nicht dem Knopf darunter. Ein Element, dessen
 * Mitte verdeckt ist, ist in diesem Zustand nicht bedienbar und damit nicht
 * Teil der Frage.
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const url = arg('url', 'http://127.0.0.1:5174');
const outFile = arg('out', null);
/** Wie in `walkthrough.mjs` und `check-responsive.mjs`: eigenes Chromium erlaubt. */
const executablePath = arg('chromium', process.env.WAI_CHROMIUM || undefined);
const MIN = 44;

/* ---------------- Messung im Browser ---------------- */

/**
 * Ein Element im Skript, das die Trefferfläche ausmisst. `own` prüft, ob ein
 * Punkt zum Element gehört – nicht nur das Element selbst, sondern auch sein
 * Inhalt (Icon, Text-Span) und seine Pseudo-Elemente, die `elementFromPoint`
 * als das Element selbst meldet.
 */
const measure = (min) => {
  const selector = [
    'button',
    'a[href]',
    'input:not([type="hidden"])',
    'select',
    'textarea',
    '[role="button"]',
    '[role="tab"]',
    '[role="switch"]',
    '[role="checkbox"]',
  ].join(', ');

  const belongs = (el, x, y) => {
    const hit = document.elementFromPoint(x, y);
    if (!hit) return false;
    return hit === el || el.contains(hit);
  };

  /**
   * Grenze eines Elements in eine Richtung: von der eigenen Kante nach außen,
   * bis der Punkt nicht mehr dazugehört.
   *
   * Gemessen wird in **halben Pixeln**. Layouts sitzen selten auf ganzen: ein
   * 38-px-Knopf bei x = 270,0 mit 44 px Trefferfläche endet bei 312,0 – der
   * Nachbar beginnt bei 314, seine Fläche bei 311. Ein 1-px-Raster liest daraus
   * „43 px" und meldet einen Fehler, den es nicht gibt. Der erste Anlauf dieses
   * Tests hat genau das getan.
   *
   * `limit` ist die halbe Bildschirmdiagonale: ein 330 px breites Suchfeld
   * braucht mehr als die 40 px eines naiven Ansatzes, sonst sättigt die Messung
   * bei 80 und man jagt ein Gespenst.
   */
  const limit = Math.ceil(Math.max(innerWidth, innerHeight));
  let el;
  const edge = (startX, startY, dx, dy) => {
    let last = 0;
    for (let step = 0; step <= limit; step += 1) {
      const d = step * 0.5;
      if (belongs(el, startX + dx * d, startY + dy * d)) last = d;
      else if (step > 0) break;
    }
    return last;
  };

  const rows = [];
  for (const element of document.querySelectorAll(selector)) {
    const box = element.getBoundingClientRect();
    if (box.width < 1 || box.height < 1) continue;
    const style = getComputedStyle(element);
    if (style.visibility === 'hidden' || style.display === 'none' || style.pointerEvents === 'none') continue;
    if (box.bottom < 0 || box.top > innerHeight) continue;

    el = element;
    const cx = box.left + box.width / 2;
    const cy = box.top + box.height / 2;
    /** Verdeckt (Sheet, Toast, Dialog)? Dann ist das Element gerade nicht dran. */
    if (!belongs(element, cx, cy)) continue;

    const left = box.left - edge(box.left, cy, -1, 0);
    const right = box.right + edge(box.right, cy, 1, 0);
    const top = box.top - edge(cx, box.top, 0, -1);
    const bottom = box.bottom + edge(cx, box.bottom, 0, 1);

    rows.push({
      tag: element.tagName.toLowerCase(),
      cls: typeof element.className === 'string' ? element.className.trim().slice(0, 60) : '',
      label: (
        element.getAttribute('aria-label') ||
        element.textContent ||
        element.getAttribute('placeholder') ||
        element.getAttribute('name') ||
        ''
      )
        .trim()
        .replace(/\s+/g, ' ')
        .slice(0, 40),
      width: Math.round(right - left),
      height: Math.round(bottom - top),
      boxWidth: Math.round(box.width),
      boxHeight: Math.round(box.height),
      min,
    });
  }
  return rows;
};

/* ---------------- Ablauf ---------------- */

const browser = await chromium.launch({
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
  ...(executablePath ? { executablePath } : {}),
});
const context = await browser.newContext({
  viewport: { width: 412, height: 900 },
  locale: 'de-DE',
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 2,
});
const page = await context.newPage();
await page.goto(url, { waitUntil: 'networkidle', timeout: 60_000 });
await page.evaluate(() => {
  window.localStorage.setItem(
    'wai.v1.settings',
    JSON.stringify({ locale: 'de', theme: 'dark', proximity: false, units: 'metric', onboardingDone: true }),
  );
});
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(900);

/**
 * Die vier Reiter nacheinander. Sie werden per DOM-Klick gewechselt, nicht per
 * Playwright-Locator: der Reiter „Finden" heißt auf dem Bildschirm anders als
 * im Markup, und ein Locator, der nicht trifft, würde den Test stillschweigend
 * auf demselben Bildschirm weiterlaufen lassen.
 */
const views = ['Anker', 'Finden', 'Archiv', 'Einstellungen'];
const report = [];

for (const [index, name] of views.entries()) {
  const switched = await page.evaluate((i) => {
    const tab = document.querySelectorAll('.tab')[i];
    if (!tab) return false;
    tab.click();
    return true;
  }, index);
  if (!switched) continue;
  await page.waitForTimeout(700);

  /** Ein Sheet, das der Reiterwechsel geöffnet hat, wieder schließen. */
  await page.evaluate(() => {
    const close = document.querySelector('.sheet__close') ?? document.querySelector('.sheet [aria-label*="Schließ"]');
    if (close) close.click();
  });
  await page.waitForTimeout(400);

  const rows = await page.evaluate(measure, MIN);
  if (rows.length) report.push({ view: name, rows });
}

await browser.close();

/* ---------------- Auswertung ---------------- */

const findings = [];
for (const { view, rows } of report) {
  /** Gleiche Bauteile werden einmal genannt, nicht pro Vorkommen. */
  const seen = new Set();
  for (const row of rows) {
    if (row.width >= MIN && row.height >= MIN) continue;
    const key = `${row.cls}|${row.width}x${row.height}`;
    if (seen.has(key)) continue;
    seen.add(key);
    findings.push({ view, ...row });
  }
}

const lines = [];
lines.push('# Trefferflächen');
lines.push('');
lines.push(`Gemessen mit \`tools/check-tap-targets.mjs\` bei 412 dp, dunkles Theme, vier Reiter.`);
lines.push('');
lines.push(`Zusage (\`docs/DESIGN_SYSTEM.md\` §4): **${MIN}×${MIN} px**.`);
lines.push('');

const total = report.reduce((sum, entry) => sum + entry.rows.length, 0);
lines.push(`Geprüft: **${total} bedienbare Elemente** in ${report.length} Ansichten.`);
lines.push('');

if (!findings.length) {
  lines.push(`Alle ${total} Elemente haben mindestens ${MIN}×${MIN} px Trefferfläche.`);
} else {
  lines.push(`${findings.length} Bauteile sind kleiner als ${MIN} px:`);
  lines.push('');
  lines.push('| Ansicht | Element | Box | Trefferfläche | Beschriftung |');
  lines.push('|---|---|---|---|---|');
  for (const finding of findings) {
    lines.push(
      `| ${finding.view} | \`${finding.cls || finding.tag}\` | ${finding.boxWidth}×${finding.boxHeight} | **${finding.width}×${finding.height}** | ${finding.label || '—'} |`,
    );
  }
}

const markdown = `${lines.join('\n')}\n`;

if (outFile) {
  mkdirSync(path.dirname(path.resolve(outFile)), { recursive: true });
  writeFileSync(outFile, markdown);
  console.log(`→ ${outFile}`);
}

console.log('');
console.log(markdown);
if (findings.length) {
  console.error(`✖ ${findings.length} Bauteil(e) unter ${MIN}×${MIN} px.`);
  process.exit(1);
}
console.log(`✔ Alle Trefferflächen ≥ ${MIN}×${MIN} px.`);
