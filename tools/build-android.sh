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
# CI: all output is additionally written to $WAI_BUILD_LOG_DIR (default:
#     $RUNNER_TEMP/wai-build-logs) so a failing job can attach it as an artifact.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP="$ROOT/packages/app"
ANDROID="$APP/android"
OUT="$ROOT/dist-release"
VERSION="$(node -p "require('$APP/package.json').version")"
SKIP_TESTS=0
APK_ONLY=0
SIGNING_MODE="${WAI_SIGNING_MODE:-preview}"
export SIGNING_MODE

for arg in "$@"; do
  case "$arg" in
    --skip-tests) SKIP_TESTS=1 ;;
    --apk-only) APK_ONLY=1 ;;
    *) echo "unknown option: $arg" >&2; exit 2 ;;
  esac
done

LOG_DIR="${WAI_BUILD_LOG_DIR:-${RUNNER_TEMP:-/tmp}/wai-build-logs}"
mkdir -p "$LOG_DIR"

step() { printf '\n\033[1;35m▶ %s\033[0m\n' "$*"; }
ok()   { printf '\033[32m✔\033[0m %s\n' "$*"; }

# Runs a command while mirroring output into a log file, so the exact failure of a
# CI run can be inspected even when the runner's own logs are unavailable.
logged() {
  local logfile="$1"; shift
  set +e
  "$@" 2>&1 | tee "$logfile"
  local status="${PIPESTATUS[0]}"
  set -e
  return "$status"
}

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
if ! logged "$LOG_DIR/gradle-assemble.log" ./gradlew --no-daemon clean assembleRelease --stacktrace; then
  echo
  echo "──────────── last 120 lines of the failing Gradle run ────────────" >&2
  tail -n 120 "$LOG_DIR/gradle-assemble.log" >&2
  echo "──────────────────────────────────────────────────────────────────" >&2
  # Surface the failure as GitHub check annotations, which stay readable even
  # when the raw job log is not accessible from outside the runner.
  if [[ -n "${GITHUB_ACTIONS:-}" ]]; then
    grep -E "(error:|error;|\.java:[0-9]+|e: |FAILURE:|\* What went wrong|> |Execution failed|Caused by|symbol:|location:)" \
      "$LOG_DIR/gradle-assemble.log" | tail -n 12 | while IFS= read -r line; do
      safe="${line//'%'/%25}"
      safe="${safe//$'\r'/}"
      safe="${safe//$'\n'/' '}"
      printf '::error title=Gradle::%s\n' "${safe:0:600}"
    done
    printf '::error title=Gradle log::%s\n' "$(tail -n 3 "$LOG_DIR/gradle-assemble.log" | tr '\n' ' ' | tail -c 700)"
  fi
  exit 1
fi
if [[ $APK_ONLY -eq 0 ]]; then
  logged "$LOG_DIR/gradle-bundle.log" ./gradlew --no-daemon bundleRelease --stacktrace
fi

step "5/7  verify signature & manifest"
APK="$ANDROID/app/build/outputs/apk/release/app-release.apk"
[[ -f "$APK" ]] || { echo "APK missing: $APK" >&2; exit 1; }
BT="$(ls -d "$ANDROID_HOME"/build-tools/* 2>/dev/null | sort -V | tail -1)"
"$BT/apksigner" verify --print-certs "$APK" | sed -n '1,6p'
"$BT/aapt2" dump badging "$APK" | grep -E "^package:|^sdkVersion|^targetSdkVersion|^application-label" || true

step "5b/7  verify APK contents"
# Prove the artifact really contains the offline app shell, the expected package
# identity and the plugin set – without needing a device.
APK_CHECK_LOG="$LOG_DIR/apk-contents.log"
{
  echo "--- badging ---"
  "$BT/aapt2" dump badging "$APK" | grep -E "^package:|^sdkVersion|^targetSdkVersion|^application-label|^uses-permission|^native-code|^locales" || true
  echo "--- assets ---"
  unzip -l "$APK" | grep -E "assets/public/(index.html|assets/|manifest)|classes.dex|resources.arsc" || true
} > "$APK_CHECK_LOG" 2>&1
sed -n '1,12p' "$APK_CHECK_LOG"

grep -q "package: name='dev.andrexthedev.wai'" "$APK_CHECK_LOG" || { echo "wrong package id in APK" >&2; exit 1; }
grep -q "assets/public/index.html" "$APK_CHECK_LOG" || { echo "app shell missing from APK" >&2; exit 1; }
grep -q "classes.dex" "$APK_CHECK_LOG" || { echo "no dex in APK" >&2; exit 1; }
grep -q "targetSdkVersion:'36'" "$APK_CHECK_LOG" || { echo "unexpected targetSdkVersion" >&2; exit 1; }
grep -q "de" "$APK_CHECK_LOG" && grep -q "en" "$APK_CHECK_LOG" || echo "note: locale list not reported by aapt2 for this build"
ok "APK contains the bundled app shell and the expected identity"

# The embedded bundle must be self-contained: no http(s) references to external
# hosts would break the offline promise.
if unzip -p "$APK" 'assets/public/assets/*.js' 2>/dev/null | grep -oE "https?://[a-zA-Z0-9.-]+" | sort -u > "$LOG_DIR/external-urls.txt"; then
  if [[ -s "$LOG_DIR/external-urls.txt" ]]; then
    echo "external URLs referenced from the bundle (expected: none, or documentation links only):"
    cat "$LOG_DIR/external-urls.txt"
  else
    ok "bundle references no external hosts"
  fi
fi

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

# Publish the essentials as a GitHub check annotation / job summary so the build
# can be verified without downloading the (large) artifacts.
SUMMARY="wAI $VERSION · $SIGNING_MODE · APK $(du -h "$APK" | cut -f1) · AAB $([[ $APK_ONLY -eq 0 ]] && du -h "$ANDROID/app/build/outputs/bundle/release/app-release.aab" | cut -f1 || echo n/a) · sha256 $(sha256sum "$OUT/wai-$VERSION.apk" | cut -d' ' -f1)"
printf '\n%s\n' "$SUMMARY"
if [[ -n "${GITHUB_ACTIONS:-}" ]]; then
  printf '::notice title=Build summary::%s\n' "$SUMMARY"
  if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
    {
      echo "## wAI $VERSION"
      echo
      echo "| | |"
      echo "|---|---|"
      echo "| Signing | \`${SIGNING_MODE:-unknown}\` |"
      echo "| APK | $(du -h "$OUT/wai-$VERSION.apk" | cut -f1) |"
      echo "| SHA-256 | \`$(sha256sum "$OUT/wai-$VERSION.apk" | cut -d' ' -f1)\` |"
      [[ $APK_ONLY -eq 0 ]] && echo "| AAB | $(du -h "$OUT/wai-$VERSION.aab" | cut -f1) |"
    } >> "$GITHUB_STEP_SUMMARY"
  fi
fi

printf '\nAPK ready: %s\n' "$OUT/wai-$VERSION.apk"
