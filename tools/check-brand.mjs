#!/usr/bin/env node
/**
 * Prüft, dass die Marke überall dieselbe ist.
 *
 * Das Zeichen existiert an fünf Stellen: Store-Icon, Android-Launcher (fünf
 * Dichten), Splash, Favicon und Website-Logo. Sie sind historisch auseinandergelaufen
 * – Store-Icon, Launcher und Benachrichtigung zeigten noch den alten Anker, während
 * die Website schon etwas anderes hatte. Ein Bild kann man nicht difffizieren wie
 * Code, aber man kann prüfen, was es *ist*:
 *
 *   1. Ein leerer oder fast leerer Layer ist ein Fehler (unsichtbares Icon).
 *   2. Store-Icon muss deckend sein und 512×512 messen (Play-Vorgabe).
 *   3. Alle Launcher-Dichten müssen die richtige Pixelgröße haben.
 *   4. Jede Datei muss dieselbe Silhouette zeigen: gleiche Deckung ±Toleranz,
 *      gleicher Schwerpunkt. Damit fällt ein alter Anker sofort auf.
 *   5. Das Favicon muss den Pin-Pfad enthalten, nicht das alte Anker-SVG.
 *
 * Braucht ImageMagick. Fehlt es, wird das ehrlich gesagt statt still bestanden.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const RES = path.join(ROOT, 'packages/app/android/app/src/main/res');
const ICON_512 = path.join(ROOT, 'store/assets/icon-512.png');

let errors = 0;
const fail = (message) => {
  errors += 1;
  console.error(`  ✖ ${message}`);
};
const ok = (message) => console.log(`  ✔ ${message}`);

function tool(args) {
  return execFileSync('convert', args, { encoding: 'utf8' }).trim();
}

function metrics(file) {
  const size = tool([file, '-format', '%wx%h', 'info:']);
  // Deckende Fläche nach Schwellwert: robust gegen Kantenglättung.
  const coverage = Number(tool([file, '-alpha', 'extract', '-threshold', '50%', '-format', '%[fx:mean]', 'info:']));
  /**
   * Schwerpunkt der Deckung – verrät eine andere Form bei gleicher Fläche.
   * ImageMagick 6 kennt keine `centroid`-Variable; deshalb wird das Alpha-Bild auf
   * 64×64 verkleinert und die hellen Pixel gezählt. Grob, aber genau genug, um einen
   * Anker von einem Pin zu unterscheiden.
   */
  const cells = tool([file, '-alpha', 'extract', '-threshold', '50%', '-resize', '64x64!', '-depth', '8', 'txt:-']);
  let sx = 0;
  let sy = 0;
  let n = 0;
  for (const line of cells.split('\n').slice(1)) {
    const match = /^(\d+),(\d+):.*(white|gray\(255\)|#FFFFFF)/i.exec(line);
    if (!match) continue;
    sx += Number(match[1]);
    sy += Number(match[2]);
    n += 1;
  }
  const centroid = n > 0 ? { x: sx / n, y: sy / n, cells: n } : null;
  return { size, coverage, centroid };
}

console.log('App-Marke');
if (!existsSync(ICON_512)) {
  fail('store/assets/icon-512.png fehlt – node tools/make-icons.mjs');
} else {
  const { size, coverage } = metrics(ICON_512);
  if (size !== '512x512') fail(`Store-Icon ist ${size}, Play verlangt 512x512`);
  else ok('Store-Icon 512×512');
  if (coverage < 0.5) fail(`Store-Icon wirkt leer (${(coverage * 100).toFixed(0)} % deckend)`);
  // Play verlangt ein deckendes Bild ohne Transparenz.
  const opaque = tool([ICON_512, '-format', '%[opaque]', 'info:']);
  if (!/^true$/i.test(opaque)) fail(`Store-Icon hat transparente Pixel (Play verlangt deckend, opaque=${opaque})`);
  else ok('Store-Icon ist deckend');
}

const reference = existsSync(ICON_512) ? metrics(ICON_512) : null;
const launcherSizes = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
for (const [density, expected] of Object.entries(launcherSizes)) {
  const file = path.join(RES, `mipmap-${density}`, 'ic_launcher.png');
  if (!existsSync(file)) {
    fail(`${density}: ic_launcher.png fehlt`);
    continue;
  }
  const { size, coverage, centroid } = metrics(file);
  if (size !== `${expected}x${expected}`) fail(`${density}: ${size}, erwartet ${expected}px`);
  if (coverage < 0.4) fail(`${density}: Icon fast leer (${(coverage * 100).toFixed(0)} %)`);
  /**
   * Gleiche Marke heißt: gleicher Anteil deckender Fläche und gleicher Schwerpunkt.
   * Der Test ist bewusst grob – er soll einen austretenden Anker fangen, nicht
   * Subpixel diskutieren.
   */
  if (reference) {
    if (Math.abs(coverage - reference.coverage) > 0.12) {
      fail(`${density}: andere Silhouette als das Store-Icon (${(coverage * 100).toFixed(0)} % vs ${(reference.coverage * 100).toFixed(0)} %)`);
    }
    if (!centroid) {
      fail(`${density}: keine deckende Fläche gefunden`);
    } else {
      // 64er-Raster: Mitte 31,5. Ein Pin ist unten spitz, sein Schwerpunkt liegt
      // leicht über der Mitte – mehr als ein paar Zellen Abweichung heißt „andere Form".
      const offX = Math.abs(centroid.x - 31.5);
      const offY = Math.abs(centroid.y - 31.5);
      if (offX > 3 || offY > 6) {
        fail(`${density}: Marke sitzt nicht mittig (${centroid.x.toFixed(1)}/${centroid.y.toFixed(1)})`);
      }
    }
  }
}
ok('Launcher-Größen und Silhouette geprüft');

for (const file of [
  'packages/app/public/favicon.svg',
  'packages/landing/public/favicon.svg',
  'packages/landing/public/app/favicon.svg',
]) {
  const full = path.join(ROOT, file);
  if (!existsSync(full)) {
    fail(`${file} fehlt`);
    continue;
  }
  const svg = readFileSync(full, 'utf8');
  // Der Anker hatte einen Kreis plus Querbalken; die Marke ist ein geschlossener
  // Pfad. Fehlt der Pfad oder steht ein `<circle cx=… cy=… r=` drin, ist es alt.
  if (!/<path d="M [\d.]+ [\d.]+ L/.test(svg)) fail(`${file}: kein Pin-Pfad gefunden`);
  if (/<circle[^>]*r="\s*\d+(\.\d+)?"/.test(svg)) fail(`${file}: enthält Kreisformen – alte Marke?`);
}
ok('Favicons tragen den Pin-Pfad');

if (errors === 0) {
  console.log('\nMarke überall einheitlich.');
} else {
  console.error(`\nMarken-Prüfung fehlgeschlagen: ${errors} Fehler`);
  process.exit(1);
}
