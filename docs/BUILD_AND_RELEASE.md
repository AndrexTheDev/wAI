# wAI — Build & Release Runbook

> **Shortcut:** you do not need a local Android toolchain. The GitHub Actions
> pipeline builds a signed APK + AAB on every tag — see [CI_CD.md](CI_CD.md).
> Everything below is for local builds, debugging and understanding the steps.

Everything needed to turn this repository into a signed Android artifact.
Written for a single maintainer on macOS/Linux; Windows works with the same
commands in Git Bash or WSL.

---

## 1. Toolchain

| Tool | Version | Notes |
|---|---|---|
| Node.js | ≥ 22 | `node --version` |
| npm | ≥ 10 | workspaces are used |
| JDK | **21** | required by AGP 8.13; `java -version` must report 21 |
| Android SDK | Platform **36**, Build-Tools 36.x | install via Android Studio or `sdkmanager` |
| Gradle | wrapper (8.14.3) | never install manually |

Environment:

```bash
export ANDROID_HOME="$HOME/Android/Sdk"          # or ~/Library/Android/sdk on macOS
export PATH="$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin"
export JAVA_HOME="$(/usr/libexec/java_home -v 21 2>/dev/null || echo /usr/lib/jvm/java-21-openjdk)"
```

Verify:

```bash
sdkmanager --list_installed | grep -E "platforms;android-36|build-tools;36"
```

If `platforms;android-36` is missing:

```bash
sdkmanager "platforms;android-36" "build-tools;36.0.0" "platform-tools"
yes | sdkmanager --licenses
```

## 2. Web assets

The Android project does **not** contain the UI source. Capacitor copies the
Vite build into `android/app/src/main/assets/public`.

```bash
npm install                       # repo root
npm run verify                    # typecheck + unit tests + render smoke tests
cd packages/app
npm run cap:sync                  # = vite build && cap sync android
```

`cap:sync` also regenerates `android/app/src/main/assets/capacitor.config.json`
and `capacitor.plugins.json` — commit those only if you change plugin versions.

## 3. Debug build

```bash
cd packages/app/android
./gradlew assembleDebug
# → app/build/outputs/apk/debug/app-debug.apk
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

First run downloads Gradle + AGP; expect 3–8 minutes and ~1 GB of disk.

Live logs:

```bash
adb logcat | grep -iE "wai|capacitor|chromium"
```

Debug builds carry the `-debug` version suffix so they can sit next to a release
install. They are signed with the auto-generated debug keystore and **must not be
distributed**.

## 4. Release keystore (once)

```bash
mkdir -p ~/.wai && chmod 700 ~/.wai
keytool -genkeypair -v \
  -keystore ~/.wai/wai-release.jks \
  -alias wai \
  -keyalg RSA -keysize 4096 -validity 10000 \
  -storetype JKS
```

Answer the prompts (name/org can be the brand: `AndrexTheDev`, `wAI`).
**Back up the file and both passwords offline in at least two places.** If the
upload key is lost and Play App Signing is not enabled, you can never update the
app under the same package name again.

`app/build.gradle` reads credentials from the environment, falling back to Gradle
properties, so nothing secret is committed:

```bash
export WAI_KEYSTORE_PATH="$HOME/.wai/wai-release.jks"
export WAI_KEYSTORE_PASSWORD='…'
export WAI_KEY_ALIAS='wai'
export WAI_KEY_PASSWORD='…'
```

Alternatively put them in `~/.gradle/gradle.properties`:

```properties
waiKeystorePath=/home/you/.wai/wai-release.jks
waiKeystorePassword=…
waiKeyAlias=wai
waiKeyPassword=…
```

## 5. Release build

```bash
cd packages/app && npm run cap:sync
cd android

./gradlew clean
./gradlew assembleRelease      # → app/build/outputs/apk/release/app-release.apk
./gradlew bundleRelease        # → app/build/outputs/bundle/release/app-release.aab
```

Verify the signature before shipping:

```bash
$ANDROID_HOME/build-tools/36.0.0/apksigner verify --print-certs \
  app/build/outputs/apk/release/app-release.apk
```

Expect exactly **one** signer, `CN=AndrexTheDev` (or your keystore's DN), and
`v2`/`v3` schemes present.

Check the manifest actually shipped:

```bash
$ANDROID_HOME/build-tools/36.0.0/aapt2 dump badging \
  app/build/outputs/apk/release/app-release.apk | head -20
```

Should report `package: name='dev.andrexthedev.wai' versionCode='1'
versionName='1.0.0'`, `sdkVersion:'26'`, `targetSdkVersion:'36'`, and the
locales `de` and `en`.

## 6. Size and performance checks

Targets for v1.0:

| Metric | Target | How to check |
|---|---|---|
| APK size | < 8 MB | `ls -lh app-release.apk` |
| Cold start (mid-range device) | < 1.6 s | `adb shell am start -W -n dev.andrexthedev.wai/.MainActivity` |
| WebView JS heap after 50 anchors | < 60 MB | Chrome DevTools via `chrome://inspect` |
| Offline start | works with airplane mode on | manual |
| Battery, 30 min in Find screen | < 3 % | `adb shell dumpsys batterystats` |

Nothing at runtime downloads over the network. If you see traffic, something is
wrong — check for a stray font or map import.

## 7. Versioning

`package.json` version is the single source of truth. For a release:

1. Bump `packages/app/package.json` version (semver).
2. Set `versionCode` in `android/app/build.gradle` (integer, always increasing)
   and `versionName` to the same semver string.
3. Update the changelog section in `docs/STORE_LISTING.md`.
4. Re-run `npm run verify && npm run build`.

## 8. Release checklist

- [ ] `npm run verify` green (typecheck, 33 unit tests, 2 render smoke tests)
- [ ] `cap:sync` run after the last source change
- [ ] versionCode/versionName bumped
- [ ] `apksigner verify` shows exactly one signer and v2/v3
- [ ] Installed on a real device, airplane mode on, full flow tested:
      onboarding → anchor → photo → find → share → licence activation
- [ ] Local notification fires (grant `POST_NOTIFICATIONS` on Android 13+)
- [ ] Torch plugin works on a device with a camera flash
- [ ] Both languages render without missing strings
- [ ] Legal pages linked from Settings reachable
- [ ] Wallet addresses copied from the settings screen match the canonical list
- [ ] APK uploaded to the download host, SHA-256 published next to it
      (`sha256sum app-release.apk`)
- [ ] Landing page `/download` links to the new file

## 9. Distribution

**Direct APK (primary).** Publish `wai-1.0.0.apk` plus `SHA256SUMS.txt` and a
short install guide. Android shows "unknown sources" warnings — explain the
sideload flow with screenshots in the download section.

**Google Play (optional).** Upload the AAB. Two policy points to settle first,
both covered in `docs/LEGAL_REVIEW.md`:

1. Google Play Billing for the digital Pro unlock — external payment links are
   only permitted in specific programmes/regions.
2. Declarations: no ads, no analytics, data safety form = "no data collected,
   all data stays on device", permissions rationale for camera, microphone,
   location and notifications.

Play Console needs: app icon 512×512 PNG, feature graphic 1024×500, at least
2 phone screenshots (min 320 px, max 3840 px), short description ≤ 80 chars,
full description ≤ 4000 chars — all in `docs/STORE_LISTING.md`.

**F-Droid.** Would require removing the crypto paywall or shipping a fully free
build; not planned for v1.0 (note it in the FAQ if asked).

## 10. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `Unsupported class file major version` | JDK 17 or older | switch to JDK 21 |
| `SDK location not found` | no `local.properties` | `echo "sdk.dir=$ANDROID_HOME" > local.properties` |
| Blank white WebView | assets not synced | `npm run cap:sync`, then rebuild |
| `usesCleartextTraffic` block | app tries `http://` | never needed; keep CSP strict |
| Notifications silent | channel created with wrong importance | clear app data, re-create channel |
| Compass spins | magnetometer disturbed | move away from metal, calibrate with a figure-8 |
| Gradle out of memory | default heap | `org.gradle.jvmargs=-Xmx3g` in `gradle.properties` |

## English quick reference

```bash
npm install && npm run verify
cd packages/app && npm run cap:sync
cd android && ./gradlew assembleRelease
apksigner verify --print-certs app/build/outputs/apk/release/app-release.apk
```

Keystore: generate once with `keytool`, back it up offline, never commit it;
credentials come from `WAI_*` environment variables. Bump `versionCode` for every
upload. Test offline, test both languages, test notifications and the torch on a
real device before publishing.
