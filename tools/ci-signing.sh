#!/usr/bin/env bash
# =============================================================================
# wAI — CI signing setup (deterministic, no secrets in git)
# =============================================================================
# Called by GitHub Actions before Gradle runs. Creates a keystore from the
# WAI_KEYSTORE_BASE64 secret, or a throwaway debug-style keystore for pull
# requests / preview builds, and exports the WAI_* variables read by
# app/build.gradle.
#
# Local use (optional):
#   WAI_KEYSTORE_BASE64="$(base64 -w0 ~/.wai/wai-release.jks)" bash tools/ci-signing.sh
#
# Exit codes: 0 = signing configured, 1 = unexpected failure.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORK="${RUNNER_TEMP:-/tmp}/wai-signing"
mkdir -p "$WORK"

log() { printf '\033[36m[signing]\033[0m %s\n' "$*"; }

if [[ -n "${WAI_KEYSTORE_BASE64:-}" ]]; then
  KEYSTORE="$WORK/wai-release.jks"
  printf '%s' "$WAI_KEYSTORE_BASE64" | base64 --decode > "$KEYSTORE" 2>/dev/null \
    || printf '%s' "$WAI_KEYSTORE_BASE64" | base64 -D > "$KEYSTORE"
  log "wrote release keystore ($(wc -c < "$KEYSTORE") bytes)"
  export WAI_KEYSTORE_PATH="$KEYSTORE"
  export WAI_KEYSTORE_PASSWORD="${WAI_KEYSTORE_PASSWORD:?WAI_KEYSTORE_PASSWORD is required when WAI_KEYSTORE_BASE64 is set}"
  export WAI_KEY_ALIAS="${WAI_KEY_ALIAS:-wai}"
  export WAI_KEY_PASSWORD="${WAI_KEY_PASSWORD:-$WAI_KEYSTORE_PASSWORD}"
  SIGNING_MODE="release"
else
  # Throwaway key for CI verification builds. Never used for distribution.
  KEYSTORE="$WORK/wai-unsigned-preview.jks"
  STOREPASS="wai-preview-only"
  rm -f "$KEYSTORE"
  keytool -genkeypair -v \
    -keystore "$KEYSTORE" \
    -alias wai \
    -keyalg RSA -keysize 2048 -validity 365 \
    -storepass "$STOREPASS" -keypass "$STOREPASS" \
    -dname "CN=wAI preview, OU=CI, O=AndrexTheDev, L=Madrid, C=ES" >/dev/null 2>&1
  log "no WAI_KEYSTORE_BASE64 secret – generated throwaway preview key"
  export WAI_KEYSTORE_PATH="$KEYSTORE"
  export WAI_KEYSTORE_PASSWORD="$STOREPASS"
  export WAI_KEY_ALIAS="wai"
  export WAI_KEY_PASSWORD="$STOREPASS"
  SIGNING_MODE="preview"
fi

# Persist for subsequent steps (GitHub Actions: append to $GITHUB_ENV).
if [[ -n "${GITHUB_ENV:-}" ]]; then
  {
    echo "WAI_KEYSTORE_PATH=$WAI_KEYSTORE_PATH"
    echo "WAI_KEYSTORE_PASSWORD=$WAI_KEYSTORE_PASSWORD"
    echo "WAI_KEY_ALIAS=$WAI_KEY_ALIAS"
    echo "WAI_KEY_PASSWORD=$WAI_KEY_PASSWORD"
    echo "WAI_SIGNING_MODE=$SIGNING_MODE"
  } >> "$GITHUB_ENV"
fi

log "signing mode: $SIGNING_MODE  alias: $WAI_KEY_ALIAS  keystore: $WAI_KEYSTORE_PATH"
