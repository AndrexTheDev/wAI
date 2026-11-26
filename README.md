# wAI — Umgebungs-Gedächtnisanker · Environmental Memory Anchor

> **Nie wieder suchen. Auch dort, wo GPS aufgibt.**
> Android app + bilingual landing page + legal texts + growth kit — all in one monorepo.

wAI is an offline-first Android app that helps you find your car in an underground
car park, your tent at a festival, a trail junction in the forest, or the toolbox in
the shed. Instead of trusting a single sensor, it anchors the **whole environment**:
bearing, distance, elevation/floor, breadcrumb trail, reference photos, voice notes
and your own written hint.

| | |
|---|---|
| **Platform** | Android 8.0+ (API 26), distributed as a signed APK |
| **Stack** | Capacitor 8 + React 19 + TypeScript, shared domain core |
| **Languages** | German & English — app, website, legal texts, marketing |
| **Data** | 100 % local. No account, no server, no cloud, no analytics |
| **Money** | Free tier + one-time Pro licence (€14.99) paid in SOL / BTC / ETH |
| **Developer** | AndrexTheDev · hippie.highho@gmail.com |

---

## Repository layout

```
.
├── packages/
│   ├── shared/          # domain core: geo math, engine, licence, i18n, legal texts
│   ├── app/             # the Android app (React UI + Capacitor native shell)
│   │   └── android/     # real Gradle project, Torch plugin, icons, manifest
│   └── landing/         # marketing site + legal pages + embedded app demo
├── tools/
│   ├── license-cli.mjs  # vendor-side Ed25519 licence signing
│   ├── build-all.mjs    # one-shot production build
│   └── keys/            # issuer key pair (git-ignored private key)
└── docs/                # product, marketing, growth, store texts, runbooks
```

### Why a shared package?

The compass that the landing page demonstrates in your browser is **the same code**
that runs on the phone. `packages/shared` holds:

- `geo.ts` — haversine distance, bearings, local ENU projection, elevation hints,
  Douglas–Peucker trail simplification, dead reckoning.
- `engine.ts` — anchor creation, plan limits, search/sort, proximity tiers,
  parking status, import merging.
- `license.ts` — offline Ed25519 licence issuing/verification.
- `codec.ts` — serverless share codes (`WAIX1.…`).
- `i18n/` — the DE and EN dictionaries, type-checked against each other.
- `legal/` — the structured, bilingual legal documents.

---

## Quick start

> **Toolchain first:** `npm run doctor` tells you what this machine can do,
> `npm run status` shows version, size and open launch items. Details and the
> rule for *when* to build the APK: [docs/TOOLCHAIN.md](docs/TOOLCHAIN.md).

```bash
npm install                      # installs all workspaces

npm run dev:landing              # http://localhost:5173  marketing site
npm run dev:app                  # http://localhost:5174  the app in a browser

npm run doctor                   # environment probe (no side effects)
npm run status                   # version, code size, release state, open items
npm test -w @wai/shared          # 52 unit tests (geo, engine, licence, codec)
npm run smoke:render -w @wai/app # SSR render + dictionary completeness
npm run build                    # builds app → landing demo → landing site
node tools/build-all.mjs         # the same, plus reporting
```

### Building the Android APK

**Recommended: let GitHub Actions do it.** Push a tag and CI produces a signed
APK + AAB with checksums as a GitHub release:

```bash
bash tools/make-keystore.sh     # once: create the upload key, add 4 repo secrets
bash tools/release.sh patch     # verify → bump version → tag → build → release
```

Downloads land on `/releases/latest`. Details: [docs/CI_CD.md](docs/CI_CD.md).

Locally, a JDK 21 and the Android SDK are required; Gradle itself is handled by
the wrapper.

```bash
cd packages/app
npm run cap:sync                 # build web assets + copy into android/
cd android
./gradlew assembleDebug          # → app/build/outputs/apk/debug/app-debug.apk
./gradlew bundleRelease          # signed AAB for the Play Store (needs a keystore)
```

Keystore setup — **never commit the file**:

```bash
keytool -genkeypair -v -keystore ~/.wai/wai-release.jks -alias wai \
        -keyalg RSA -keysize 4096 -validity 10000
export WAI_KEYSTORE_PATH=~/.wai/wai-release.jks
export WAI_KEYSTORE_PASSWORD=…  WAI_KEY_ALIAS=wai  WAI_KEY_PASSWORD=…
```

Full instructions, including APK signing verification and store upload:
[docs/BUILD_AND_RELEASE.md](docs/BUILD_AND_RELEASE.md).

---

## Licensing the Pro version

Pro is unlocked with a **signed, offline licence token**. There is no licence
server, so unlocking works in airplane mode.

```bash
# 1. one-time: create the vendor key pair
node tools/license-cli.mjs keygen

# 2. for every verified payment
node tools/license-cli.mjs issue --sub buyer@example.com --via crypto-sol

# 3. optional: check a token
node tools/license-cli.mjs verify WAI1.…
```

The public key is committed in `packages/shared/src/license-key.ts`; the private
key lives in `tools/keys/issuer.private.json`, is git-ignored and must be backed
up offline. See [docs/LICENSING.md](docs/LICENSING.md) for the full workflow,
including what to do if the key is lost.

Token format:

```
WAI1.<base64url(canonical JSON payload)>.<base64url(ed25519 signature)>
```

---

## Documentation

| Document | Contents |
|---|---|
| [PRODUCT_CONCEPT.md](docs/PRODUCT_CONCEPT.md) | Vision, personas, USP, feature spec, sensor research, UX flows |
| [DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) | Colour, type, components, motion, accessibility |
| [MARKETING_STRATEGY.md](docs/MARKETING_STRATEGY.md) | Positioning, audiences, channels, content calendar, KPIs |
| [STORE_LISTING.md](docs/STORE_LISTING.md) | Play Store texts DE/EN, screenshots plan, ASO keywords |
| [LICENSING.md](docs/LICENSING.md) | Crypto paywall, licence issuing, refund & support runbook |
| [TOOLCHAIN.md](docs/TOOLCHAIN.md) | Every tool, every command, and when an APK build is actually needed |
| [CI_CD.md](docs/CI_CD.md) | GitHub Actions pipelines, signing secrets, release process, Pages |
| [BUILD_AND_RELEASE.md](docs/BUILD_AND_RELEASE.md) | Local toolchain, signing, release checklist |
| [LEGAL_REVIEW.md](docs/LEGAL_REVIEW.md) | What a lawyer must check before going live |
| [DELIVERY_SUMMARY.md](docs/DELIVERY_SUMMARY.md) | What was delivered and what remains before launch |

---

## License

Proprietary. © AndrexTheDev. The legal texts in `packages/shared/src/legal` are
provided as drafts and must be reviewed by a lawyer before commercial use.
