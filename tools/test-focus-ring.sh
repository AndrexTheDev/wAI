#!/usr/bin/env bash
# Regression check: the real browser run must fail when an editor ring disappears.
set -euo pipefail
cd "$(dirname "$0")/.."
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
printf '%s\n' '.sheet .field__textarea:focus-visible { outline: none !important; box-shadow: none !important; }' > "$tmp/no-ring.css"
if node tools/check-focus-ring.mjs --theme dark --css "$tmp/no-ring.css" > "$tmp/out.log" 2>&1; then
  echo 'Focus negative test unexpectedly passed' >&2
  exit 1
fi
if ! grep -q 'dark/Editor: field__textarea' "$tmp/out.log"; then
  cat "$tmp/out.log" >&2
  echo 'Focus check failed for the wrong reason' >&2
  exit 1
fi
echo '✔ Missing editor textarea ring is detected.'
