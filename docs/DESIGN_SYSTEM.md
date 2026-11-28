# wAI — Design System

One visual language for the Android app and the landing page. Tokens live in
`packages/app/src/styles/app.css` and `packages/landing/src/styles/tokens.css`;
they are intentionally the same values.

---

## 1. Principles

1. **Dark first.** The product is used in basements and at night.
2. **One loud element per screen.** Gradient = action, everything else recedes.
3. **Thumb zone.** Primary actions in the lower third; sheets instead of new pages.
4. **Honest signals.** Accuracy, sensor mode and errors are always visible.
5. **Calm motion.** 160–240 ms, one easing curve, `prefers-reduced-motion` honoured.

## 2. Colour

| Token | Dark | Light | Night | Use |
|---|---|---|---|---|
| `--bg` | `#070b14` | `#f4f7fb` | `#05070b` | App background |
| `--bg-1` | `#0b1220` | `#ffffff` | `#0a0c10` | Cards, sheets |
| `--bg-2` | `#111a2b` | `#eef2f8` | `#12161c` | Nested surfaces |
| `--text` | `#eaf0fb` | `#0b1220` | `#f0c8b0` | Primary text |
| `--text-2` | `#b7c3d6` | `#3d4a5c` | `#c79b83` | Secondary text |
| `--text-3` | `#8494aa` | `#63718a` | `#9b7a68` | Meta, captions |
| `--mint` | `#6ee7b7` | `#077452` | `#ffb08a` | Success, primary accent |
| `--sky` | `#38bdf8` | `#0369a1` | `#ff9560` | Info, compass needle |
| `--violet` | `#a78bfa` | `#7c3aed` | `#d98a6a` | Pro accent |
| `--amber` | `#fbbf24` | `#a04a08` | `#ffb347` | Timer, warnings |
| `--danger` | `#f87171` | `#b91c1c` | `#ff7a6a` | Destructive, sensor error |

Light-mode accent values are **not** the dark ones scaled: in the app and on the
website these tokens are *text* (status chips, links, the compass readout), and
the pale dark-mode hues only reach 1.6–3.9:1 on `#f4f7fb`. The values above are
measured, not chosen by eye — `npm run check:contrast` fails the build otherwise.

**Gradient** `linear-gradient(120deg, #6ee7b7, #38bdf8 50%, #a78bfa)` — the aurora
mark. Only for the primary CTA, the logo and the FAB. Never for body text.

Where the aurora *is* used as text (`.gradient-text`, the hero statistics) it
goes through its own token, `--grad-aurora-text`: the same three hues, dark
enough for 4.5:1 on a light background. Clipping a fill to text and then reusing
the dark-mode gradient on `#f6f8fc` made "1 Tipp · 0 Byte · 0 €" 1.4:1 — present
in the DOM, invisible on screen.

**Night mode** deliberately shifts to red/orange (`hue ≈ 20–30°`) because red light
preserves dark adaptation. Contrast stays ≥ 4.5:1 for text.

Contrast: all body text ≥ 4.5:1, large text ≥ 3:1, focus rings ≥ 3:1 against both
the surface and the surrounding background.

Focus rings have their own rules, because a ring can be correct in the palette
and still invisible on screen:

- **The ring is `--mint`**, except on chips, where mint would read as "selected"
  (a focused chip and a chosen chip looked identical in the parking timer). Chips
  use `--text-3` — 4.6–6.4:1 in all five themes. `--border-2`, the obvious quiet
  choice, is 1.40–1.64:1 and was invisible in night mode.
- **A border changing colour is not a focus ring.** The form fields had
  `outline: none` and only recoloured their 1 px border, in place and in a form
  with eight fields. They now get a real `outline: 2px` on `:focus-visible`, and
  the borderless search input puts its ring on its surround (`:focus-within`,
  `outline-offset: -2px`).
- **Never `transition: all` on anything focusable.** In `.chip`, `.category-btn`,
  `.segmented button` and `.anchor-card__timer` it animated the ring itself: it
  grew from 0 to 2 px over 130 ms, so it was invisible at the moment it mattered.
  List the three properties that actually change.

`tools/check-focus-ring.mjs` walks the keyboard path (`Tab`, not `.focus()` —
`:focus-visible` only applies to real keyboard focus), reads the ring colour from
the rendered element and computes it against the backdrop *next to* it, in all
three themes. It runs in the same workflow as the tap-target check.

This is checked, not asserted: `npm run check:contrast`
(`tools/check-contrast.mjs`) reads the tokens straight out of the two CSS files
and computes 77 pairs across the five themes — body/secondary/meta text on the
page and on a card, every accent, every accent again on its own 10 % chip tint,
and the gradient text sampled at 20 points between each stop. The check is part
of `npm run verify` and of CI.

Three bugs it found that review had not: `--danger`, `--amber` and
`--grad-aurora-text` were missing from light (and `--amber` from night), so the
light theme silently inherited the dark values — 1.4:1 to 2.6:1, i.e. text that
is there but cannot be read. **A missing token is not an error in CSS; it is an
inheritance.** Only a check that reads the palette per theme catches it.

## 3. Typography

| Role | Size / line-height | Weight | Token |
|---|---|---|---|
| Display | 34/38 | 700 | `.display` |
| H1 | 26/32 | 700 | `h1` |
| H2 | 20/26 | 600 | `h2` |
| H3 | 17/22 | 600 | `h3` |
| Body | 15/22 | 400 | `body` |
| Small | 13/18 | 400 | `.small` |
| Micro / label | 11/14, `letter-spacing: .06em`, uppercase | 600 | `.label` |
| Mono (codes, distances) | 13/18 | 500 | `--mono` |

System font stack only — no webfont downloads, which keeps the offline promise and
removes a privacy question. Numerals use `font-variant-numeric: tabular-nums` in
counters and distances so they do not jitter.

## 4. Space, radius, elevation

- Spacing scale: `4, 8, 12, 16, 20, 24, 32, 40, 56` px.
- Radii: `12` (inputs), `16` (`--radius`, cards), `22` (`--radius-lg`, sheets),
  `999` (pills).
- Elevation is expressed with borders plus a soft shadow, not heavy drop shadows:
  `0 12px 32px rgba(0,0,0,.35)` on sheets, `0 1px 0 rgba(255,255,255,.05)` inset
  highlight on cards.
- Tap targets ≥ 44×44 px. Small-looking controls get their 44 px hit area from
  a transparent `::after`, **not** from padding: the controls sit in flex rows
  with 2–6 px gaps, and 3 px of extra padding per side would push the row apart
  at 320 dp. The pattern is one rule for `.icon-btn`, `.chip`, `.switch` and
  `.segmented button`; anything smaller than 44 px must be documented, and
  `tools/check-tap-targets.mjs` fails the build if it is not.

  The exception is a row of buttons 6 px apart where several would need the
  area: an enlarged target that covers its neighbour is worse than a small one,
  so `.btn--xs` in those rows keeps its size. Everywhere else the *box* grew —
  `.btn--sm` 36 → 44, the search field 42 → 46, the sort select 30 → 44.

  Measured, not assumed: the hit area is probed with `elementFromPoint` in half
  pixels outwards from each edge, because a 38 px button is supposed to have an
  invisible 44 px area. `getBoundingClientRect()` cannot see that, and neither
  could any reviewer.

## 4b. Breakpoints

The website is measured, not estimated: `tools/check-responsive.mjs` loads every
route at fifteen widths from 320 to 1440 px and fails if any page is wider than
the screen. Three ranges are special because the header has to fit six nav links,
the language switch and the Pro button:

| Range | What changes | Why |
|---|---|---|
| ≤ 600 px | The header drops the subtitle "Environmental Memory Anchor" | Brand with subtitle + language switch + Pro button + menu = 368 px, more than a 360 dp phone |
| ≤ 420 px | The Pro button moves into the mobile menu only | Even without the subtitle the row needs 8 px more than 320–412 dp offers; the button is in the menu anyway |
| 941–1179 px | Nav links get tighter padding and 0.82 rem, Pro button gets smaller | Content needs 1175 px; on a 1024 px tablet the page could be dragged 127 px sideways |
| ≥ 1180 px | Everything at full size | The header's natural width |

Two rules that came out of measuring:

- **`1fr` is not a fix for a wide child.** `grid-template-columns: 1fr` means
  `minmax(auto, 1fr)`, so the column grows to the widest child — one `1fr` in
  `.download__panel` pushed the page 70 px wider than a 320 dp screen. Use
  `minmax(0, 1fr)` and let the content wrap.
- **`overflow-x: hidden` on `body` hides the symptom, not the cause.** It removes
  the scrollbar, but the page still moves sideways and a blank strip appears.
  Decoration that leaves its box (`translate3d`, `rotate`, `inset: -10%`) needs a
  clipping parent with `overflow-x: clip` on the *section*, not on the body.

Long German compounds must fit even without hyphenation: `hyphens: auto` only
works where a dictionary is installed (not every Linux Chromium has one), so
headings are sized to fit at 320 px without breaking.

## 5. Components

### Buttons

| Variant | Look | Use |
|---|---|---|
| `btn--primary` | gradient fill, dark text | one per screen |
| `btn--ghost` | border, transparent | secondary actions |
| `btn--quiet` | text only | tertiary, cancel |
| `btn--danger` | danger border/text | delete |
| `btn--sm` / `--lg` / `--block` | size / full width | — |

Disabled: 40 % opacity, `cursor: not-allowed`, no hover lift.

### Anchor card

Two-part layout: a full-width tap target (`.anchor-card__tap`) that opens the
editor, and a sibling distance chip that jumps straight to the find view. Badges
(photo, voice, trail, favourite) sit in the right column. Never nest interactive
elements — the card was explicitly refactored to avoid nested `<button>`s.

### Bottom sheet

Rounded top corners, drag handle, `max-height: 92dvh`, internal scroll, sticky
footer with the primary action. Always closable by backdrop tap, X, and Escape.

### Status strip

Compact row under the header: GPS state, accuracy in ±m, heading quality, demo
badge, and any sensor error. Colour-coded but never colour-only — each state has
an icon and a word.

### Compass dial

Dial with tick marks every 30°, cardinal labels, and a needle that rotates with
`--heading`. The target arrow rotates by the *relative* bearing so the phone
orientation cancels out. When accuracy is poor the ring turns amber and a
"calibrate" hint appears.

### Toast

Bottom, above the tab bar, 3.5 s, one line, optional action. Never used for errors
that need a decision.

### Wallet accordion

Per chain: name, address in mono (wrapped, selectable), copy button with
"copied" confirmation, QR toggle, "open in wallet" deep link, explorer link, and a
collapsible purchase guide. Network-fee and irreversibility notes are rendered
inline, not hidden in legal text.

## 6. Iconography

Hand-built 24×24 SVG set in `packages/app/src/ui/icons.tsx` — single stroke, 1.75
width, round caps, `currentColor`. No icon font, no sprite download. The anchor
mark (circle + stem + flukes) is the brand glyph and the launcher icon.

## 7. Motion

| Interaction | Duration | Easing |
|---|---|---|
| Button press | 120 ms | `ease-out` |
| Sheet enter | 220 ms | `cubic-bezier(.22,.8,.28,1)` |
| Sheet exit | 160 ms | `ease-in` |
| View switch | 200 ms | `cubic-bezier(.22,.8,.28,1)` |
| Toast | 160 ms in / 200 ms out | `ease-out`/`ease-in` |

`@media (prefers-reduced-motion: reduce)` removes transforms and keeps opacity
fades only. The compass needle uses `transform` only (composited, no layout).

## 8. Accessibility

- Semantic landmarks: `header`, `main`, `nav`, `footer`, plus `aria-live` regions
  for status and toasts.
- Every icon-only control has an `aria-label` in the active language.
- Focus is never trapped except in modals; modals restore focus on close.
- `lang` attribute is set on `<html>` and updated on language switch.
- Distance and heading are mirrored into text (`"42 m · 20° rechts"`), so the
  compass is not the only channel.
- Text scales with browser/OS font size. Every font size in
  `packages/app/src/styles/app.css` is in `rem` against a **10 px root** — so
  `1.5rem` is the familiar 15 px, and a user's 200 % setting really doubles it.
  Before this rule existed the file held 93 font sizes, all in `px`, so the app
  ignored the system setting completely while this document claimed otherwise.
  Three exceptions are capped with `min()`: the four tab labels
  (`min(0.95rem, 14px)`) because four words share one row, and
  `.topbar__sub`, which wraps instead of shrinking.
- Colour is never the sole carrier of meaning.

## 9. Content rules

- German first, then English in the same tone register: direct, warm, no hype.
- Use "du" in German, "you" in English.
- Numbers with units and a space: `38 m`, `1,4 km` (DE comma) / `1.4 km` (EN).
- Never claim precision. Words like "ca." / "about" are required in estimates.
- No exclamation marks in error messages; state what happened and what to do.

## English summary

Text scales with the system setting: all app font sizes are in `rem` against a
10 px root, so 200 % is genuinely twice as large. The tab bar sizes its four
columns to their labels instead of dividing the width into quarters, which is
what keeps "Einstellungen" readable at 200 % on a 320 dp screen.

Responsive: every route is measured at fifteen widths from 320 to 1440 px
(`tools/check-responsive.mjs`); the header sheds its subtitle below 600 px and the
Pro button below 420 px, tightens between 941 and 1179 px, and long German words
are sized to fit without relying on hyphenation dictionaries.

Dark-first, honest, thumb-friendly design across app and website. Identical tokens:
aurora gradient (`#6ee7b7 → #38bdf8 → #a78bfa`) reserved for the single primary
action, mint = success, sky = compass, violet = Pro, amber = time, danger = sensor
trouble. Night mode shifts to warm reds to protect night vision. System font stack
only (no downloads, no privacy question). Two-part anchor cards avoid nested
buttons. Components: primary/ghost/quiet/danger buttons, bottom sheets with sticky
footers, status strip with icon+word states, compass dial with relative bearing,
3.5 s toasts, and an inline wallet accordion that shows network fees and
irreversibility up front. Motion 120–240 ms on one easing curve, fully disabled
under `prefers-reduced-motion`. Accessibility: semantic landmarks, live regions,
labelled icon buttons, focus management, mirrored text for every visual signal,
rem-based scaling and 4.5:1 contrast minimum.
