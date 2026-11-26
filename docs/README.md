# wAI — Documentation

Everything needed to build, sell, ship and defend wAI. German is the primary
market language; most documents carry an English summary, the legal texts and
store listings are fully bilingual.

| Document | What it answers | DE | EN |
|---|---|---|---|
| [TOOLCHAIN.md](TOOLCHAIN.md) | **Start here:** all commands, environments, when to build an APK, quirks | ✔ | ✔ summary |
| [PRODUCT_CONCEPT.md](PRODUCT_CONCEPT.md) | Vision, personas, USP, feature spec, sensor research, roadmap, KPIs | ✔ | ✔ summary |
| [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) | Colour, type, components, motion, accessibility rules | ✔ | ✔ summary |
| [MARKETING_STRATEGY.md](MARKETING_STRATEGY.md) | Positioning, audiences, 90-day launch plan, channels, content, KPIs | ✔ | ✔ summary |
| [STORE_LISTING.md](STORE_LISTING.md) | Play Store texts, screenshot plan, ASO, review replies, press kit | ✔ | ✔ |
| [LICENSING.md](LICENSING.md) | Crypto checkout, licence issuing, support & refund runbook, bookkeeping | ✔ | ✔ summary |
| [CI_CD.md](CI_CD.md) | GitHub Actions: workflows, signing secrets, releases, Pages, troubleshooting | ✔ | ✔ summary |
| [BUILD_AND_RELEASE.md](BUILD_AND_RELEASE.md) | Toolchain, signing, release checklist, distribution, troubleshooting | ✔ | ✔ |
| [LEGAL_REVIEW.md](LEGAL_REVIEW.md) | Exactly what a lawyer must confirm before launch + what is already done | ✔ | ✔ |
| [DELIVERY_SUMMARY.md](DELIVERY_SUMMARY.md) | What was delivered, how it was verified, what remains before launch | ✔ | ✔ summary |
| [ROADMAP.md](ROADMAP.md) | **Completeness audit** of every promise with evidence, plus the phased roadmap to the "perfect parking-spot app" | ✔ | ✔ summary |
| [SHARE_LINKS.md](SHARE_LINKS.md) | Shared-anchor links: format, why the payload sits in the fragment, preview page, app intake, how to test | ✔ | ✔ |

Legal texts themselves live in code so they render identically in the app, on the
website and in any export: `packages/shared/src/legal/`
(terms, withdrawal, privacy, disclaimer, imprint, crypto guide).

## Reading order for a new contributor

1. `docs/TOOLCHAIN.md` — run `npm run doctor` and `npm run status`; never rebuild tooling.
2. `AGENTS.md` at the repository root — the constraints that must not break.
3. `docs/PRODUCT_CONCEPT.md` — what the product is and why.
4. `docs/DESIGN_SYSTEM.md` — how it looks and feels.
5. `docs/CI_CD.md` — how the APK is built and released.

## Reading order for a launch

1. `docs/LEGAL_REVIEW.md` — resolve the open points first, they block everything.
2. `docs/BUILD_AND_RELEASE.md` — signed APK and store assets.
3. `docs/STORE_LISTING.md` — the listing itself.
4. `docs/MARKETING_STRATEGY.md` — the 90-day plan.
5. `docs/LICENSING.md` — support and payments while the first orders arrive.
