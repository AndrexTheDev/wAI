# AGENTS.md — working on wAI

This file is the entry point for any human or AI contributor. Read it before
changing anything; it encodes the constraints that make this product what it is.

## Product in one paragraph

wAI ("Umgebungs-Gedächtnisanker" / environmental memory anchor) is an
offline-first Android app by **AndrexTheDev** (`hippie.highho@gmail.com`) that
helps people find a car, tent, vehicle or object again — in multi-storey car
parks, at festivals, in the forest. One tap stores bearing, distance,
altitude/floor, optional photo (with view direction), voice note, note and
category. Later it guides back multimodally: compass arrow, floor beam,
breadcrumb trail, photo matching and proximity feedback. No account, no cloud,
no analytics, no subscription.

## Non-negotiable constraints

1. **Offline first.** Every core feature — anchors, guidance, sharing, licence
   activation — must work with no network at all. Never add a runtime request.
2. **Local-only data.** No server, no account, no telemetry. Android auto-backup
   stays disabled (`data_extraction_rules.xml`).
3. **Bilingual by construction.** German and English are equal citizens. A
   missing translation must fail the build, not fall back silently. German is
   written first and must sound native, not translated.
4. **Honest accuracy.** Never claim precision the sensors cannot deliver. Show
   the error margin, show the sensor mode, offer calibration hints.
5. **No safety guarantee.** Bearing, altitude, direction and trail data are aids
   only. This must be stated in the app, the store text and the legal pages.
6. **Non-blocking paywall.** Every Pro gate keeps the free flow working
   ("later", "archive instead", single view). Never a dead end.
7. **Wallets are canonical.** The three addresses live in exactly one place
   (`packages/shared/src/product.ts`) and are rendered everywhere from there.
   Never copy an address into a component.
8. **Crypto is non-custodial.** Direct payment to the vendor wallets, no
   processor, no custody, no "credits" system.

## Repository map

```
packages/shared   domain core: geo, engine, codec, licence, i18n, legal texts
packages/app      React app + Capacitor Android shell (android/ is real)
packages/landing  marketing site, legal pages, embedded app demo at /app/
tools             licence CLI, one-shot build, issuer keys (private = git-ignored)
docs              concept, design system, marketing, store texts, runbooks
```

`packages/app` and `packages/landing` both import `@wai/shared` via the source
alias, so there is no build step or version skew between them.

## Toolchain — read `docs/TOOLCHAIN.md` first

Everything repeatable is wrapped. Do not rebuild or rediscover tooling:

```bash
npm run doctor     # what works in THIS environment (no side effects)
npm run status     # version, size, release state, open launch items
npm run wai -- help   # (equivalent) node tools/wai.mjs help
```

**Build the APK only when it is actually required** — i.e. when native config
(`capacitor.config.ts`, plugins), anything under `packages/app/android/`, or the
version number changed. UI/text/logic changes are covered by `npm run verify`.
The APK is produced by GitHub Actions (`npm run ci:android`), not after every
change: this sandbox has no JDK/SDK by design.

## Commands

```bash
npm install
npm run dev:app            # app in a browser, port 5174
npm run dev:landing        # site, port 5173
npm run typecheck          # tsc for all three packages
npm test                   # 28 unit tests (geo, engine, codec, licence)
npm run smoke              # SSR render checks + dictionary completeness
npm run verify             # typecheck + test + smoke — run before every commit
npm run build              # app → landing/public/app → landing dist
```

## Working rhythm

1. `npm run doctor` when the environment is unknown.
2. Change code, then `npm run verify` (15 s, no JDK needed).
3. `npm run build` only when the website/demo output matters.
4. `npm run ci:android` only for native/version changes; `npm run ci:logs` if red.
5. `bash tools/release.sh patch` to ship.

## Conventions

- TypeScript strict, no `any` in new code. Prefer narrow types in `shared`.
- Doc comments explain *why*, especially for sensor physics and legal wording.
- CSS lives in `packages/app/src/styles/app.css` (app) and
  `packages/landing/src/styles/*` (site); use the existing tokens, do not invent
  colours.
- Icons are hand-built in `packages/app/src/ui/icons.tsx` — no icon fonts, no
  remote assets, no webfonts (CSP and offline promise).
- Never nest interactive elements (the anchor card is deliberately split into
  `.anchor-card__tap` plus a sibling distance button).
- New UI strings go into **both** `i18n/de.ts` and `i18n/en.ts` in the same
  commit; `npm run smoke` enforces key parity.
- New legal content is a `LegalDocument` in `packages/shared/src/legal/` with
  `de` and `en` content and a bumped `version`.
- Nothing that generates network traffic, fonts, maps, analytics or ad SDKs.

## Testing expectations

- Pure logic (geo math, plan limits, codec, licence) → unit test in
  `packages/shared/src/test/`.
- Anything that renders → make sure `npm run smoke` still passes; it renders the
  landing routes and the app shell in both languages and catches missing keys.
- There is no browser in the sandbox: do not attempt Playwright/Puppeteer
  screenshots. Verify with `tsc`, `vite build` and the SSR smoke tests.

## Things that will bite you

- `@noble/ed25519` v3 needs `ed.hashes.sha512 = sha512` before sync sign/verify.
- Node's `globalThis.navigator` is getter-only — use `Object.defineProperty` in
  `testEnv.ts` shims.
- Raw `tsx` cannot import `.css`; run render tests through Vite SSR
  (`scripts/smoke.mjs` → `server.ssrLoadModule`).
- The DE dictionary is `as const`; EN is typed as `Widen<GermanDictionary>`. Do
  not remove that, or every string widens to `string` and key parity checks die.
- Store hydration must stay **synchronous** (`loadInitialState()` via
  `useReducer` initialiser) or the SSR smoke test only sees the loading state.
- Capacitor 8 rejects `bundledWebRuntime` and `enableLocationEnhancements`.
- Legal text and UI must agree; when you change one (e.g. withdrawal rights),
  update the other in the same commit.

## Release

See `docs/BUILD_AND_RELEASE.md`. Short version: `npm run verify`, `cap:sync`,
`./gradlew assembleRelease`, verify the signature, test offline on a real device,
bump `versionCode`.

## Legal

The legal texts are drafts. Any commercial launch requires review by a lawyer for
the actual jurisdiction — see `docs/LEGAL_REVIEW.md` for the open questions.
