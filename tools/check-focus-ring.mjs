#!/usr/bin/env node
/**
 * Ist der Fokusring sichtbar, wenn man ihn braucht?
 *
 *   node tools/check-focus-ring.mjs                       # Port 5174
 *   node tools/check-focus-ring.mjs --url http://…:5174 --out docs/FOCUS_RINGS.md
 *
 * Warum das existiert
 * -------------------
 * `docs/DESIGN_SYSTEM.md` §2 sagt: „focus rings ≥ 3:1 against both the surface
 * and the surrounding background." Geprüft hat das nie jemand, und es stimmte
 * nicht:
 *
 *   - der Fokusring der Chips war `--border-2`, ein Hauch über der Fläche:
 *     1,40:1 im Nachtmodus, 1,64:1 auf einer Karte;
 *   - Textfelder hatten `outline: none` und zeigten Fokus nur als farbigen
 *     1-px-Rahmen – an derselben Stelle wie im Ruhezustand;
 *   - die Einwilligungs-Box hob den Ring ausdrücklich auf;
 *   - in `.chip`, `.category-btn`, `.segmented button` und `.anchor-card__timer`
 *     stand `transition: all`, das auch den Ring animiert: er wuchs über 130 ms
 *     von 0 auf 2 px und war im entscheidenden Moment unsichtbar.
 *
 * Was gemessen wird
 * -----------------
 * Jedes fokussierbare Element wird per `Tab` erreicht (nicht per `.focus()`,
 * denn nur so gilt `:focus-visible`) und dann gefragt: Welche Farbe hat der
 * Ring, und wie weit ist sie von der Fläche *daneben* entfernt? Der
 * Hintergrund wird nicht aus dem Theme angenommen, sondern aus dem gerenderten
 * Elternelement gelesen – sonst prüft man die Palette statt den Bildschirm.
 *
 * Ein Element ohne Ring, aber mit `box-shadow` (die Felder) zählt ebenfalls –
 * gemessen wird, was man sieht.
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
const theme = arg('theme', 'dark');
const outFile = arg('out', null);
const executablePath = arg('chromium', process.env.WAI_CHROMIUM || undefined);
const MIN = 3;

/* ---------------- Farbrechnung ---------------- */

const parseColor = (value) => {
  const m = value.match(/^rgba?\(([^)]+)\)$/i);
  if (!m) return null;
  const parts = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
  return { rgb: parts.slice(0, 3), alpha: parts.length > 3 ? parts[3] : 1 };
};

const over = (top, bottom) => top.rgb.map((c, i) => c * top.alpha + bottom[i] * (1 - top.alpha));

const luminance = (rgb) => {
  const [r, g, b] = rgb.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

/**
 * Der Grund hinter einem Element: der erste Vorfahr mit deckender Fläche.
 * `transparent` wird übersprungen, halbtransparente Flächen werden auf den
 * nächsten deckenden Grund gelegt – sonst wäre „3:1 gegen den Grund" eine
 * Aussage über eine Farbe, die auf dem Bildschirm nirgends vorkommt.
 */
const backdropOf = (element) => {
  let node = element.parentElement;
  let stack = [];
  while (node) {
    const value = parseColor(getComputedStyle(node).backgroundColor);
    if (value && value.alpha > 0) {
      stack.push(value);
      if (value.alpha >= 1) break;
    }
    node = node.parentElement;
  }
  let base = [255, 255, 255];
  for (let i = stack.length - 1; i >= 0; i -= 1) base = over(stack[i], base);
  return base;
};

/* ---------------- Ablauf ---------------- */

const browser = await chromium.launch({
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
  ...(executablePath ? { executablePath } : {}),
});
const context = await browser.newContext({
  viewport: { width: 412, height: 900 },
  locale: 'de-DE',
  isMobile: false, // Tastatur ist der Punkt dieser Prüfung
  hasTouch: false,
});
const page = await context.newPage();
await page.goto(url, { waitUntil: 'networkidle', timeout: 60_000 });
await page.evaluate((t) => {
  window.localStorage.setItem(
    'wai.v1.settings',
    JSON.stringify({ locale: 'de', theme: t, proximity: false, units: 'metric', onboardingDone: true }),
  );
}, theme);
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(900);

const results = [];

const measureFocused = () =>
  page.evaluate(
    ({ min }) => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const cs = getComputedStyle(el);
      const parse = (v) => {
        const m = String(v).match(/^rgba?\(([^)]+)\)$/i);
        if (!m) return null;
        const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
        return { rgb: p.slice(0, 3), alpha: p.length > 3 ? p[3] : 1 };
      };
      const over = (top, bottom) => top.rgb.map((c, i) => c * top.alpha + bottom[i] * (1 - top.alpha));
      const lum = (rgb) => {
        const [r, g, b] = rgb.map((v) => {
          const s = v / 255;
          return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const ratio = (a, b) => {
        const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
        return (hi + 0.05) / (lo + 0.05);
      };
      const backdrop = (node) => {
        const stack = [];
        let cur = node.parentElement;
        while (cur) {
          const c = parse(getComputedStyle(cur).backgroundColor);
          if (c && c.alpha > 0) {
            stack.push(c);
            if (c.alpha >= 1) break;
          }
          cur = cur.parentElement;
        }
        let base = [255, 255, 255];
        for (let i = stack.length - 1; i >= 0; i -= 1) base = over(stack[i], base);
        return base;
      };

      /**
       * Ein randloses Feld in einem getönten Kasten hat seinen Ring auf dem
       * Kasten, nicht auf sich selbst – ein `<input>` mit `border: none` hat
       * keinen Platz für einen sichtbaren Umriss. Deshalb zählt der nächste
       * Vorfahr mit einem gesetzten `outline` ebenfalls, und zwar mit dessen
       * Farbe und dessen Grund.
       */
      const ringNode = (() => {
        if ((parseFloat(cs.outlineWidth) || 0) > 0) return { node: el, cs };
        let cur = el.parentElement;
        while (cur && cur !== document.body) {
          const s2 = getComputedStyle(cur);
          if ((parseFloat(s2.outlineWidth) || 0) > 0) return { node: cur, cs: s2 };
          cur = cur.parentElement;
        }
        return null;
      })();

      const bg = backdrop(el);
      const ringCs = ringNode ? ringNode.cs : cs;
      const width = ringNode ? parseFloat(ringCs.outlineWidth) || 0 : 0;
      const offset = ringNode ? parseFloat(ringCs.outlineOffset) || 0 : 0;
      const outlineColor = width > 0 ? parse(ringCs.outlineColor) : null;
      /**
       * Ein Ring mit `outline-offset: 2` liegt außerhalb des Elements – dort ist
       * der Grund ein anderer als unter dem Element selbst. Bei negativem
       * Offset liegt er *auf* dem Element, dann ist dessen eigener Grund richtig.
       */
      const ringGround = offset > 0 ? backdrop(ringNode?.node ?? el) : bg;

      const shadow = cs.boxShadow && cs.boxShadow !== 'none' ? cs.boxShadow : null;
      const shadowColor = shadow ? parse(shadow.match(/rgba?\([^)]+\)/)?.[0] ?? '') : null;

      const ring = outlineColor ? over(outlineColor, ringGround) : null;
      const shadowRing = shadowColor && shadowColor.alpha > 0 ? over(shadowColor, bg) : null;

      return {
        tag: el.tagName.toLowerCase(),
        cls: (typeof el.className === 'string' ? el.className : '').trim().slice(0, 44),
        label: (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 30),
        outline: `${ringCs.outlineStyle} ${ringCs.outlineWidth} ${ringCs.outlineColor}`,
        ringWidth: width,
        ratio: ring ? ratio(ring, ringGround) : shadowRing ? ratio(shadowRing, bg) : 0,
        kind: ring ? 'outline' : shadowRing ? 'box-shadow' : 'keiner',
        min,
      };
    },
    { min: MIN },
  );

/** Elf Mal Tab – das deckt Kopfzeile, Leiste und den ersten Bildschirm ab. */
for (let i = 0; i < 11; i += 1) {
  await page.keyboard.press('Tab');
  await page.waitForTimeout(250);
  const row = await measureFocused();
  if (row) results.push(row);
}

/** Und dasselbe im Editor, wo die Textfelder und Kategorie-Knöpfe sitzen. */
await page.evaluate(() => {
  const card = document.querySelector('.anchor-card__tap');
  if (card) card.click();
});
await page.waitForTimeout(700);
await page.evaluate(() => document.activeElement?.blur?.());
for (let i = 0; i < 14; i += 1) {
  await page.keyboard.press('Tab');
  await page.waitForTimeout(250);
  const row = await measureFocused();
  if (row) results.push({ ...row, view: 'Editor' });
}

await browser.close();

/* ---------------- Auswertung ---------------- */

const failures = results.filter((row) => row.ratio + 0.02 < MIN);

const lines = [];
lines.push('# Fokusringe');
lines.push('');
lines.push(
  `Gemessen mit \`tools/check-focus-ring.mjs\` bei 412 dp, Theme \`${theme}\`: jedes Element ` +
    'wird mit `Tab` erreicht (nicht mit `.focus()`, sonst gilt `:focus-visible` nicht) und der ' +
    'Ring gegen den Grund **daneben** gerechnet.',
);
lines.push('');
lines.push(`Zusage (\`docs/DESIGN_SYSTEM.md\` §2): **≥ ${MIN}:1** gegen Fläche und Umgebung.`);
lines.push('');
lines.push(`Geprüft: **${results.length} Stationen** im Tastaturweg (Start + Editor).`);
lines.push('');
if (!failures.length) {
  lines.push(`Alle ${results.length} Ringe liegen über ${MIN}:1.`);
} else {
  lines.push(`${failures.length} Stationen liegen darunter:`);
  lines.push('');
  lines.push('| Element | Ring | Verhältnis |');
  lines.push('|---|---|---|');
  for (const row of failures) {
    lines.push(`| \`${row.cls || row.tag}\` — ${row.label || '—'} | ${row.kind} | **${row.ratio.toFixed(2)}:1** |`);
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
for (const row of results) {
  console.log(`  ${row.ratio + 0.02 >= MIN ? '✔' : '✖'} ${row.ratio.toFixed(2)}:1  ${row.kind.padEnd(10)} ${row.cls || row.tag}`);
}

if (failures.length) {
  console.error(`\n✖ ${failures.length} Fokusring(e) unter ${MIN}:1.`);
  process.exit(1);
}
console.log(`\n✔ Alle Fokusringe ≥ ${MIN}:1.`);
