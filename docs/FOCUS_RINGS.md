# Fokusringe

Gemessen mit `tools/check-focus-ring.mjs` bei 412 dp, Theme `dark`: jedes Element wird mit `Tab` erreicht (nicht mit `.focus()`, sonst gilt `:focus-visible` nicht) und der Ring gegen den Grund **daneben** gerechnet.

Zusage (`docs/DESIGN_SYSTEM.md` §2): **≥ 3:1** gegen Fläche und Umgebung.

Geprüft: **24 Stationen** im Tastaturweg (Start + Editor).

Alle 24 Ringe liegen über 3:1.
