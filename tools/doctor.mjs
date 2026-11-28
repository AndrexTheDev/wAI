#!/usr/bin/env node
/**
 * wAI — toolchain doctor
 *
 *   node tools/doctor.mjs
 *
 * Answers one question: "what can I actually run in this environment, and what
 * is the next useful step?" It never changes anything, so it is safe to run at
 * the start of every session and cheap enough to run often.
 *
 * Exit code is 0 unless a *required* piece for the requested task is missing.
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { ISSUER_PUBLIC_KEY } from '../packages/shared/src/license-key.ts';
import { validateIssuer } from './release-safety.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const wantAndroid = args.includes('--android');

const ok = (label, detail = '') => console.log(`  \x1b[32m✔\x1b[0m ${label}${detail ? ` — ${detail}` : ''}`);
const no = (label, detail = '') => console.log(`  \x1b[31m✖\x1b[0m ${label}${detail ? ` — ${detail}` : ''}`);
const warn = (label, detail = '') => console.log(`  \x1b[33m!\x1b[0m ${label}${detail ? ` — ${detail}` : ''}`);
const head = (text) => console.log(`\n\x1b[1m${text}\x1b[0m`);

const run = (cmd, cmdArgs = []) => {
  try {
    return execFileSync(cmd, cmdArgs, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  } catch (error) {
    // Many tools (java, gh) write their version info to stderr and exit non-zero.
    const out = `${error.stdout ?? ''}${error.stderr ?? ''}`.trim();
    return out || null;
  }
};

const pkg = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const appPkg = JSON.parse(readFileSync(path.join(ROOT, 'packages/app/package.json'), 'utf8'));
let missing = 0;

head('Node / dependencies');
const nodeMajor = Number(process.versions.node.split('.')[0]);
nodeMajor >= 22 ? ok('node', process.versions.node) : no('node', `${process.versions.node} (need ≥ 22)`);
existsSync(path.join(ROOT, 'node_modules'))
  ? ok('node_modules present')
  : (no('node_modules missing', 'run: npm ci'), (missing += 1));
existsSync(path.join(ROOT, 'node_modules/@capacitor/cli'))
  ? ok('capacitor cli')
  : warn('capacitor cli missing');

head('Android toolchain (only needed for APK builds)');
const javaHome = process.env.JAVA_HOME;
const javaVersion = run('java', ['-version']);
if (javaVersion) {
  const line = javaVersion.split('\n')[0];
  /(2[1-9])/.test(line) ? ok('java', line) : warn('java', `${line} (Gradle needs 21+)`);
} else {
  no('java not found', 'APK builds must run in GitHub Actions or on a machine with JDK 21');
}
const sdk = process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT;
if (sdk && existsSync(sdk)) {
  const platforms = existsSync(path.join(sdk, 'platforms')) ? readdir(path.join(sdk, 'platforms')) : [];
  ok('ANDROID_HOME', sdk);
  platforms.includes('android-36')
    ? ok('platform android-36')
    : warn('platform android-36 missing', `found: ${platforms.join(', ') || 'none'}`);
} else {
  no('ANDROID_HOME not set', 'local Gradle builds unavailable');
}
existsSync(path.join(ROOT, 'packages/app/android/gradlew'))
  ? ok('gradle wrapper committed')
  : no('gradle wrapper missing');
const keystore = process.env.WAI_KEYSTORE_PATH ?? path.join(process.env.HOME ?? '', '.wai/wai-release.jks');
existsSync(keystore)
  ? ok('release keystore', keystore)
  : warn('no release keystore', 'run: bash tools/make-keystore.sh (needed for distributable APKs)');

head('Repository state');
ok('version', `${appPkg.version} (root ${pkg.version})`);
const gradle = readFileSync(path.join(ROOT, 'packages/app/android/app/build.gradle'), 'utf8');
const versionCode = gradle.match(/versionCode (\d+)/)?.[1];
const versionName = gradle.match(/versionName "([^"]+)"/)?.[1];
versionName === appPkg.version
  ? ok('gradle versionName matches package.json', versionName)
  : warn('gradle versionName differs', `${versionName} vs ${appPkg.version} (run tools/release.sh)`);
ok('gradle versionCode', versionCode);
existsSync(path.join(ROOT, 'packages/app/dist/index.html'))
  ? ok('app web build present', 'packages/app/dist')
  : warn('no app web build', 'run: npm run build:app (only needed before cap sync)');
existsSync(path.join(ROOT, 'packages/landing/dist/index.html'))
  ? ok('landing build present')
  : warn('no landing build', 'run: npm run build:landing');
const issuer = path.join(ROOT, 'tools/keys/issuer.private.json');
existsSync(issuer)
  ? warn('issuer private key file present (git-ignored)', 'presence alone does not establish safety, ownership or matching public key')
  : warn('issuer private key missing', 'see docs/LAUNCH_CHECKLIST.md before generating or replacing keys');
try {
  validateIssuer(ISSUER_PUBLIC_KEY);
  ok('embedded issuer key is not on the known-compromised list', 'still verify the key pair and backups');
} catch {
  warn('embedded issuer key blocked', 'see docs/LAUNCH_CHECKLIST.md');
}

head('GitHub');
// `gh auth status` writes to stderr and may exit 0 with empty stdout, so the
// reliable probe is an actual API call.
const ghUser = run('gh', ['api', 'user', '--jq', '.login']);
ghUser ? ok('gh authenticated', `as ${ghUser}`) : warn('gh not authenticated', 'push/PR/release automation unavailable');
const remote = run('git', ['-C', ROOT, 'remote', 'get-url', 'origin']);
ok('origin', remote ?? 'none');

head('Next step');
if (wantAndroid) {
  const ready = Boolean(javaVersion) && Boolean(sdk) && existsSync(path.join(sdk ?? '', 'platforms/android-36'));
  if (ready) {
    ok('local Android build possible', 'bash tools/build-android.sh --apk-only');
  } else {
    console.log('  Local Android build not possible here. Use GitHub Actions:');
    console.log('    gh workflow run android.yml --ref main -f release=false');
    console.log('  Nothing else in the deliverable is blocked by this.');
  }
} else {
  console.log('  Web work:      npm run dev:app  /  npm run dev:landing');
  console.log('  Verify changes:npm run verify           (typecheck + tests + smoke + android checks)');
  console.log('  Ship website:  npm run build            (app demo + landing page)');
  console.log('  Ship APK:      git tag v1.0.1 && git push --tags   (CI builds + releases)');
}

function readdir(dir) {
  try {
    return execFileSync('ls', [dir], { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

if (missing > 0) {
  console.log(`\n${missing} required piece(s) missing.`);
  process.exit(1);
}
