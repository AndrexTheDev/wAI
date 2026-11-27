#!/usr/bin/env node
/**
 * Static checks for the Android project – runs in CI *before* Gradle, so a
 * broken resource fails in seconds instead of after a full build.
 *
 * Catches the mistakes that actually happened or are easy to make:
 *   - XML that does not parse (e.g. "--" inside a comment, unescaped &)
 *   - a manifest/theme/string referenced but not defined
 *   - launcher icons or splash screens missing for a density
 *   - permissions that contradict the product promise (ads, tracking, backup)
 *   - i18n drift between res/values, res/values-de and res/values-en
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const RES = path.join(ROOT, 'packages/app/android/app/src/main/res');
const MANIFEST = path.join(ROOT, 'packages/app/android/app/src/main/AndroidManifest.xml');

let errors = 0;
let warnings = 0;
const fail = (msg) => {
  errors += 1;
  console.error(`  ✖ ${msg}`);
};
const warn = (msg) => {
  warnings += 1;
  console.warn(`  ! ${msg}`);
};
const ok = (msg) => console.log(`  ✔ ${msg}`);

// ── 1. XML well-formedness ───────────────────────────────────────────────────
function collectXml(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collectXml(full, out);
    else if (entry.name.endsWith('.xml')) out.push(full);
  }
  return out;
}

console.log('XML well-formedness');
const xmlFiles = [...collectXml(RES), MANIFEST];

/**
 * Minimal but strict XML sanity check. The Android manifest merger is stricter
 * than most parsers: "-" may not appear inside "<!-- ... -->" at all.
 */
function checkXml(file) {
  const text = readFileSync(file, 'utf8');
  const commentRe = /<!--([\s\S]*?)-->/g;
  let match;
  while ((match = commentRe.exec(text)) !== null) {
    if (match[1].includes('--')) {
      const line = text.slice(0, match.index).split('\n').length;
      fail(`${path.relative(ROOT, file)}:${line} contains "--" inside an XML comment (illegal, breaks AAPT)`);
    }
  }
  // Unbalanced comment markers
  const opens = (text.match(/<!--/g) ?? []).length;
  const closes = (text.match(/-->/g) ?? []).length;
  if (opens !== closes) fail(`${path.relative(ROOT, file)} has ${opens} comment starts but ${closes} ends`);

  // Bare "&" outside of entities
  const bareAmp = text.match(/&(?!(?:[a-zA-Z][a-zA-Z0-9]*|#\d+|#x[0-9a-fA-F]+);)/g);
  if (bareAmp) fail(`${path.relative(ROOT, file)} contains ${bareAmp.length} unescaped "&"`);

  // Very small tag balance check (ignores self-closing and declarations)
  const stack = [];
  const tagRe = /<(\/?)([A-Za-z][\w:.-]*)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>/g;
  let tag;
  while ((tag = tagRe.exec(text)) !== null) {
    const [, closing, name, , selfClosing] = tag;
    if (selfClosing === '/' || name.startsWith('?') || name.startsWith('!')) continue;
    if (closing === '/') {
      const last = stack.pop();
      if (last !== name) {
        fail(`${path.relative(ROOT, file)}: closing </${name}> does not match <${last ?? 'nothing'}>`);
        return;
      }
    } else {
      stack.push(name);
    }
  }
  if (stack.length) fail(`${path.relative(ROOT, file)} has unclosed tags: ${stack.join(', ')}`);
}

for (const file of xmlFiles) checkXml(file);
if (errors === 0) ok(`${xmlFiles.length} XML files are well-formed`);

// ── 2. Referenced resources exist ───────────────────────────────────────────
console.log('\nResource references');
const manifest = readFileSync(MANIFEST, 'utf8');
const refs = [...manifest.matchAll(/@(mipmap|drawable|style|xml|string|color|integer)\/([\w.]+)/g)];

// Index everything the resource system can resolve, by resource type.
const known = {
  mipmap: new Set(),
  drawable: new Set(),
  style: new Set(),
  xml: new Set(),
  string: new Set(),
  color: new Set(),
};
for (const file of xmlFiles.filter((f) => f.startsWith(RES))) {
  const dir = path.basename(path.dirname(file)); // e.g. values-de, mipmap-hdpi
  const type = dir.split('-')[0];
  const text = readFileSync(file, 'utf8');
  // Values files declare types inside: <string name>, <style name>, <color name>
  for (const [, kind, name] of text.matchAll(/<(string|style|color|integer|bool|dimen)\s+name="([\w.]+)"/g)) {
    if (kind === 'integer' || kind === 'bool' || kind === 'dimen') continue;
    known[kind]?.add(name);
  }
  // File based resources: <type>-<qualifier>/<name>.xml
  if (type !== 'values' && known[type]) known[type].add(path.basename(file, '.xml'));
}
for (const entry of readdirSync(RES, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  for (const f of readdirSync(path.join(RES, entry.name))) {
    if (!/\.(png|webp|jpg)$/.test(f)) continue;
    const type = entry.name.split('-')[0];
    known[type]?.add(f.replace(/\.(png|webp|jpg)$/, ''));
  }
}
for (const [, kind, name] of refs) {
  if (!known[kind]?.has(name)) fail(`manifest references @${kind}/${name} which does not exist`);
}
if (errors === 0) ok(`all ${refs.length} manifest resource references resolve`);

// ── 3. Icon and splash coverage ─────────────────────────────────────────────
console.log('\nLauncher icons & splash screens');
const densities = ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi'];
for (const density of densities) {
  for (const name of ['ic_launcher.png', 'ic_launcher_round.png', 'ic_launcher_foreground.png', 'ic_launcher_monochrome.png']) {
    const file = path.join(RES, `mipmap-${density}`, name);
    if (!existsSync(file)) fail(`missing mipmap-${density}/${name}`);
    else if (statSync(file).size < 200) fail(`mipmap-${density}/${name} looks empty (${statSync(file).size} bytes)`);
  }
}
/**
 * Eine leere oder fast leere Icon-Datei ist der Fehler, der am längsten unbemerkt
 * bleibt: das Symbol ist dann auf dem Gerät unsichtbar, aber Größe und Endung
 * stimmen. Deshalb wird hier die **Deckung** gemessen, nicht nur die Dateigröße.
 * Gemessen mit ImageMagick, weil ein PNG-Decoder in einem Prüfskript zu viel
 * Angriffsfläche wäre.
 */
function coverage(file) {
  /**
   * Anteil deckender Pixel. Die mittlere Deckung wäre das falsche Maß: das
   * Launcher-Icon hat runde, also transparente Ecken und läge damit unter jeder
   * sinnvollen Schwelle. Ein leeres Symbol hat trotzdem ~0 % deckende Fläche.
   */
  try {
    const out = execFileSync('convert', [file, '-alpha', 'extract', '-threshold', '50%', '-format', '%[fx:mean]', 'info:'], {
      encoding: 'utf8',
    });
    return Number(out.trim());
  } catch {
    return null; // ImageMagick fehlt – dann nur die Größenprüfung.
  }
}
for (const density of densities) {
  for (const name of ['ic_launcher.png', 'ic_launcher_foreground.png', 'ic_launcher_monochrome.png']) {
    const file = path.join(RES, `mipmap-${density}`, name);
    if (!existsSync(file)) continue; // Fehlen wird oben schon gemeldet
    const visible = coverage(file);
    if (visible !== null && visible < 0.04) {
      fail(`mipmap-${density}/${name} is (nearly) empty – ${(visible * 100).toFixed(1)} % opaque`);
    }
  }
}
for (const orientation of ['port', 'land']) {
  for (const density of densities) {
    const file = path.join(RES, `drawable-${orientation}-${density}`, 'splash.png');
    if (!existsSync(file)) fail(`missing drawable-${orientation}-${density}/splash.png`);
  }
}
if (!existsSync(path.join(RES, 'mipmap-anydpi-v26/ic_launcher.xml'))) {
  fail('missing adaptive icon mipmap-anydpi-v26/ic_launcher.xml');
}
if (!existsSync(path.join(RES, 'drawable/ic_stat_anchor.xml'))) {
  fail('missing notification icon drawable/ic_stat_anchor.xml');
}
if (errors === 0) ok('icons, adaptive icon, notification icon and splash screens complete');

// ── 4. Product-promise permissions ──────────────────────────────────────────
console.log('\nPermission policy');
const forbidden = [
  'com.google.android.gms.permission.AD_ID',
  'android.permission.ACCESS_BACKGROUND_LOCATION',
  'android.permission.READ_CONTACTS',
  'android.permission.READ_CALENDAR',
  'android.permission.REQUEST_INSTALL_PACKAGES',
];
for (const perm of forbidden) {
  if (manifest.includes(perm)) fail(`forbidden permission present: ${perm} (contradicts the privacy promise)`);
}
if (!manifest.includes('android:allowBackup="false"')) fail('allowBackup must be false (local-only data)');
if (!manifest.includes('android:usesCleartextTraffic="false"')) fail('usesCleartextTraffic must be false');
if (!manifest.includes('POST_NOTIFICATIONS')) warn('POST_NOTIFICATIONS missing – parking reminders will not work on Android 13+');
if (errors === 0) ok('no tracking/background/contacts permissions, backup disabled, cleartext blocked');

// ── 5. String parity between locales ───────────────────────────────────────
console.log('\nString resources DE/EN');
const readStrings = (dir) => {
  const file = path.join(RES, dir, 'strings.xml');
  if (!existsSync(file)) return null;
  const text = readFileSync(file, 'utf8');
  // Strings marked translatable="false" are intentionally identical in every
  // locale, so they are excluded from the parity check.
  const entries = [...text.matchAll(/<string name="([\w.]+)"([^>]*)>([\s\S]*?)<\/string>/g)]
    .filter((m) => !/translatable="false"/.test(m[2]))
    .map((m) => [m[1], m[3]]);
  return new Map(entries);
};
const base = readStrings('values');
const de = readStrings('values-de');
const en = readStrings('values-en');
if (!base) fail('res/values/strings.xml missing');
else {
  for (const locale of [
    ['de', de],
    ['en', en],
  ]) {
    const [code, map] = locale;
    if (!map) {
      fail(`res/values-${code}/strings.xml missing`);
      continue;
    }
    for (const key of map.keys()) {
      if (!base.has(key)) fail(`values-${code} defines "${key}" which is not in the default values/strings.xml`);
    }
    for (const key of base.keys()) {
      if (!map.has(key)) warn(`values-${code} does not translate "${key}" (falls back to default)`);
    }
  }
  ok(`string resources: ${base.size} default, ${de?.size ?? 0} de, ${en?.size ?? 0} en`);
}

// ── 6. Gradle sanity ───────────────────────────────────────────────────────
console.log('\nGradle configuration');
const gradle = (p) => readFileSync(path.join(ROOT, 'packages/app/android', p), 'utf8');
const variables = gradle('variables.gradle');
if (!/compileSdkVersion = 36/.test(variables)) warn('compileSdkVersion is not 36');
if (!/targetSdkVersion = 36/.test(variables)) warn('targetSdkVersion is not 36');
if (!/minSdkVersion = 26/.test(variables)) warn('minSdkVersion is not 26');
const appGradle = gradle('app/build.gradle');
if (!appGradle.includes('applicationId "dev.andrexthedev.wai"')) fail('unexpected applicationId');
if (!appGradle.includes('WAI_KEYSTORE_PATH')) warn('release signing does not read WAI_KEYSTORE_PATH');
if (!appGradle.includes('resourceConfigurations')) warn('no resourceConfigurations – APK will contain all locales');
ok('gradle configuration looks consistent');

// ── Result ─────────────────────────────────────────────────────────────────
console.log('');
if (errors > 0) {
  console.error(`Android asset checks failed: ${errors} error(s), ${warnings} warning(s)`);
  process.exit(1);
}
console.log(`Android asset checks passed (${warnings} warning(s))`);
