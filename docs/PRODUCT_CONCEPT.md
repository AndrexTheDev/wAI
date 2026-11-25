# wAI — Produktkonzept / Product Concept

Bilingual document: German first (primary market), English summary at the end.
Zweisprachiges Dokument: Deutsch zuerst, englische Zusammenfassung am Ende.

---

## 1. Das Problem in einem Satz

Navigations-Apps führen zu **Adressen**, nicht zu **Dingen**. Der letzte – und
schwerste – Teil jeder Suche beginnt dort, wo die Karten-App aufhört: Ebene 3,
Säule B17, der blaue Pavillon hinter der Wiese, der Werkzeugkasten im Schuppen.

## 2. Produktvision

> **wAI ist der Anker für deine Umgebung.**
> Ein Tipp speichert nicht nur einen Punkt, sondern die gesamte Umgebung: Richtung,
> Entfernung, Höhe/Etage, ein Foto, eine Sprachnotiz und deinen eigenen Hinweis.
> Fällt eine Informationsquelle aus – kein GPS, kein Netz, kein Licht – tragen die
> anderen dich zurück.

Positionierung: **hochwertiges, ehrliches Werkzeug** – kein Spielzeug, kein
Abo-Modell, kein Konto, keine Cloud.

### Was wAI bewusst *nicht* ist

| Nicht | Warum |
|---|---|
| Navigations-App | Wir ersetzen keine Karten, kein Routing, keine Verkehrsdaten |
| Rettungs-/Sicherheitsgerät | Kein Notruf, keine Garantie – klar kommuniziert (Disclaimer) |
| „Freunde finden“-Tracker | Kein Live-Tracking, kein Server, keine Konten |
| Abo-Produkt | Einmalkauf; Nutzer sollen nicht für Erinnerungen zahlen müssen |

## 3. Zielgruppen & Personas

### P1 — „Der Tiefgaragen-Pendler“ (Kern-Zielgruppe, Stadt)

- 28–55, Berufstätige in Großstädten, parken täglich in Parkhäusern/Tiefgaragen
- Schmerz: „Wo stand ich? Ebene? Säule? Ausgang?“ – besonders in fremden Städten
  und bei Mietwagen
- Zahlungsbereitschaft: **hoch** (einmalig), sucht sofortigen Nutzen
- Aktivierung: App öffnen, Anker setzen, 4 Stunden später zurückfinden

### P2 — „Die Festival-/Camping-Gruppe“

- 20–40, mehrtägige Events, Zeltplätze mit tausenden Zelten
- Schmerz: nachts, dunkel, kein Netz, alles sieht gleich aus
- Feature-Hebel: Sprachnotiz, Nachtmodus, Vibration statt Hinsehen
- Viral: **Teilen** von Ankern an die Gruppe (ohne Server)

### P3 — „Der Outdoor-/Reise-Nutzer“

- Wandern, Angeln, Jagd, Radtouren, Wohnmobil-Reisen, Kreuzfahrten
- Schmerz: Funklöcher, weglose Gebiete, wiederkehrende Plätze („die gute
  Wasserstelle“)
- Feature-Hebel: Höhenmeter, Brotkrumen-Spur, Robustheit offline
- Wichtig: **kein Roaming-Verbrauch** auf Reisen

### P4 — „Der Alltags-Vergessliche“ (Sekundär, Volumen)

- Werkzeug, Schlüssel, Ersatzteile, Fahrrad, Lagerraum
- Erweiterte Reichweite über Wortspiele/Viralität („Ich habe mein Auto gefunden!“)

### P5 — „Veranstalter & Teams“ (B2B2C, später)

- Feuerwehr-Übungsgelände, THW, große Events, Logistik: Sammelplätze, Notausgänge,
  Materiallager. Lizenzbündel auf Anfrage.

## 4. USP & Beweisführung

| Behauptung | Beweis im Produkt |
|---|---|
| „Ein Tipp reicht“ | Anker entsteht beim Tippen, Editor ist optional und jederzeit schließbar |
| „Funktioniert ohne Netz“ | Alle Kernfunktionen laufen lokal; Lizenzprüfung ebenfalls offline |
| „Führt auch ohne GPS“ | Sensormodus mit Schrittzählung/Kompass, ehrliche Genauigkeitsanzeige |
| „Findet die letzte Etage“ | Höhen-/Etagen-Lotse mit geschätzten Stockwerken |
| „Niemand sieht mit“ | Keine Server, keine Analytics, Backup standardmäßig aus |
| „Einmal zahlen“ | Einmal-Lizenz, keine Abos, klarer Preis |

## 5. Funktionsumfang (implementiert)

### 5.1 Anker setzen

- Ein-Tipp-Sofortanker (Standort wird sofort persistiert, Editor danach)
- Optional: Titel, Kategorie (Auto/Zelt/Treffpunkt/Werkzeug/Eingang/Natur/Sonstiges),
  Textnotiz, Zone/Tarif, Etagen-Label
- Fotos: Kamera oder Galerie, jeweils mit Blickrichtung (Kompass) gespeichert
- Sprachnotiz: Aufnahme mit Dauer, Wiedergabe inline (Pro)
- Mehrere aktive Anker: Liste, Suche, Kategorie-Filter, Favoriten, Sortierung
  (neueste/älteste/nächste/Name), Archiv

### 5.2 Rückführung (multimodal, kombinierbar)

1. **Kompass** – relativer Pfeil zur Blickrichtung, Entfernung, Ziel-Peilung
2. **Höhen-Lotse** – „gleiche Ebene“, „+8 m, ca. 3 Etagen höher“
3. **Brotkrumen-Spur** – GPS-Punkte ab Anker, vereinfacht (Douglas–Peucker) und
   als SVG-Pfad gezeichnet (Pro: Aufzeichnung)
4. **Umgebungsabgleich** – Referenzfoto, Sprachnotiz, Textnotiz
5. **Näher-dran-Feedback** – 5 Stufen (Vibration + Ton, Frequenz steigt) (Pro)
6. Multi-Ansicht: mehrere Ansichten gleichzeitig (Pro)

### 5.3 Zeit, Alltag, Sicherheit

- Park-Timer mit lokaler Benachrichtigung (Pro)
- Zonen-/Kostennotiz (Tarif, Einfahrtszeit, Zahlstatus)
- Nachtmodus (rotverschoben, kontrastarm) + Taschenlampe über natives Torch-Plugin

### 5.4 Teilen ohne Server

- `WAIX1.`-Code (base64url JSON) für Messenger/E-Mail
- QR-Code am Gerät erzeugt
- `.waipack.json` inklusive Medien (Pro)
- Import per Einfügen/Datei; Validierung gegen fehlerhafte Daten

### 5.5 Datensouveränität

- Export als JSON (Anker + Einstellungen + Lizenz)
- „Alle Daten löschen“
- Android-Auto-Backup bewusst deaktiviert (`data_extraction_rules.xml`)

## 6. Free vs. Pro

| | Free | Pro (14,99 € einmalig) |
|---|---|---|
| Offline-Nutzung | ✓ | ✓ |
| Aktive Anker | 3 | unbegrenzt |
| Notizen pro Anker | 1 Foto **oder** Text | unbegrenzt + Sprache |
| Kompass, Höhen-Lotse | ✓ | ✓ |
| Brotkrumen-Spur | – | ✓ |
| Multi-Ansicht | – | ✓ |
| Näher-dran-Feedback | – | ✓ |
| Park-Timer + Erinnerung | – | ✓ |
| Teilen inkl. Medienpaket | – | ✓ |
| Favoriten/Archiv/Filter | – | ✓ |
| Werbung/Tracking/Abo | nie | nie |

**Upgrade-Momente** (nicht blockierend, immer mit „Später“):

1. 4. aktiver Anker → Banner mit „Archivieren oder Pro“
2. Zweites Foto / erste Sprachnotiz → Pro-Hinweis im Editor
3. Multi-Ansicht im Find-Screen → Info-Banner mit Einzelansichten als Fallback
4. Park-Timer / Proximity-Toggle → Pro-Sheet
5. Archiv-Tab → Teaser mit Wertversprechen

## 7. Technische Recherche & Entscheidungen

### 7.1 Sensorfusion (recherchiert, umgesetzt)

- **Kompass**: `deviceorientationabsolute` (Android) mit Fallback auf
  `deviceorientation`; Low-Pass-Filter mit kürzestem Winkelweg (α ≈ 0.18),
  Genauigkeitsstufe aus der Winkeländerung abgeleitet → UI-Hinweis
  „Kompass kalibrieren“ (Acht-Bewegung), da Magnetometer durch Metall, Magnete,
  Lautsprecher und Fahrzeuge stark gestört werden.
- **Höhe**: GPS-Altimeter + `Barometer` (Generic Sensor API, wo verfügbar);
  Etagen-Schätzung mit 3 m/Etage und ±1,5 m Toleranz als „gleiche Ebene“.
- **Dead Reckoning** (Fallback ohne GPS): Schritterkennung × 0,72 m Schrittlänge,
  Integration der Kompassrichtung, Unsicherheit wächst mit 15 % der Wegstrecke
  (min. 8 m) – wird dem Nutzer **ehrlich angezeigt**, statt Präzision zu simulieren.
- **Trail**: Sampling mit Mindestabstand 3 m gegen Jitter, Simplifizierung ab 500
  Punkten (Douglas–Peucker, ε = 2 m) – schont Akku, Speicher und Renderzeit.
- **Bewusste Entscheidung gegen Karten-Tiles**: Kartendarstellung wäre online,
  lizenzpflichtig und groß. Ein relatives Spur-SVG erfüllt den Zweck offline.

### 7.2 Plattform

- **Capacitor 8** statt Flutter/React Native: Die App ist UI-lastig, die
  Web-Plattform liefert MediaRecorder, WebCrypto, Generic Sensors und SVG; ein
  gemeinsamer Codebestand für App **und** browsbare Demo senkt Kosten und
  garantiert, dass die Landingpage-Demo exakt das Produkt zeigt.
- Native Ergänzungen nur wo nötig: `TorchPlugin.java` (Kamera2-Torch),
  Manifest-Permissions, Splash/Icon, Backup-Regeln.
- WebView-Härtung: `allowFileAccess=false`, `MIXED_CONTENT_NEVER_ALLOW`,
  Content-Security-Policy ohne externe Hosts.

### 7.3 Krypto-Zahlungen (non-custodial)

- Direkt an drei Wallets (SOL, BTC, ETH) mit QR nach BIP21 / EIP-681 / Solana Pay
- Bestellreferenz (`WAI-XXXXX`) zur Zuordnung, Übermittlung per Mail
- Freischaltung über signierten Offline-Token (Ed25519), kein Lizenzserver
- Netzwerk-/Finalitätswarnungen an jeder Wallet sichtbar
- Bewusster Verzicht auf Custody, Wechselstube oder Token-Emissionsmodell

### 7.4 Rechtliche Leitplanken (recherchiert)

- Google-Play-Politik zu externen Zahlungen ist **regional unterschiedlich**
  (USA: externe Links seit Okt. 2025 erlaubt; EU/Drittländer: eigene Programme).
  → wAI wird primär als **direkte APK** verteilt; für einen Play-Release ist der
  Krypto-Teil pro Land zu prüfen (siehe `docs/LEGAL_REVIEW.md`).
- Spenden/Tips ohne Gegenleistung sind von Play Billing ausgenommen, digitale
  Freischaltungen nicht – die Trennung ist in AGB und UI explizit.
- DSGVO: keine Übermittlung, daher „Privacy by Design“; Rechtsgrundlagen und
  Rechte sind im Datenschutzhinweis dokumentiert.

## 8. UX-Prinzipien

1. **Ein Tipp, kein Formular.** Der Anker existiert vor dem ersten Pflichtfeld.
2. **Nichts blockiert.** Jede Pro-Schranke hat einen funktionierenden Fallback.
3. **Ehrliche Genauigkeit.** Zeigt ±Meter und Sensormodus, statt Präzision zu
   behaupten.
4. **Daumen-erreichbar.** Primäraktionen unten, Sheet-basiert, 44 px Ziele.
5. **Dunkel zuerst.** Das Produkt wird nachts und im Keller gebraucht.
6. **Zweisprachig by construction.** Fehlende Übersetzung = Compile-Fehler.

## 9. Erfolgskennzahlen (Produkt)

| Metrik | Ziel |
|---|---|
| Time-to-first-anchor (Onboarding → 1. Anker) | < 45 s |
| Anteil Nutzer mit ≥ 2 Ankern in Woche 1 | > 55 % |
| Rückkehr-Rate („Anker gefunden“) | > 70 % der Sitzungen mit Find-Tab |
| Free → Pro Conversion | 4–9 % (Benchmark Utility-Apps 2–5 %) |
| Absturzfreie Sitzungen | > 99,5 % |
| Support-Tickets pro 100 Lizenzen | < 5 |

## 10. Roadmap

**v1.0 (dieses Repository)** — alles oben Genannte, DE/EN, Krypto-Freischaltung.

**v1.1** — Widget („Anker setzen“ vom Homescreen), Wear-OS-Vibration,
Sprachführung (TTS) im Find-Screen, Screenshot-Import für Parkhaus-Beschilderung.

**v1.2** — Offline-Karten-Skizzen (nutzereigene Bilder als Untergrund),
Team-Anker über lokales WLAN/Hotspot, verschlüsselte Export-Pakete.

**v2.0** — AR-Overlay (Kamera + Pfeil) auf ARCore-Geräten, UWB-Unterstützung
(Android 12+), CarPlay/Android-Auto-Begleiter.

---

## English summary

**Problem.** Navigation apps route you to an address, not to a *thing*. The hardest
part of every search starts where the map stops: level 3, pillar B17, the blue tent
behind the meadow, the toolbox in the shed.

**Vision.** wAI anchors the whole environment, not just a pin: bearing, distance,
elevation/floor, a breadcrumb trail, reference photos, voice notes and your own
written hint. When one signal fails — no GPS, no signal, no light — the others carry
you back. Premium, honest tool: no account, no cloud, no subscription.

**Audience.** (1) city drivers in multi-storey car parks, (2) festival/camping
groups, (3) outdoor & travel users, (4) everyday forgetters, (5) event organisers
and teams (licence bundles later).

**Implemented.** One-tap anchors with optional title/category/note/zone/floor,
camera + gallery photos with heading, voice notes, multi-anchor management with
search/filter/sort/favourites/archive, multimodal guidance (compass, elevation
beam, simplified breadcrumb trail, photo matching, 5-tier proximity feedback),
multi-view, parking timer with local notifications, night mode + torch,
serverless sharing (`WAIX1` code, QR, `.waipack.json`), full JSON export and
delete-all, and a fully offline Ed25519 licence check.

**Technical decisions.** Capacitor 8 + React 19 for one codebase across APK and
browser demo; low-pass filtered absolute heading with calibration prompts; honest
dead-reckoning fallback (15 % distance uncertainty, min 8 m); Douglas–Peucker trail
simplification; no map tiles by design (offline, licence-free); hardened WebView
with a strict CSP; native Torch plugin; crypto payments direct to three wallets
with BIP21/EIP-681/Solana-Pay QR codes and a signed offline licence token.

**Monetisation.** Free tier with 3 active anchors and one note per anchor; Pro is a
€14.99 one-time licence unlocking unlimited anchors, unlimited media, trail
recording, multi-view, proximity feedback, parking timer and media sharing.
Upgrade prompts never block the core flow.

**KPIs.** Time-to-first-anchor < 45 s, > 55 % of new users with ≥ 2 anchors in
week 1, 4–9 % free→pro conversion, > 99.5 % crash-free sessions.
