# wAI — Store-Paket (Google Play)

Alles, was für einen Play-Store-Eintrag gebraucht wird, liegt hier – und wird
geprüft, nicht nur beschrieben.

```
store/
├── listing.json                 ← alle Texte, DE + EN, maschinenlesbar
├── assets/
│   ├── icon-512.png             ← App-Icon 512×512 (aus dem Launcher-Icon erzeugt)
│   └── feature-graphic-1024x500.png
└── screenshots/                 ← vom echten Gerät/Browser, nie erfunden
```

## Assets neu erzeugen

Die Bilder sind reproduzierbar, kein Einmal-Commit:

```bash
bash tools/make-store-assets.sh
```

Erzeugt `icon-512.png` (aus dem echten Launcher-Icon) und
`feature-graphic-1024x500.png` neu. Voraussetzung: ImageMagick + DejaVu-Fonts
(auf Debian/Ubuntu vorhanden).

## Prüfen

```bash
node tools/check-store-listing.mjs
```

Der Check erzwingt:

- Zeichenlimits, die Play hart durchsetzt (Titel 30, Kurzbeschreibung 80,
  Langbeschreibung 4.000, Changelog 500)
- identische Felder in beiden Sprachen
- Preis, Offline-Versprechen, Einmalzahlung und Haftungsausschluss in **beiden**
  Texten (sonst weicht die Werbung vom Produkt ab)
- Kontakt-Mail und Datenschutz-URL in korrekter Form

## Screenshots erzeugen

Screenshots sind das einzige Store-Asset, das **nicht** frei erfunden werden darf:
Play verbietet irreführende Bilder, und ein nachgebautes UI würde das Produkt
falsch darstellen. Deshalb gibt es ein Skript, das die echte App bedient:

```bash
npm run dev:app                              # Terminal 1
npx playwright install chromium              # einmalig
node tools/capture-store-screenshots.mjs     # Terminal 2
```

Es setzt eine plausible Szene (Tiefgarage, Zelt, Trail, Park-Timer), nimmt acht
Bilder in 1080×1920 auf und gibt die Beschriftungen für DE/EN aus. Auf einem echten
Gerät ist es noch besser:

```bash
adb exec-out screencap -p > store/screenshots/01-find.png
```

Fehlt ein Browser oder Gerät, bricht das Skript mit einer Anleitung ab – es
schreibt **keine** Platzhalterbilder. Ein fehlendes Bild ist ehrlich, ein falsches
nicht.

## Die acht Szenen

| Datei | Szene | Beschriftung DE | Beschriftung EN |
|---|---|---|---|
| `01-find` | Kompass, 38 m, „3 Etagen höher“ | In 38 m – 3 Etagen über dir | 38 m away — 3 floors up |
| `02-anchor` | Foto der Säule + Ankerkarte | Säule B17, Ebene 3 | Pillar B17, level 3 |
| `03-list` | sechs Anker, Kategorien | Alle Anker im Blick | Every anchor in view |
| `04-trail` | Brotkrumen-Spur | Dein eigener Weg zurück | Your own way back |
| `05-share` | Teilen-Sheet mit QR | Teilen ohne Server | Share without a server |
| `06-timer` | Park-Timer + Benachrichtigung | Bevor das Ticket abläuft | Before the ticket expires |
| `07-settings` | Einstellungen, Offline/Torch | Ohne Konto. Ohne Cloud. | No account. No cloud. |
| `08-pro` | Free vs. Pro | Einmal zahlen. Für immer. | Pay once. Keep it. |

## Textpflege

`listing.json` ist die einzige Quelle. Wer den Text ändert, ändert ihn dort und
lässt den Check laufen. Die Langtexte stammen aus `docs/STORE_LISTING.md`, damit
Doku und Upload identisch bleiben.

## Was Play zusätzlich abfragt

| Formular | Antwort für wAI |
|---|---|
| Datensicherheit | Keine Erhebung, keine Weitergabe, alles lokal, Löschung in der App |
| Werbe-ID | Nein (nicht im Manifest, keine Analytics) |
| In-App-Käufe | Ja, aber außerhalb von Play Billing → Länderstrategie nötig (siehe `docs/LEGAL_REVIEW.md`) |
| Zielgruppe | 18+ bzw. „Alle“, keine Kinder-App |
| Berechtigungen | Kamera, Mikrofon, Standort, Benachrichtigungen — jeweils Zweck in `docs/STORE_LISTING.md` |
| Inhaltsfreigabe | Alle / USK 0, keine Nutzerinteraktion mit Fremden |

---

## English summary

`store/listing.json` holds all store texts in German and English;
`node tools/check-store-listing.mjs` enforces Play's hard character limits, key
parity between locales, and consistency with the product (price, offline promise,
one-time payment, disclaimer). `store/assets/` contains the 512×512 icon and the
1024×500 feature graphic, both generated from the real app icon.

Screenshots are captured from the real app via
`tools/capture-store-screenshots.mjs` (needs Playwright + Chromium, or a physical
device with `adb screencap`) — the script refuses to write placeholder images,
because a fake UI would misrepresent the product and violate Play policy. Eight
scenes with German and English captions are specified.
