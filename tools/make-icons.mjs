#!/usr/bin/env node
/**
 * Das App-Zeichen – eine Quelle, alle Größen.
 *
 * Das alte Zeichen war ein klassischer Anker: Ring, Punkt, Schaft, Querbalken.
 * Vier Bauteile, davon zwei Haarlinien – bei 48 px auf dem Homescreen bleibt davon
 * Matsch übrig, und inhaltlich sagt ein Marineanker nichts über „Auto im Parkhaus".
 *
 * Das neue Zeichen ist die Sache selbst: **eine Markierung, die an einem Ort
 * festhält.** Silhouette = eine Tropfenform mit ausgestanztem Loch. Das liest sich
 * bei 22 px noch als „hier ist etwas", und es sind nur zwei Tonwerte (Marke,
 * Hintergrund) statt vier.
 *
 * Dieses Skript erzeugt **alle** Ausgaben aus einer Definition, damit Store-Icon,
 * Android-Launcher, Splash und Favicon nicht auseinanderlaufen – vorher wurde das
 * Store-Icon aus dem Launcher-PNG zurückgerechnet, was jede Änderung doppelt nötig
 * machte.
 *
 *   node tools/make-icons.mjs          # schreiben
 *   node tools/make-icons.mjs --check  # nur prüfen, ob alles da ist
 *
 * Braucht ImageMagick (`convert`).
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const check = process.argv.includes('--check');

const C = {
  bgTop: '#122233',
  bgBottom: '#070b14',
  markFrom: '#7ff0c8',
  markTo: '#4f9dff',
  dot: '#6ee7b7',
};

/**
 * Geometrie in einem 1024er Raster – die einzige Wahrheit für alle Ausgaben.
 *
 * Die Marke ist ein **Pin mit einem Pfeil nach oben**: „hier liegt es, dahin
 * zurück". Ein Pin allein ist das meistbenutzte Symbol der Welt (jede Karten-App),
 * ein Anker sagt nichts über ein Parkhaus. Silhouette plus eine ausgestanzte Form
 * bleibt bei 22 px lesbar – mehr Bauteile werden dort zu Matsch, wie der alte Anker
 * mit Ring, Punkt, Schaft und Querbalken.
 */
const GEO = {
  size: 1024,
  /** Kopfmittelpunkt und Radius. */
  head: { x: 512, y: 388, r: 246 },
  /** Spitze unten. */
  tip: 892,
  /** Ausgestanzter Pfeil im Kopf. */
  arrow: { halfWidth: 118, tail: 424, headTop: 246, shoulder: 356 },
  /** Ecken der Kachel für Store-Icon und Favicon. */
  cornerRadius: 232,
};

/**
 * Die Pin-Silhouette mit korrekten Tangenten: vom Kopf laufen zwei Geraden zur
 * Spitze, nicht irgendwelche Kurven. Tangentenpunkt für einen Punkt im Abstand d
 * unter dem Mittelpunkt: Winkel acos(r/d) von der Senkrechten.
 */
function pinPath(g = GEO, scale = 1) {
  const { x, y, r } = g.head;
  const d = g.tip - y;
  const alpha = Math.acos(Math.min(1, r / d));
  const tx = r * Math.sin(alpha);
  const ty = y + r * Math.cos(alpha);
  const p = (px, py) => `${(px * scale).toFixed(2)} ${(py * scale).toFixed(2)}`;
  /**
   * Bogen über den **Kopf** vom rechten zum linken Tangentenpunkt. Die
   * sweep-Flag entscheidet die Richtung: 1 läuft über die Unterseite des Kreises,
   * 0 über die Oberseite – mit der falschen Flagge entsteht ein „V" statt eines
   * Pins, und genau das war auf dem ersten Entwurf zu sehen.
   */
  return [
    `M ${p(x, g.tip)}`,
    `L ${p(x + tx, ty)}`,
    `A ${(r * scale).toFixed(2)} ${(r * scale).toFixed(2)} 0 1 0 ${p(x - tx, ty)}`,
    `Z`,
  ].join(' ');
}

/**
 * Der Pfeil im Kopf: Schaft plus Spitze, als Polygon.
 *
 * Er zeigt nach oben – die Richtung, in die man läuft, wenn man zurückwill. Damit
 * ist die Marke nicht mehr „irgendein Ort", sondern „der Weg zu diesem Ort".
 */
function arrowPath(g = GEO, scale = 1) {
  const { x, y } = g.head;
  const a = g.arrow;
  const p = (px, py) => `${(px * scale).toFixed(2)} ${(py * scale).toFixed(2)}`;
  return [
    `M ${p(x, y - (y - a.headTop))}`, // Spitze oben
    `L ${p(x + a.halfWidth, a.shoulder)}`,
    `L ${p(x + a.halfWidth / 2.6, a.shoulder)}`,
    `L ${p(x + a.halfWidth / 2.6, a.tail)}`,
    `L ${p(x - a.halfWidth / 2.6, a.tail)}`,
    `L ${p(x - a.halfWidth / 2.6, a.shoulder)}`,
    `L ${p(x - a.halfWidth, a.shoulder)}`,
    'Z',
  ].join(' ');
}

function run(args) {
  execFileSync('convert', args, { stdio: 'pipe' });
}

function inTmp(name) {
  const dir = path.join(ROOT, 'node_modules', '.cache', 'wai-icons');
  mkdirSync(dir, { recursive: true });
  return path.join(dir, name);
}

/**
 * Die Marke mit Verlauf, als transparentes PNG der Kantenlänge `px`.
 * Zwei Ebenen: Verlauf, dann die Form als Alpha-Maske inklusive Loch.
 */
function renderMark(px) {
  const s = px / GEO.size;
  const gradient = inTmp(`grad-${px}.png`);
  const mask = inTmp(`mask-${px}.png`);
  const out = inTmp(`mark-${px}.png`);

  // Diagonaler Verlauf über die ganze Fläche. `-rotate` + `-crop` hinterließ weiße
  // Ecken, die als heller Keil in der Marke auftauchten; baryzentrisch ist exakt.
  run([
    '-size', `${px}x${px}`, 'xc:',
    '-sparse-color', 'barycentric', `0,0 ${C.markFrom} ${px - 1},${px - 1} ${C.markTo}`,
    gradient,
  ]);

  // Form weiß auf transparent, Pfeil schwarz = ausgestanzt.
  run([
    '-size', `${px}x${px}`, 'xc:none',
    '-fill', 'white',
    '-draw', `path '${pinPath(GEO, s)}'`,
    '-fill', 'black',
    '-draw', `path '${arrowPath(GEO, s)}'`,
    mask,
  ]);

  run([gradient, mask, '-alpha', 'off', '-compose', 'CopyOpacity', '-composite', out]);
  return out;
}

/** Hintergrundkachel: Verlauf plus weiches Aurora-Leuchten, wie der App-Hintergrund. */
function renderTile(px, { rounded }) {
  const base = inTmp(`base-${px}.png`);
  const glow = inTmp(`glow-${px}.png`);
  const flat = inTmp(`tile-${px}-${rounded ? 'r' : 's'}.png`);

  run(['-size', `${px}x${px}`, `gradient:${C.bgTop}-${C.bgBottom}`, base]);

  // Weiches Leuchten oben links: erst Form, dann Unschärfe, dann Deckkraft.
  run([
    '-size', `${px}x${px}`, 'xc:none',
    '-fill', '#6ee7b7',
    '-draw', `circle ${Math.round(px * 0.22)},${Math.round(px * 0.16)} ${Math.round(px * 0.52)},${Math.round(px * 0.16)}`,
    '-blur', `0x${Math.round(px * 0.10)}`,
    '-channel', 'A', '-evaluate', 'multiply', '0.18', '+channel',
    glow,
  ]);
  run([base, glow, '-compose', 'over', '-composite', flat]);

  if (!rounded) return flat;
  const mask = inTmp(`tilemask-${px}.png`);
  const roundedOut = inTmp(`tile-${px}-rr.png`);
  const radius = Math.round((GEO.cornerRadius / GEO.size) * px);
  run([
    '-size', `${px}x${px}`, 'xc:none',
    '-fill', 'white',
    '-draw', `roundrectangle 0,0 ${px - 1},${px - 1} ${radius},${radius}`,
    mask,
  ]);
  run([flat, mask, '-alpha', 'off', '-compose', 'CopyOpacity', '-composite', roundedOut]);
  return roundedOut;
}

/** Fertige Ikone: Marke auf Kachel, Marke auf Wunsch verkleinert (Adaptive-Safe-Zone). */
function composeIcon({ px, rounded, markScale = 1, background = true }) {
  const out = inTmp(`icon-${px}-${rounded}-${markScale}-${background}.png`);
  /**
   * Die Tropfenform ist höher als breit, ihr Schwerpunkt liegt also unter der
   * Mitte – auf dem Homescreen wirkt sie dann „nach unten gerutscht". Deshalb wird
   * die gezeichnete Marke erst auf ihre tatsächliche Ausdehnung beschnitten und
   * dann über die Höhe eingepasst; so sitzt sie in jeder Größe mittig.
   */
  const tall = Math.round(px * markScale);
  const raw = renderMark(Math.round(px * 1.4));
  const trimmed = inTmp(`mark-trim-${px}-${markScale}.png`);
  run([raw, '-trim', '+repage', trimmed]);
  const fit = inTmp(`mark-fit-${px}-${markScale}.png`);
  run([trimmed, '-resize', `x${tall}`, fit]);

  if (!background) {
    run(['-size', `${px}x${px}`, 'xc:none', fit, '-gravity', 'center', '-composite', out]);
    return out;
  }
  const tile = renderTile(px, { rounded });
  run([tile, fit, '-gravity', 'center', '-composite', out]);
  return out;
}

/**
 * Eine Silhouette in einer Farbe für Androids `monochrome`-Ebene (Themed Icons).
 *
 * Sie wird direkt gezeichnet statt aus dem farbigen Bild abgeleitet: ein
 * `CopyOpacity` auf einem bereits beschnittenen Bild ergab eine leere Datei, und
 * eine leere Themed-Icon-Ebene fällt niemandem im Test auf – nur dem Nutzer, dessen
 * Symbol dann unsichtbar ist.
 */
function composeSilhouette(px, markScale) {
  const out = inTmp(`mono-${px}-${markScale}.png`);
  const inner = Math.round(px * markScale);
  const shape = inTmp(`mono-shape-${px}-${markScale}.png`);
  run([
    '-size', `${inner}x${inner}`, 'xc:none',
    '-fill', 'white',
    '-draw', `path '${pinPath(GEO, inner / GEO.size)}'`,
    '-fill', 'none',
    '-draw', `path '${arrowPath(GEO, inner / GEO.size)}'`,
    shape,
  ]);
  run(['-size', `${px}x${px}`, 'xc:none', shape, '-gravity', 'center', '-composite', out]);
  return out;
}

/* ------------------------------------------------------------------ */
/* Ziele                                                              */
/* ------------------------------------------------------------------ */

const ANDROID_RES = path.join(ROOT, 'packages/app/android/app/src/main/res');
const STORE = path.join(ROOT, 'store/assets');
/** Adaptive Icons: 108 dp Fläche, Inhalt muss in den mittleren 66 dp bleiben. */
const DENSITIES = [
  ['mdpi', 1],
  ['hdpi', 1.5],
  ['xhdpi', 2],
  ['xxhdpi', 3],
  ['xxxhdpi', 4],
];
/** Inhalt auf 60 % – innerhalb der 66-dp-Sicherheitszone (61,1 %). */
const ADAPTIVE_CONTENT = 0.6;

function targets() {
  const list = [];
  // Store: 512×512, deckend, kein Alpha – so verlangt es Google Play. Die runden
  // Ecken werden mit der Hintergrundfarbe gefüllt, sonst zeigt Play einen weißen Rand.
  list.push({
    file: path.join(STORE, 'icon-512.png'),
    render: () => composeIcon({ px: 512, rounded: true, markScale: 0.80 }),
    opaque: C.bgBottom,
  });
  // Transparente Marke für Druck, Feature-Grafik und alles Weitere.
  list.push({ file: path.join(STORE, 'icon-mark-1024.png'), render: () => composeIcon({ px: 1024, rounded: false, background: false, markScale: 0.92 }) });

  for (const [density, factor] of DENSITIES) {
    const legacy = Math.round(48 * factor);
    const adaptive = Math.round(108 * factor);
    list.push({
      file: path.join(ANDROID_RES, `mipmap-${density}`, 'ic_launcher.png'),
      render: () => composeIcon({ px: legacy, rounded: true, markScale: 0.80 }),
    });
    list.push({
      file: path.join(ANDROID_RES, `mipmap-${density}`, 'ic_launcher_round.png'),
      render: () => composeIcon({ px: legacy, rounded: true, markScale: 0.80 }),
    });
    list.push({
      file: path.join(ANDROID_RES, `mipmap-${density}`, 'ic_launcher_foreground.png'),
      render: () => composeIcon({ px: adaptive, rounded: false, background: false, markScale: ADAPTIVE_CONTENT }),
    });
    list.push({
      file: path.join(ANDROID_RES, `mipmap-${density}`, 'ic_launcher_monochrome.png'),
      render: () => composeSilhouette(adaptive, ADAPTIVE_CONTENT),
    });
  }
  return list;
}

const SVG_VIEW = 64;
/**
 * Favicon: nur die Pin-Silhouette auf der Kachel, **ohne** Pfeil.
 *
 * Im Browser-Tab ist das Zeichen 16–24 px groß; der ausgestanzte Pfeil wird dort zu
 * einem dunklen Fleck und macht die Form schlechter lesbar statt besser. Das ist
 * keine Nachlässigkeit, sondern die Regel, die für jedes Icon gilt: unterhalb einer
 * gewissen Größe reduzieren, nicht verkleinern.
 */
function faviconSvg() {
  const s = SVG_VIEW / GEO.size;
  const r = (GEO.cornerRadius * s).toFixed(1);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SVG_VIEW} ${SVG_VIEW}" role="img" aria-label="wAI">
  <defs>
    <linearGradient id="w" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${C.markFrom}"/>
      <stop offset="1" stop-color="${C.markTo}"/>
    </linearGradient>
    <radialGradient id="b" cx="0.35" cy="0.2" r="0.9">
      <stop offset="0" stop-color="${C.bgTop}"/>
      <stop offset="1" stop-color="${C.bgBottom}"/>
    </radialGradient>
    <clipPath id="tile"><rect width="${SVG_VIEW}" height="${SVG_VIEW}" rx="${r}"/></clipPath>
  </defs>
  <g clip-path="url(#tile)">
    <rect width="${SVG_VIEW}" height="${SVG_VIEW}" fill="url(#b)"/>
    <path d="${pinPath(GEO, s)}" fill="url(#w)"/>
  </g>
</svg>
`;
}

if (check) {
  const missing = targets().filter((entry) => !existsSync(entry.file));
  if (missing.length) {
    for (const entry of missing) console.error(`✖ fehlt: ${path.relative(ROOT, entry.file)}`);
    process.exit(1);
  }
  console.log(`✔ ${targets().length} Icon-Dateien vorhanden`);
} else {
  for (const entry of targets()) {
    const dir = path.dirname(entry.file);
    mkdirSync(dir, { recursive: true });
    const rendered = entry.render();
    const finish = entry.opaque ? ['-background', entry.opaque, '-alpha', 'remove', '-alpha', 'off'] : [];
    execFileSync('convert', [rendered, ...finish, '-depth', '8', entry.file]);
    console.log(`· ${path.relative(ROOT, entry.file)}`);
  }

  // Favicon: App, Landing und die Kopie, die Capacitor nach assets/public spiegelt.
  const svg = faviconSvg();
  for (const file of [
    'packages/app/public/favicon.svg',
    'packages/landing/public/favicon.svg',
    'packages/landing/public/app/favicon.svg',
  ]) {
    mkdirSync(path.dirname(path.join(ROOT, file)), { recursive: true });
    writeFileSync(path.join(ROOT, file), svg);
    console.log(`· ${file}`);
  }
  // Splash: dunkle Fläche mit Marke in der Mitte, je Orientierung und Dichte –
  // einschließlich `drawable/splash.png` (Standarddichte) und der Querformate, die
  // vorher noch die alten Capacitor-Dateien waren.
  /**
   * Der Splash ist **nur** die Marke auf dem Verlauf – keine Kachel. Ein
   * quadratisches Bild auf einem anderen Verlauf ist als Rechteck sichtbar, und
   * genau das war auf dem ersten Entwurf zu sehen.
   */
  const splashBase = composeIcon({ px: 1024, rounded: false, background: false, markScale: 0.30 });
  const splashTargets = [];
  for (const [density, factor] of DENSITIES) {
    for (const orientation of ['port', 'land']) {
      splashTargets.push({
        file: path.join(ANDROID_RES, `drawable-${orientation}-${density}`, 'splash.png'),
        w: Math.round((orientation === 'port' ? 480 : 800) * factor),
        h: Math.round((orientation === 'port' ? 800 : 480) * factor),
      });
    }
  }
  // Standarddichte ohne Qualifier – Android nutzt sie, wenn keine Dichte passt.
  splashTargets.push({ file: path.join(ANDROID_RES, 'drawable', 'splash.png'), w: 480, h: 320 });

  for (const target of splashTargets) {
    {
      const { file, w, h } = target;
      mkdirSync(path.dirname(file), { recursive: true });
      execFileSync('convert', [
        '-size',
        `${w}x${h}`,
        `gradient:${C.bgTop}-${C.bgBottom}`,
        splashBase,
        '-gravity',
        'center',
        '-composite',
        '-depth',
        '8',
        file,
      ]);
    }
  }
  console.log(`✔ Icons, Favicon und Splash geschrieben`);
}
