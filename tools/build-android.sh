#!/usr/bin/env bash
# =============================================================================
# wAI — complete local/CI delivery build
# =============================================================================
# Produces:
#   packages/app/android/app/build/outputs/apk/release/app-release.apk
#   packages/app/android/app/build/outputs/bundle/release/app-release.aab
#   dist-release/wai-<version>.apk          (store-ready copy)
#   dist-release/wai-<version>.aab          (store-ready copy)
#   dist-release/SHA256SUMS.txt
#   dist-release/build-info.json
#
# Requires: Node 22+, JDK 21, Android SDK 36 (ANDROID_HOME set).
# Signing:  WAI_KEYSTORE_PATH + WAI_KEYSTORE_PASSWORD + WAI_KEY_ALIAS +
#           WAI_KEY_PASSWORD, or run tools/ci-signing.sh first.
#
# Usage: bash tools/build-android.sh [--skip-tests] [--apk-only]
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP="$ROOT/packages/app"
ANDROID="$APP/android"
OUT="$ROOT/dist-release"
VERSION="$(node -p "require('$APP/package.json').version")"
SKIP_TESTS=0
APK_ONLY=0

for arg in "$@"; do
  case "$arg" in
    --skip-tests) SKIP_TESTS=1 ;;
    --apk-only) APK_ONLY=1 ;;
    *) echo "unknown option: $arg" >&2; exit 2 ;;
  esac
done

step() { printf '\n\033[1;35m▶ %s\033[0m\n' "$*"; }
ok()   { printf '\033[32m✔\033[0m %s\n' "$*"; }

step "0/7  environment"
command -v java >/dev/null || { echo "JDK 21 missing" >&2; exit 1; }
java -version 2>&1 | head -1
echo "ANDROID_HOME=${ANDROID_HOME:-<unset>}"
[[ -n "${ANDROID_HOME:-}" ]] || { echo "ANDROID_HOME is not set" >&2; exit 1; }
node --version

step "1/7  dependencies"
cd "$ROOT"
npm ci --no-audit --no-fund

if [[ $SKIP_TESTS -eq 0 ]]; then
  step "2/7  verification (typecheck + unit tests + render smoke)"
  npm run verify
else
  step "2/7  verification skipped (--skip-tests)"
fi

step "3/7  web assets → android/"
cd "$APP"
npm run cap:sync

step "4/7  gradle release build"
cd "$ANDROID"
./gradlew --no-daemon clean assembleRelease
if [[ $APK_ONLY -eq 0 ]]; then
  ./gradlew --no-daemon bundleRelease
fi

step "5/7  verify signature & manifest"
APK="$ANDROID/app/build/outputs/apk/release/app-release.apk"
[[ -f "$APK" ]] || { echo "APK missing: $APK" >&2; exit 1; }
BT="$(ls -d "$ANDROID_HOME"/build-tools/* 2>/dev/null | sort -V | tail -1)"
"$BT/apksigner" verify --print-certs "$APK" | sed -n '1,6p'
"$BT/aapt2" dump badging "$APK" | grep -E "^package:|^sdkVersion|^targetSdkVersion|^application-label" || true

step "6/7  collect artifacts"
mkdir -p "$OUT"
cp "$APK" "$OUT/wai-$VERSION.apk"
if [[ $APK_ONLY -eq 0 ]]; then
  cp "$ANDROID/app/build/outputs/bundle/release/app-release.aab" "$OUT/wai-$VERSION.aab"
fi
cd "$OUT"
sha256sum ./*.apk ./*.aab > SHA256SUMS.txt 2>/dev/null || sha256sum ./*.apk > SHA256SUMS.txt
node -e "
const fs = require('fs');
const info = {
  product: 'wAI',
  version: '$VERSION',
  buildTime: new Date().toISOString(),
  commit: process.env.GITHUB_SHA || null,
  ref: process.env.GITHUB_REF_NAME || null,
  runId: process.env.GITHUB_RUN_ID || null,
  signingMode: process.env.WAI_SIGNING_MODE || 'local',
  packageId: 'dev.andrexthedev.wai',
  minSdk: 26,
  targetSdk: 36,
  artifacts: fs.readdirSync('.').filter((f) => /\.(apk|aab)$/.test(f)),
};
fs.writeFileSync('build-info.json', JSON.stringify(info, null, 2) + '\n');
console.log(JSON.stringify(info, null, 2));
"

step "7/7  done"
ls -lh "$OUT"
printf '\nAPK ready: %s\n' "$OUT/wai-$VERSION.apk"
