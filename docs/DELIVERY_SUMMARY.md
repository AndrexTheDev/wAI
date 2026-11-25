# wAI — Lieferübersicht / Delivery Summary

Stand: 25.11.2026 · Branch `arena/5f8dd580-wai` · Version 1.0.0
Brand: **AndrexTheDev** · hippie.highho@gmail.com

---

## 1. Was geliefert wurde / What is delivered

### 1.1 Die App (`packages/app`)

| Bereich | Umgesetzt |
|---|---|
| Ein-Tipp-Anker | Sofort gespeichert, Editor optional; Titel, Kategorie, Notiz, Zone, Etage |
| Medien | Foto (Kamera/Galerie) mit Blickrichtung, Sprachnotiz mit Wiedergabe |
| Verwaltung | Mehrere Anker, Suche, Kategorie-Filter, 4 Sortierungen, Favoriten, Archiv |
| Rückführung | Kompasspfeil + Entfernung, Höhen-/Etagen-Lotse, Brotkrumen-Spur (SVG), Foto-/Notiz-Abgleich, 5-stufiges Näher-dran-Feedback (Vibration + Ton) |
| Multi-Ansicht | Kompass + Spur + Umgebungsabgleich gleichzeitig (Pro) |
| Parken | Timer mit lokaler Benachrichtigung, Zonen-/Kostnotiz, Überzieh-Warnung |
| Teilen | `WAIX1`-Code, QR am Gerät erzeugt, Deep-Link, Medienpaket `.waipack.json` (Pro), Import mit Sanitisierung |
| Datenschutz | Export (JSON), Import, „Alle Daten löschen“, Speichergrößenanzeige, Auto-Backup aus |
| Sprachen | DE/EN vollständig, Umschaltung in App + Onboarding, Gerätesprache als Default |
| Themes | Dunkel, Hell, Nacht (rotverschoben), System |
| Extras | Taschenlampe (eigenes natives Torch-Plugin), Sensor-Diagnose, Kalibrierhinweise |

Verifiziert mit `tsc --noEmit`, `vite build`, 28 Unit-Tests und SSR-Render-Smoke-Tests
in beiden Sprachen (578 i18n-Schlüssel, keine fehlenden Keys).

### 1.2 Android-Projekt (`packages/app/android`)

Echtes Gradle-Projekt (AGP 8.13, Gradle 8.14.3, JDK 21, minSdk 26, target 36),
Paket `dev.andrexthedev.wai`. Enthält:

- gehärtetes `AndroidManifest.xml` (Berechtigungen mit Begründung, `allowBackup=false`,
  `usesCleartextTraffic=false`, optionale Hardware-Features)
- `data_extraction_rules.xml` (kein Cloud-Backup, kein Gerätetransfer)
- `TorchPlugin.java` + Registrierung in `MainActivity.java` (WebView-Härtung)
- adaptive Launcher-Icons (alle Dichten) + Splashscreen mit Aurora-Anker
- Notification-Kanal-Strings in DE/EN, Statusleisten-Icon
- Release-Signatur über `WAI_*`-Umgebungsvariablen, ProGuard-Regeln, ABI/Density-Splits

### 1.3 Landingpage (`packages/landing`)

Bilinguale, konversionsorientierte Seite: Value Proposition, interaktiver
Feature-Showcase, Anwendungsfälle (Stadt, Parkhaus, Outdoor, Festivals, Reisen),
Free-vs-Pro-Tabelle, Krypto-Kaufbereich mit QR/Copy/Wallets, FAQ,
Download-/Installationsanleitung, Footer mit allen Rechtstexten.
Unter `/app/` läuft **die echte App** als Demo (gleicher Code, gleiche Origin).

### 1.4 Rechtstexte (`packages/shared/src/legal`)

Jeweils DE+EN, strukturiert, in App und Website identisch gerendert:
Haftungsausschluss, AGB, **Widerrufsbelehrung** (neu, inkl. Musterformular),
Datenschutz, Impressum, Krypto-Kaufanleitung.
Dazu: aktive Consent-Checkbox im Kauf-Flow (nicht vorausgewählt, Zeitpunkt lokal
gespeichert) – ohne Zustimmung werden keine Zahlungswege angezeigt.

### 1.5 Kommerz

- Free vs. Pro (14,99 € einmalig) exakt wie spezifiziert
- Non-custodiale Zahlung an SOL/BTC/ETH mit QR (BIP21/EIP-681/Solana Pay),
  Copy-Buttons, Explorer-Links, Bestellreferenz `WAI-XXXXX`, Mail-Nachweis
- Offline-Lizenzprüfung per Ed25519 (`WAI1.<payload>.<sig>`), CLI zum Ausstellen
- Freiwillige Spenden getrennt vom Kauf, ohne Gegenleistung

### 1.6 Dokumentation (`docs/`)

Produktkonzept, Design-System, Marketing- & Growth-Plan (90 Tage), Store-Texte
DE/EN inkl. Screenshot-Plan und ASO, Lizenz-/Support-Runbook, Build-&-Release-
Runbook, juristische Prüfcheckliste, Lieferübersicht.
`AGENTS.md` hält die nicht verhandelbaren Produktregeln fest.

## 2. Verifikation

```bash
npm run verify   # typecheck (3 Pakete) + 28 Unit-Tests + Render-Smoke-Tests
npm run build    # App → Demo in Landingpage → Landingpage-Dist
```

Ergebnis zuletzt: alle Checks grün; App-Bundle 465 kB (151 kB gzip),
Landingpage inkl. App-Demo 994 kB.

## 3. Was noch fehlt, um live zu gehen

1. **Build-Umgebung**: APK/AAB braucht JDK 21 + Android SDK 36 (hier nicht
   vorhanden). Befehle stehen in `docs/BUILD_AND_RELEASE.md`.
2. **Keystore** erzeugen und offline sichern; `versionCode` pflegen.
3. **Juristische Prüfung** nach `docs/LEGAL_REVIEW.md` – insbesondere
   Widerrufs-Klausel, Impressumsangaben, Play-Payment-Politik, Markenrecherche
   „wAI“, Hosting-AVV.
4. **Test auf realem Gerät**: Sensoren, Torch, Benachrichtigungen, Flugmodus,
   beide Sprachen.
5. **Hosting**: Domain (in `.env` als `VITE_WEBSITE_URL` gesetzt), Download-Seite
   mit APK + `SHA256SUMS.txt`, Impressum-Hosterdaten ergänzen.
6. **Play-Store (optional)**: Zahlungsweg pro Land klären oder Free-only-Listing.

## 4. English summary

Delivered: the complete Android app (one-tap anchors, multimodal offline guidance,
photo/voice notes, multi-anchor management, parking timer, serverless sharing, full
DE/EN, dark/light/night themes, native torch), a real Gradle project with hardened
manifest, adaptive icons and a custom torch plugin, a bilingual conversion-focused
landing page that embeds the actual app as a live demo, complete bilingual legal
texts including a new standalone withdrawal notice with an active consent gate
before any payment route is shown, the non-custodial SOL/BTC/ETH unlock flow with
offline Ed25519 licences, 28 unit tests, render smoke tests for every route in both
languages, and the full documentation suite (concept, design system, marketing,
store listing, licensing, release runbook, legal review, delivery).

Still needed for launch: build the signed APK on a machine with JDK 21 + Android
SDK 36, create and back up the keystore, complete the lawyer review items, test on
a real device offline, and wire up hosting plus the download page.
