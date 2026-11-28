#!/usr/bin/env node
/**
 * Erfüllt die Farbpalette, was das Design-System verspricht?
 *
 *   node tools/check-contrast.mjs
 *
 * Warum das existiert
 * -------------------
 * `docs/DESIGN_SYSTEM.md` sagt seit dem ersten Tag: „all body text ≥ 4.5:1,
 * large text ≥ 3:1, focus rings ≥ 3:1 against both the surface and the
 * surrounding background." Nachgerechnet hat das nie jemand – es gibt 30 Tokens
 * in zwei Dateien (`packages/app/src/styles/app.css` und
 * `packages/landing/src/styles/tokens.css`) und drei Themes.
 *
 * Ein Browser-Test wäre hier das falsche Werkzeug: halbtransparente Flächen,
 * Verläufe und `opacity` machen die gemessene Hintergrundfarbe mehrdeutig. Was
 * sich eindeutig prüfen lässt, ist die Palette selbst – und genau die ist die
 * Zusage. Jedes Textpaar wird gegen seine Fläche gerechnet, in jedem Theme.
 *
 * Verlaufstext wird zusätzlich geprüft, und zwar an *allen* Stops und den
 * Zwischenwerten. Das ist kein akademischer Fall: die Website schneidet
 * `--grad-aurora-text` als Schrift auf die Fläche (`background-clip: text`), und
 * im hellen Theme stand dort der Aurora-Verlauf des Dunkelmodus – „1 Tipp",
 * „0 Byte", „0 €" kamen auf 1,4:1 und waren damit praktisch unsichtbar. Ein
 * Test, der nur einfarbige Tokens kennt, sieht so etwas nie.
 *
 * Ein Fehlschlag ist kein Stilproblem: hellgraue Schrift auf hellem Grund ist
 * für einen großen Teil der Nutzer nicht lesbar, und die App wird in dunklen
 * Tiefgaragen und nachts benutzt.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

/* ---------------- Farbrechnung ---------------- */

const parseColor = (value) => {
  const hex = value.match(/^#([0-9a-f]{6}|[0-9a-f]{3})$/i);
  if (hex) {
    const raw = hex[1].length === 3 ? hex[1].split('').map((c) => c + c).join('') : hex[1];
    return { rgb: [0, 2, 4].map((i) => parseInt(raw.slice(i, i + 2), 16)), alpha: 1 };
  }
  const rgba = value.match(/^rgba?\(([^)]+)\)$/i);
  if (rgba) {
    const parts = rgba[1].split(/[,\s/]+/).filter(Boolean).map(Number);
    return { rgb: parts.slice(0, 3), alpha: parts.length > 3 ? parts[3] : 1 };
  }
  return null;
};

/**
 * Zerlegt einen `linear-gradient(…)`-Wert in seine deckenden Farbstops. Nur
 * `#rrggbb` wird unterstützt – halbtransparente Stops in einem *Textverlauf*
 * wären ohnehin ein Fehler, weil die Schrift dann mit dem Grund verschmilzt.
 */
const parseGradient = (value) => {
  if (!value || !value.startsWith('linear-gradient')) return null;
  const stops = [...value.matchAll(/#[0-9a-f]{3,8}\b/gi)].map((m) => parseColor(m[0])).filter(Boolean);
  return stops.length >= 2 && stops.every((stop) => stop.alpha === 1) ? stops : null;
};

/** Zwei Farben linear mischen – für die Zwischenwerte eines Verlaufs. */
const mix = (a, b, t) => a.map((c, i) => c + (b[i] - c) * t);

/** Halbtransparente Fläche über einer deckenden legen. */
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

/* ---------------- Tokens lesen ---------------- */

/**
 * Liest einen `:root { … }`-Block. Die beiden Token-Dateien benutzen
 * unterschiedliche Namen (`--c-text-soft` vs. `--text-2`), deshalb bekommt jede
 * Datei eine eigene Zuordnung.
 */
function readBlock(file, selector) {
  const css = readFileSync(path.join(ROOT, file), 'utf8');
  const index = css.indexOf(selector);
  if (index < 0) return null;
  const open = css.indexOf('{', index);
  const close = css.indexOf('}', open);
  const body = css.slice(open + 1, close);
  const tokens = {};
  for (const line of body.split('\n')) {
    const match = line.match(/^\s*(--[\w-]+)\s*:\s*([^;]+);/);
    if (match) tokens[match[1]] = match[2].trim();
  }
  return tokens;
}

const themeSpecs = [
  {
    name: 'App · dunkel',
    file: 'packages/app/src/styles/app.css',
    selector: ':root {',
    name_soft: '--text-2',
    name_dim: '--text-3',
    token: (t) => ({ text: t['--text'], soft: t['--text-2'], dim: t['--text-3'], bg: t['--bg'], bg1: t['--bg-1'], surface: t['--surface'], mint: t['--mint'], sky: t['--sky'], violet: t['--violet'], danger: t['--danger'], amber: t['--amber'] }),
  },
  {
    name: 'App · hell',
    file: 'packages/app/src/styles/app.css',
    selector: ":root[data-theme='light'] {",
    token: (t) => ({ text: t['--text'], soft: t['--text-2'], dim: t['--text-3'], bg: t['--bg'], bg1: t['--bg-1'], surface: t['--surface'], mint: t['--mint'], sky: t['--sky'], violet: t['--violet'], danger: t['--danger'], amber: t['--amber'] }),
  },
  {
    name: 'App · Nacht',
    file: 'packages/app/src/styles/app.css',
    selector: ":root[data-theme='night'] {",
    token: (t) => ({ text: t['--text'], soft: t['--text-2'], dim: t['--text-3'], bg: t['--bg'], bg1: t['--bg-1'], surface: t['--surface'], mint: t['--mint'], sky: t['--sky'], violet: t['--violet'], danger: t['--danger'], amber: t['--amber'] }),
  },
  {
    name: 'Website · dunkel',
    file: 'packages/landing/src/styles/tokens.css',
    selector: ':root {',
    gradientText: true,
    token: (t) => ({ text: t['--c-text'], soft: t['--c-text-soft'], dim: t['--c-text-dim'], bg: t['--c-bg'], bg1: t['--c-bg-elev'], surface: t['--c-bg-card'], mint: t['--c-mint'], sky: t['--c-sky'], violet: t['--c-violet'], danger: t['--c-danger'], amber: t['--c-amber'], gradText: t['--grad-aurora-text'] }),
  },
  {
    name: 'Website · hell',
    file: 'packages/landing/src/styles/tokens.css',
    selector: ":root[data-theme='light'] {",
    gradientText: true,
    token: (t) => ({ text: t['--c-text'], soft: t['--c-text-soft'], dim: t['--c-text-dim'], bg: t['--c-bg'], bg1: t['--c-bg-elev'], surface: t['--c-bg-card'], mint: t['--c-mint'], sky: t['--c-sky'], violet: t['--c-violet'], danger: t['--c-danger'], amber: t['--c-amber'], gradText: t['--grad-aurora-text'] }),
  },
];

/* ---------------- Prüfung ---------------- */

let failures = 0;
const report = [];

for (const spec of themeSpecs) {
  const tokens = readBlock(spec.file, spec.selector);
  if (!tokens) {
    console.error(`✖ ${spec.name}: Block „${spec.selector}" nicht gefunden in ${spec.file}`);
    failures += 1;
    continue;
  }
  const t = spec.token(tokens);
  const missing = Object.entries(t).filter(([key, value]) => (key === 'gradText' ? !parseGradient(value) : !value || !parseColor(value)));
  if (missing.length) {
    console.error(`✖ ${spec.name}: Token fehlt oder ist keine Farbe: ${missing.map(([k]) => k).join(', ')}`);
    failures += 1;
    continue;
  }

  const bg = parseColor(t.bg).rgb;
  const bg1 = parseColor(t.bg1).rgb;
  const surface = over(parseColor(t.surface), bg1);

  /**
   * Die Paare, die das Design-System ausdrücklich nennt. `flach` = Text auf der
   * Seitenfläche, `karte` = Text auf einer Karte (bg-1 plus --surface).
   */
  const pairs = [
    ['Fließtext auf Seitenfläche', t.text, bg, 4.5],
    ['Fließtext auf Karte', t.text, surface, 4.5],
    ['Sekundärtext auf Seitenfläche', t.soft, bg, 4.5],
    ['Sekundärtext auf Karte', t.soft, surface, 4.5],
    ['Metatext auf Seitenfläche', t.dim, bg, 4.5],
    ['Metatext auf Karte', t.dim, surface, 4.5],
    ['Mint (Aktion/Erfolg) auf Seitenfläche', t.mint, bg, 4.5],
    ['Mint auf Karte', t.mint, surface, 4.5],
    ['Sky (Kompass) auf Seitenfläche', t.sky, bg, 4.5],
    ['Violett (Pro) auf Seitenfläche', t.violet, bg, 4.5],
    ['Rot (Fehler) auf Seitenfläche', t.danger, bg, 4.5],
    ['Gelb (Warnung) auf Seitenfläche', t.amber, bg, 4.5],
    /**
     * Status-Chips legen einen 9–10 %igen Schleier ihrer eigenen Farbe über die
     * Karte („GPS aktiv", „Demo", Warnzeilen). Der Schleier dunkelt den Grund
     * leicht ab, also ist der Chip der *schlechtere* Fall – nicht die Karte.
     */
    ['Mint auf eigenem Schleier', t.mint, mix(surface, parseColor(t.mint).rgb, 0.1), 4.5],
    ['Sky auf eigenem Schleier', t.sky, mix(surface, parseColor(t.sky).rgb, 0.1), 4.5],
    ['Gelb (Warnung) auf eigenem Schleier', t.amber, mix(surface, parseColor(t.amber).rgb, 0.1), 4.5],
  ];

  /**
   * Verlaufstext: die Schrift bekommt den Verlauf als Füllung, also muss *jeder*
   * Punkt des Verlaufs gegen den Grund bestehen, nicht nur die Stops. Geprüft
   * werden die Stops und 20 Zwischenwerte je Übergang.
   */
  if (spec.gradientText) {
    const stops = parseGradient(t.gradText);
    const samples = [stops[0].rgb];
    for (let i = 0; i < stops.length - 1; i += 1) {
      for (let step = 1; step < 20; step += 1) samples.push(mix(stops[i].rgb, stops[i + 1].rgb, step / 20));
    }
    samples.push(stops[stops.length - 1].rgb);
    const worst = Math.min(...samples.map((rgb) => contrast(rgb, bg)));
    report.push({ theme: spec.name, label: 'Verlaufstext auf Seitenfläche', value: worst, need: 4.5 });
    if (worst + 0.02 < 4.5) failures += 1;
  }

  for (const [label, fgValue, bgRgb, need] of pairs) {
    const value = contrast(over(parseColor(fgValue), bgRgb), bgRgb);
    report.push({ theme: spec.name, label, value, need });
    if (value + 0.02 < need) failures += 1;
  }
}

/* ---------------- Ausgabe ---------------- */

let current = '';
for (const row of report) {
  if (row.theme !== current) {
    current = row.theme;
    console.log(`\n${current}`);
  }
  const ok = row.value + 0.02 >= row.need;
  console.log(`  ${ok ? '✔' : '✖'} ${row.label.padEnd(36)} ${row.value.toFixed(2)}:1  (nötig ${row.need})`);
}

console.log('');
if (failures === 0) {
  console.log(`${report.length} Kontrastpaare in ${themeSpecs.length} Themes geprüft — alle über der Grenze.`);
  process.exit(0);
}
console.error(`✖ ${failures} Verstoß/Verstöße gegen die Zusage in docs/DESIGN_SYSTEM.md (4.5:1 für Text).`);
console.error('  Entweder das Token anpassen oder die Zusage – aber nicht beides ungeprüft lassen.\n');
process.exit(1);
