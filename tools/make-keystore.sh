#!/usr/bin/env bash
# =============================================================================
# wAI — release keystore generator
# =============================================================================
# Creates the upload key used to sign distributed APKs and Play Store AABs, then
# prints the exact values you paste into GitHub → Settings → Secrets and
# variables → Actions.
#
#   bash tools/make-keystore.sh
#
# The keystore stays on your machine (default ~/.wai/wai-release.jks). It is
# NEVER written into the repository and cannot be recovered if lost — back it up
# offline in at least two places before publishing anything.
set -euo pipefail

DEST="${WAI_KEYSTORE_DIR:-$HOME/.wai}"
KEYSTORE="$DEST/wai-release.jks"
ALIAS="${WAI_KEY_ALIAS:-wai}"

bold() { printf '\n\033[1m%s\033[0m\n' "$*"; }
note() { printf '\033[36m%s\033[0m\n' "$*"; }

if ! command -v keytool >/dev/null; then
  echo "keytool not found. Install a JDK 21 (e.g. Temurin) and try again." >&2
  exit 1
fi

if [[ -f "$KEYSTORE" ]]; then
  echo "A keystore already exists at $KEYSTORE"
  read -r -p "Overwrite it? This cannot be undone. [y/N] " reply
  [[ "$reply" =~ ^[Yy]$ ]] || { echo "aborted"; exit 1; }
fi

mkdir -p "$DEST"
chmod 700 "$DEST"

bold "Creating $KEYSTORE"
note "You will be asked for a password and an identity. Suggested identity:"
note "  CN=AndrexTheDev, OU=wAI, O=AndrexTheDev, L=Madrid, C=ES"

keytool -genkeypair -v \
  -keystore "$KEYSTORE" \
  -alias "$ALIAS" \
  -keyalg RSA -keysize 4096 -validity 10000 \
  -storetype PKCS12

chmod 600 "$KEYSTORE"

bold "Verifying"
keytool -list -v -keystore "$KEYSTORE" -alias "$ALIAS" | sed -n '1,12p'

bold "GitHub Actions secrets"
cat <<'INSTRUCTIONS'
Add these four repository secrets (Settings → Secrets and variables → Actions):

  1. WAI_KEYSTORE_BASE64    base64 of the .jks file (command below)
  2. WAI_KEYSTORE_PASSWORD  the store password you just chose
  3. WAI_KEY_ALIAS          the alias (default: wai)
  4. WAI_KEY_PASSWORD       usually identical to the store password

Generate the base64 value with:

  # Linux
  base64 -w0 ~/.wai/wai-release.jks > ~/.wai/keystore.b64
  # macOS
  base64 -i ~/.wai/wai-release.jks -o ~/.wai/keystore.b64

Then paste the (single-line) content of keystore.b64 as WAI_KEYSTORE_BASE64.
On the command line you can also do it in one step with the GitHub CLI:

  gh secret set WAI_KEYSTORE_BASE64  < ~/.wai/keystore.b64
  gh secret set WAI_KEYSTORE_PASSWORD
  gh secret set WAI_KEY_ALIAS --body wai
  gh secret set WAI_KEY_PASSWORD

Without these secrets the workflow still runs and produces a *preview-signed*
APK for testing — it is explicitly marked as not distributable in the release.

INSTRUCTIONS

bold "Backup checklist"
cat <<'BACKUP'
  [ ] Copy ~/.wai/wai-release.jks to an encrypted USB stick / password manager
  [ ] Copy it to a second physical location (different building)
  [ ] Store both passwords separately from the file
  [ ] Write down the alias (wai) and the certificate SHA-256 fingerprint
  [ ] Never commit the .jks or the passwords to git (already git-ignored)

If this key is lost:
  - Google Play App Signing enabled  → upload a new upload key (Play Console)
  - direct APK distribution only     → users must uninstall to install an update
BACKUP

echo
note "Keystore: $KEYSTORE"
