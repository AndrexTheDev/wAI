#!/usr/bin/env node
/**
 * Production build orchestration.
 *
 *   node tools/build-all.mjs [--skip-smoke]
 *
 * 1. Render-smoke-tests the app (dictionary completeness + SSR render).
 * 2. Builds the app bundle (Capacitor web assets).
 * 3. Copies it into the landing page's public/app folder so the "demo" route
 *    serves the *real* app offline, from the same origin.
 * 4. Builds the landing page into dist/ with legal pages and assets.
 * 5. Prints an artifact summary and, when a keystore is configured, the Gradle
 *    commands needed to produce the signed APK/AAB.
 */
import { execSync } from 'node:child_process';
import { cp, mkdir, readdir, rm, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const APP = path.join(ROOT, 'packages/app');
const LANDING = path.join(ROOT, 'packages/landing');
const skipSmoke = process.argv.includes('--skip-smoke');

const run = (command, cwd) => {
  console.log(`\n$ ${command}   (${path.relative(ROOT, cwd) || '.'})`);
  execSync(command, { cwd, stdio: 'inherit' });
};

async function dirSize(dir) {
  let total = 0;
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) total += await dirSize(full);
    else total += (await stat(full)).size;
  }
  return total;
}

const kb = (bytes) => `${(bytes / 1024).toFixed(0)} kB`;

if (!skipSmoke) {
  run('node scripts/smoke.mjs', APP);
}

run('npm run build', APP);

// Ship the built app inside the landing page so /app/ works offline.
const demoDir = path.join(LANDING, 'public/app');
await rm(demoDir, { recursive: true, force: true });
await mkdir(demoDir, { recursive: true });
await cp(path.join(APP, 'dist'), demoDir, { recursive: true });
console.log(`\n✔ copied app build → ${path.relative(ROOT, demoDir)}`);

run('npm run build', LANDING);

// Copy the demo build into the final landing output as well (Vite copies
// public/ automatically, but we verify it landed).
const finalDemo = path.join(LANDING, 'dist/app');
if (!existsSync(finalDemo)) {
  await cp(demoDir, finalDemo, { recursive: true });
}

const appSize = await dirSize(path.join(APP, 'dist'));
const landingSize = await dirSize(path.join(LANDING, 'dist'));

console.log('\n──────────────────────────────────────────────');
console.log(' wAI build summary');
console.log('──────────────────────────────────────────────');
console.log(` app bundle     : ${kb(appSize)}  → packages/app/dist`);
console.log(` landing + demo : ${kb(landingSize)}  → packages/landing/dist`);
console.log(` demo route     : /app/ (served from the same origin, works offline)`);
console.log(' legal pages    : /legal/{disclaimer,terms,withdrawal,privacy,imprint,crypto-guide}');
console.log('──────────────────────────────────────────────');
console.log('\nNext steps for the Android artifact:');
console.log('  cd packages/app');
console.log('  npm run cap:sync          # copy web assets + plugins into android/');
console.log('  cd android && ./gradlew assembleDebug      # debug APK');
console.log('  cd android && ./gradlew bundleRelease      # signed AAB (needs keystore)');
console.log('\nKeystore setup (never commit the file):');
console.log('  keytool -genkeypair -v -keystore ~/.wai/wai-release.jks -alias wai \\');
console.log('          -keyalg RSA -keysize 4096 -validity 10000');
console.log('  export WAI_KEYSTORE_PATH=~/.wai/wai-release.jks');
console.log('  export WAI_KEYSTORE_PASSWORD=…  WAI_KEY_ALIAS=wai  WAI_KEY_PASSWORD=…');
