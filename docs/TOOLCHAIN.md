# wAI — Toolchain (start here)

One page that tells any future session (human or AI) exactly what tooling exists,
what it needs, and when to use it. **Nothing in this repository has to be
rebuilt to find out how it works** — run `npm run doctor` and `npm run status`.

---

## 1. The two commands you always start with

```bash
npm run doctor     # what works in THIS environment (no side effects, 1 s)
npm run status     # version, code size, release state, open launch items
```

`doctor` never changes anything. It prints a checklist (Node, dependencies, JDK,
Android SDK, keystore, issuer key, gh auth) and then a concrete "next step".

## 2. Command map

| Need | Command | Needs | Time |
|---|---|---|---|
| Understand the environment | `npm run doctor` | nothing | 1 s |
| Project status + open items | `npm run status` | nothing | 2 s |
| Develop UI | `npm run dev:app` (5174) / `npm run dev:landing` (5173) | nothing | instant |
| Check a change | `npm run verify` | nothing | ~15 s |
| Build website + embedded demo | `npm run build` | nothing | ~13 s |
| Build APK locally | `npm run build:android` | **JDK 21 + SDK 36** | 3–5 min |
| Build APK via CI | `npm run ci:android` | gh auth | 3–5 min |
| See what CI did | `npm run ci:status` / `npm run ci:logs` | gh auth | 2 s |
| Cut a release | `bash tools/release.sh patch` | gh auth | 5 min |
| Create the upload key | `npm run keystore` | JDK (keytool) | 1 min |
| Check the Play listing | `npm run check:store` | nothing | 1 s |
| Regenerate icons (all sizes) | `node tools/make-icons.mjs` | ImageMagick | 12 s |
| Regenerate store graphics | `bash tools/make-store-assets.sh` | ImageMagick + DejaVu | 2 s |
| Capture store screenshots | `npm run screenshots` | Playwright + Chromium or a device | 1 min |
| Check the site fits every screen | `npm run check:responsive -- --url http://127.0.0.1:4173` | Playwright + Chromium, `npm run preview` running | 2 min |
| Issue a Pro licence | `npm run license:issue -- --sub …` | issuer key | instant |

`npm run verify` = typecheck (3 packages) → 72 unit tests → render smoke test
(both locales, every route) → Android asset checks. It is the gate before any
commit and the only thing needed for 95 % of changes. It does **not** look at
layout on a real screen – that is `npm run check:responsive`, which needs a
browser and a running server, so it lives in CI (`responsive.yml`).

## 3. What lives where

```
tools/
  wai.mjs                 ← single entry point (status, verify, ci:*, release, …)
  doctor.mjs              ← environment probe, never mutates anything
  build-all.mjs           ← app demo → landing page → dist (used by CI + `npm run build`)
  build-android.sh        ← full APK/AAB delivery build (verify → cap sync → gradle → checks)
  ci-signing.sh           ← keystore from secret, or throwaway key for previews
  make-keystore.sh        ← creates the upload keystore + prints the secrets to set
  release.sh              ← bump version everywhere → tag → push → CI builds
  check-android-assets.mjs← XML, icons, permissions, DE/EN parity, gradle sanity
  license-cli.mjs         ← keygen / issue / verify / mail for Pro licences
  check-store-listing.mjs ← Play limits + DE/EN parity + product consistency
  check-claims.mjs        ← jeder Marketing-Claim muss im Code gedeckt sein (docs/ROADMAP.md)
  build-map-pack.mjs      ← OpenStreetMap → Offline-Kartenkacheln (public/map/<slug>)
  make-icons.mjs          ← App-Zeichen: Launcher (5 Dichten), Store-Icon, Splash, Favicon aus einer Geometrie
  make-store-assets.sh    ← Feature-Grafik aus dem erzeugten Icon
  capture-store-screenshots.mjs ← real screenshots, refuses to fake them
  check-responsive.mjs    ← misst jede Route bei 15 Breiten auf seitlichen Überlauf
  keys/                   ← issuer key pair (private key is git-ignored)
.github/workflows/
  ci.yml                  ← every push/PR: verify + web build
  android.yml             ← main/arena/**/tags: signed APK + AAB + release
  pages.yml               ← main: website deploy (skips until Pages is enabled)
  responsive.yml          ← landing changes: no route may be wider than its screen
```

## 4. When to build the APK (important)

The APK is **not** built after every change. It is expensive (Gradle, SDK) and
usually irrelevant, because the app IS the web bundle plus a thin native shell.

| Change | Needed |
|---|---|
| UI, text, logic, styles, legal texts | `npm run verify` (+ `npm run build` if shipping the site) |
| `capacitor.config.ts`, `package.json` plugin versions | `npm run ci:android` once |
| `android/` (manifest, Java, icons, gradle) | `npm run ci:android` once |
| version bump / new release | `bash tools/release.sh patch` (builds + publishes) |

So: build the APK **only** when native config, Android source or a version number
changed — roughly once per release, not once per request.

## 5. Environments

**This development sandbox (Arena):** Node 22, npm workspaces, gh CLI
authenticated as `AndrexTheDev`. **No JDK, no Android SDK.** Therefore:
APK builds run on GitHub Actions, and the sandbox verifies everything else
(typecheck, tests, render smoke, android asset checks, web builds, Pages deploy).
Never attempt to install a JDK here — it is not persisted between sessions.

**GitHub Actions (ubuntu-latest):** has JDK 21 and Android SDK 36 preinstalled;
`android.yml` only installs missing SDK packages, then builds.

**Your own machine:** install JDK 21 + Android SDK 36 (Platform 36, Build-Tools
36.0.0), set `ANDROID_HOME`, then `npm run build:android` works identically.

## 6. Signing state

| Item | Where | Status |
|---|---|---|
| Upload keystore | `~/.wai/wai-release.jks` (never in git) | **you must create it**: `npm run keystore` |
| `WAI_KEYSTORE_BASE64` | repo secret | **you must set it** |
| `WAI_KEYSTORE_PASSWORD`, `WAI_KEY_ALIAS`, `WAI_KEY_PASSWORD` | repo secrets | **you must set them** |
| Until then | CI uses a throwaway key | artifacts are labelled **"preview build"** |

## 7. Known environment quirks (saves an hour)

- `gh run view --log` and artifact/release-asset downloads are blocked from the
  sandbox (CDN hosts). Use `npm run ci:logs`, which reads **check-run
  annotations**; `build-android.sh` mirrors Gradle failures into them on purpose.
- Creating repo secrets and enabling Pages is **not permitted** for the sandbox
  token (HTTP 403). Both are one-click tasks in the GitHub UI.
- `tsx` cannot import `.css`; render tests run through Vite SSR (`scripts/smoke.mjs`).
- Capacitor 8 rejects `bundledWebRuntime` and `enableLocationEnhancements`; the
  Android `Bridge` has **no** `getWebChromeClient()`.
- `--` inside an XML comment breaks the Android manifest merger. Caught by
  `npm run check:android`.
- **`python3 -m http.server` is not a suitable server for the landing page:** it
  answers `/legal/privacy` with 404, so an SPA deep link looks broken. Use
  `npm run preview -w @wai/landing` (port 4173); that is also what
  `check-responsive.mjs` needs.
- **Chromium in this sandbox has no German hyphenation dictionary**
  (`hyphens: auto` does nothing). Layouts must therefore work without word
  breaking; long German compounds were the cause of two overflows.

## 8. Adding a new tool

1. Put the implementation in `tools/` (Node or bash, documented header).
2. Register it in `tools/wai.mjs` **and** as an npm script if it is user-facing.
3. Mention it in the table in section 2 of this file.

That keeps the entry points stable no matter how many tools accumulate.

---

## English summary

`npm run doctor` reports what the current environment can actually do;
`npm run status` reports version, size, release state and open launch items.
`tools/wai.mjs` is the single entry point for every repeatable task (verify, build
web, local android, ci:android, ci:status, ci:logs, release, keystore). The APK is
built only when native config, Android sources or the version change — normally
once per release via CI, never after every change. This sandbox deliberately has
no JDK/SDK, so APK builds run on GitHub Actions; everything else is verified
locally. Known quirks (blocked log downloads, no secret/Pages permissions, XML
comment rules, missing Capacitor API) are documented so they are never rediscovered.
