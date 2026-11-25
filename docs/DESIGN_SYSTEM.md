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
| `--mint` | `#6ee7b7` | `#0f9f6e` | `#ffb08a` | Success, primary accent |
| `--sky` | `#38bdf8` | `#0284c7` | `#ff9560` | Info, compass needle |
| `--violet` | `#a78bfa` | `#7c3aed` | `#d98a6a` | Pro accent |
| `--amber` | `#fbbf24` | `#b45309` | `#ffb347` | Timer, warnings |
| `--danger` | `#f87171` | `#dc2626` | `#ff7a6a` | Destructive, sensor error |

**Gradient** `linear-gradient(120deg, #6ee7b7, #38bdf8 50%, #a78bfa)` — the aurora
mark. Only for the primary CTA, the logo and the FAB. Never for body text.

**Night mode** deliberately shifts to red/orange (`hue ≈ 20–30°`) because red light
preserves dark adaptation. Contrast stays ≥ 4.5:1 for text.

Contrast: all body text ≥ 4.5:1, large text ≥ 3:1, focus rings ≥ 3:1 against both
the surface and the surrounding background.

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
- Tap targets ≥ 44×44 px; icon-only buttons get a 44 px hit area via padding.

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
- Text scales with browser/OS font size (all sizes in `rem` inside the app shell).
- Colour is never the sole carrier of meaning.

## 9. Content rules

- German first, then English in the same tone register: direct, warm, no hype.
- Use "du" in German, "you" in English.
- Numbers with units and a space: `38 m`, `1,4 km` (DE comma) / `1.4 km` (EN).
- Never claim precision. Words like "ca." / "about" are required in estimates.
- No exclamation marks in error messages; state what happened and what to do.

## English summary

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
