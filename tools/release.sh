#!/usr/bin/env bash
# =============================================================================
# wAI — cut a release
# =============================================================================
# Bumps the version everywhere it is duplicated, commits, tags and pushes. The
# tag triggers .github/workflows/android.yml, which builds the signed APK/AAB and
# publishes a GitHub release with checksums.
#
#   bash tools/release.sh patch|minor|major ["optional note"]
#
# Before tagging it runs the full verification suite, so a broken build can never
# become a release.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

BUMP="${1:-patch}"
NOTE="${2:-}"
case "$BUMP" in
  patch|minor|major) ;;
  *) echo "usage: bash tools/release.sh patch|minor|major [note]" >&2; exit 2 ;;
esac

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Working tree is not clean. Commit or stash first." >&2
  git status --short >&2
  exit 1
fi

CURRENT="$(node -p "require('./packages/app/package.json').version")"
IFS=. read -r MAJOR MINOR PATCH <<< "$CURRENT"
case "$BUMP" in
  major) MAJOR=$((MAJOR + 1)); MINOR=0; PATCH=0 ;;
  minor) MINOR=$((MINOR + 1)); PATCH=0 ;;
  patch) PATCH=$((PATCH + 1)) ;;
esac
NEXT="$MAJOR.$MINOR.$PATCH"
VERSION_CODE=$((MAJOR * 10000 + MINOR * 100 + PATCH))

echo "▸ $CURRENT → $NEXT (versionCode $VERSION_CODE)"

echo "▸ verifying (typecheck, tests, render smoke, android checks)"
npm run verify

echo "▸ bumping version strings"
node - "$NEXT" "$VERSION_CODE" <<'NODE'
const fs = require('fs');
const [version, versionCode] = process.argv.slice(2);

const setJson = (file, mutate) => {
  const json = JSON.parse(fs.readFileSync(file, 'utf8'));
  mutate(json);
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + '\n');
};

setJson('packages/app/package.json', (j) => (j.version = version));
setJson('package.json', (j) => (j.version = version));

// Product constant (shown in the app and on the website)
let product = fs.readFileSync('packages/shared/src/product.ts', 'utf8');
product = product.replace(/version: '[^']+',/, `version: '${version}',`);
fs.writeFileSync('packages/shared/src/product.ts', product);

// Android build.gradle: versionCode + versionName
let gradle = fs.readFileSync('packages/app/android/app/build.gradle', 'utf8');
gradle = gradle.replace(/versionCode \d+/, `versionCode ${versionCode}`);
gradle = gradle.replace(/versionName "[^"]+"/, `versionName "${version}"`);
fs.writeFileSync('packages/app/android/app/build.gradle', gradle);

console.log(`  app/package.json, package.json, product.ts, build.gradle → ${version}`);
NODE

git add -A
git -c user.name="${GIT_AUTHOR_NAME:-Arena Agent}" -c user.email="${GIT_AUTHOR_EMAIL:-agent@arena.ai}" \
  commit -q -m "release: v$NEXT"
git tag -a "v$NEXT" -m "wAI $NEXT${NOTE:+ — $NOTE}"
git push origin HEAD
git push origin "v$NEXT"

echo
echo "✔ tagged v$NEXT and pushed."
echo "  The Android workflow now builds the signed APK/AAB and publishes:"
echo "  https://github.com/AndrexTheDev/wAI/releases/tag/v$NEXT"
echo
echo "  Watch it with: gh run watch \$(gh run list --workflow=android.yml --limit 1 --json databaseId -q '.[0].databaseId')"
