# wAI — Vollständigkeitsprüfung & Roadmap zur „perfekten Parkspot-App“

> **Zweck:** systematisch feststellen, was vorhanden ist, was nur behauptet wird
> und was fehlt — und in welcher Reihenfolge es abgearbeitet wird.
>
> **Summary (EN):** an audit of every promised capability with evidence, plus a
> phased roadmap. Legend: ✅ vorhanden und geprüft · ⚠️ teilweise / nur behauptet
> · ❌ fehlt · 🔒 Pro-Gate fehlt oder falsch.

Stand: 2026-11-25 · Phase 1, 2, 3, 4 und 5.1/5.3 sind umgesetzt (PR #6–#9);
§5b dokumentiert die Browser-Runde (PR #39).
Offen sind nur noch 5.2 (Screenshots) und das Launch-Gate in Phase 6 — beides
braucht den Nutzer bzw. einen Runner mit Chromium.

---

## 1. Prüfmethode

Nicht „gibt es die Datei?“, sondern **„erreicht der Nutzer das Versprechen in
zwei Tipps?“** Jede Zeile unten wurde im Code nachverfolgt: Einstiegspunkt →
Zustand → Anzeige. Behauptungen aus Store-Listing, Landingpage und Rechtstexten
wurden gegen den Code geprüft, weil dort die teuersten Fehler stecken (eine App,
die Schrittschätzung verspricht und keine hat, ist ein Widerrufsgrund).

## 2. Befund — Kernfunktionen

| # | Versprechen | Status | Beleg / Lücke |
|---|---|---|---|
| 1 | Ein-Tipp-Anker | ✅ | `HomeScreen` → `setAnchor()` → sofort gespeichert, Editor nur zum Anreichern |
| 2 | Anker ohne GPS setzbar | ✅ | **entschieden:** ohne Position gibt es keinen Anker — ein Anker ohne Koordinate wäre eine leere Hülle. Stattdessen sagt der Knopf, warum, und führt zum Fund-Bildschirm, wo Kompass und Schrittschätzung ohne GPS funktionieren. `source: 'manual'` bleibt für den Import |
| 3 | Foto mit Blickrichtung | ✅ | `makePhotoRef(captured, sensors.heading)` |
| 4 | Sprachnotiz | ✅ | `startVoiceRecording` + `VoiceRef` (Pro) |
| 5 | Kategorien, Titel, Notiz | ✅ | `AnchorEditor` |
| 6 | **Etage / Ebenen-Label** | ✅ | **behoben:** Presets (−3 … 3) + Freitext im Editor, Lotse liest `floorLabel` | `floorLabel` existiert im Draft, wird aber **nirgends eingegeben** — das Höhen-Lotse zeigt dauerhaft nichts. Genau das Feature, das Tiefgaragen rettet |
| 7 | Viele Anker parallel, Suche, Filter, Sortierung | ✅ | `queryAnchors` |
| 8 | Favoriten / Archiv | 🔒 | **behoben:** `toggleFavorite` prüft `FREE_LIMITS.favorites` und gibt `ok: false` zurück; Stern und Archiv-Knopf öffnen im Free-Tarif das Pro-Sheet mit Grund. Test koppelt Grenze und Erklärung |
| 9 | Kompass + Entfernung | ✅ | `guidanceFor` + Nadel mit relativer Peilung |
| 10 | Höhen-/Etagen-Lotse | ✅ | `floorLabel` wird im Editor gesetzt (Presets −3 … 3 + Freitext) und im Lotse angezeigt; Höhenunterschiede über 60 m werden als unplausibel benannt statt in Etagen umgerechnet |
| 11 | Brotkrumen-Spur | ✅ | Aufzeichnung + `TrailCanvas` (SVG) |
| 12 | Foto-/Notiz-Abgleich beim Suchen | ✅ | **behoben:** `photoHeadingHint()` — jedes Referenzfoto trägt „aufgenommen aus SW 225° – dreh dich 45° nach links". Ohne Kompasskurs bleibt es bei der Himmelsrichtung, eine Drehung wird nie erfunden |
| 13 | Näher-dran-Feedback | ✅ | `proximityTier` + `beep`/`vibrate` |
| 14 | **Schrittschätzung / Dead Reckoning** | ✅ | **behoben:** Schritterkennung über `devicemotion`, `advanceWalker` greift nach 8 s ohne Fix, Anzeige „geschätzte Position“ + Banner mit Schrittzahl und ehrlicher Fehlermarge |
| 15 | Park-Timer + Erinnerung | ✅ | Benachrichtigung trägt die Anker-ID, Tippen öffnet den Anker im Suchbildschirm; `reminderTransition()` setzt `fired` beim nächsten Öffnen nach Ablauf ehrlich nach |
| 16 | Park-Timer erreichbar | ✅ | **behoben:** Uhr-Knopf direkt auf jeder Auto-Karte; Benachrichtigung trägt `anchorId` und öffnet den Anker beim Antippen |
| 17 | Zonen-/Kostennotiz | ✅ | `zone` im Editor |
| 18 | Teilen (Link/QR/Datei) | ✅ | Link mit Web-Vorschau, Intent-Handoff, `.waipack` (Pro) |
| 19 | Taschenlampe beim Suchen | ✅ | **behoben:** Knopf im Suchbildschirm, schaltet beim Verlassen automatisch aus |
| 20 | Nacht-/Notfallmodus | ✅ | Theme `night` (rotverschoben) |
| 21 | Näherung ohne GPS ehrlich anzeigen | ✅ | **behoben:** Statuschip „geschätzte Position“, Banner im Suchbildschirm mit Schritten + Restdistanz |
| 22 | Ankunft | ✅ | Ankunftskarte bietet Timer stoppen, „als gefunden ablegen" und zurück zur Liste |

## 3. Befund — Bedienbarkeit („selbsterklärend“)

| # | Punkt | Status | Beleg / Lücke |
|---|---|---|---|
| 23 | Leerer Zustand erklärt sich | ✅ | **behoben:** eigener Text, Tipp und „So funktioniert wAI“; gefilterte Leere bietet „Filter zurücksetzen“ |
| 24 | Löschen bestätigen | ✅ | **behoben:** `ui/Confirm.tsx` — bilingual, themebar, Fokus-Falle, Abbruch vorausgewählt |
| 25 | Hilfe in der App | ✅ | `HelpSheet` mit Drei-Schritte-Weg, FAQ aus der Landingpage, Sensor-Hilfe und einem Abschnitt „was wAI nicht kann" — offline, DE/EN |
| 26 | Fehlermeldungen erklären den nächsten Schritt | ✅ | **behoben:** der Suchbildschirm ohne Fix nennt den nächsten Schritt („geh ein paar Schritte ins Freie") und bietet einen echten zweiten Versuch statt eines Knopfs, der „Einstellungen" verspricht und nur den Dialog erneut öffnet |
| 27 | Einheiten (metrisch/imperial) | ✅ | **behoben:** `formatDistance`/`formatHeight` mit Einheitensystem, `useUnits()` in Liste und Suche, Tests decken ft/mi ab |
| 28 | Fokusführung in Sheets | ✅ | **behoben:** `Sheet` fängt Tab (vorher nur `Confirm`), Fokus außerhalb springt zurück ins Sheet, Schließen-Knopf heißt lokalisiert „Schließen" |
| 29 | Pro-Momente erklären den Nutzen | ✅ | `ProScreen` mit Grund-Kontext + Wallets + QR |
| 30 | Erster Start | ✅ | Onboarding mit Sprachwahl + Berechtigungen |

## 4. Befund — Optik

| # | Punkt | Status |
|---|---|---|
| 31 | Tokens, Themes, Verläufe | ✅ |
| 32 | Bewegung (Sheets, Toast, Reveal) | ✅, `prefers-reduced-motion` respektiert |
| 33 | Kompass-Nadel, Ringe | ✅ Sweep, Glow, Näherungspuls in 5 Stufen, Ankunfts-Zustand |
| 34 | Anker-Button | ✅ „Einschlag“ beim Speichern (Skalierung + Ring-Burst) |
| 35 | Listen-Einstieg | ✅ Stagger bis 8 Karten, neue Karte mit mint Ring |
| 36 | Hintergrund | ✅ Aurora-Verlauf (26 s Drift) + feines Grid, statisch bei reduced motion |
| 37 | Distanzanzeige | ✅ Wert tickt bei jeder Änderung ein |
| 38 | Karten/Sheets | ✅ Glas-Kante, Innenlicht, Tab-Pille mit Slide |

## 5. Befund — Außenwirkung (Landing, Store, Recht)

| # | Punkt | Status |
|---|---|---|
| 39 | Landingpage DE/EN, 10 Sektionen, Vergleichstabelle, Crypto, FAQ | ✅ |
| 40 | Deep-Link-Vorschau `/a/` | ✅ |
| 41 | Rechtstexte DE/EN inkl. Widerruf + Crypto | ✅ |
| 42 | Datenschutz deckt Teilen ab | ✅ (3.6) |
| 43 | Store-Paket, Screenshot-Plan, Prüfskripte | ✅ |
| 44 | **Marketing-Claims vs. Code** | ✅ | **behoben:** `tools/check-claims.mjs` hält 11 Behauptungen gegen den Code (wortgrenzen-scharf) und läuft in `npm run verify`. Schrittschätzung existiert jetzt wirklich (14), das Notiz-Gate ist im Editor erklärt |
| 45 | Screenshots | ✅ | neun Bilder aus der laufenden App (`tools/capture-store-screenshots.mjs`, CI-Workflow), jedes mit Pflicht-Merkmalen und Layout-Messung; ein falsches Bild lässt den Lauf scheitern |

## 5a. Stand nach der Bild- und Ehrlichkeitsrunde (PR #37–…)

Alle Zeilen in §2/§3 sind ✅ oder bewusst entschieden. Was in dieser Runde
zusätzlich gefunden wurde, weil jedes Store-Bild einzeln geprüft wurde:

| Fund | Ursache | Beleg |
|---|---|---|
| Fund-Screen war höher als das Telefon | `.app` hatte drei Grid-Zeilen, der Screen rendert zwei Kinder → `main` in der `auto`-Zeile, `overflow: hidden` schnitt ab, gescrollt wurde nie | `app.css` `.app`, `.app__body`, `.topbar`, `.tabbar` je `grid-row` |
| Kompass war eine **Ellipse** | `aspect-ratio: 1` zusammen mit `max-height` | `width: min(100%, 216px)` |
| „Spur"-Bild zeigte keine Spur | Klick öffnete den Anker und blieb beim Kompass; alle Ansichten hatten dieselbe Signatur | `mustSee` je Shot im Capture-Skript |
| „ca. 3 Etage(n)", „8 Std. 0 Min." | Platzhalter statt Plural, Null als Messwert | `floorForm()`, `formatDuration()`, Tests |
| „6 Anker" über Zähler 3 | zählte archivierte mit | `activeAnchors.length` |
| Anker 640 m über Gerät bei 411 m | Seed-Daten widersprachen sich | feste Szene, Anker 402 m |
| Screenshots nicht reproduzierbar | `Math.random()` in den Seed-Daten | feste Koordinaten |
| Demo-Hinweis versprach eine Funktion, die es nicht gab | kein Handler auf der Karte | `onPickPosition` + `toWorld`/`unproject`, Test |
| Fotos ohne Blickrichtung | `PhotoRef.heading` gespeichert, nie gezeigt | `photoHeadingHint()` |

Der Capture-Lauf prüft sich selbst: Pflicht-Merkmale pro Bild, Messung von
`.app`/`.app__body`/Tab-Leiste, Exit-Code 1 bei Inhalt hinter der Leiste. Beim
ersten Einsatz meldete er 81 px Überstand — die Zahl, mit der 216 px als
Kompasshöhe bestimmt wurde.

## 5b. Stand nach der Browser-Runde (PR #39)

Bisher wurde die App **gelesen** und **fotografiert**. Diese Runde wurde sie
**bedient**: `tools/walkthrough.mjs` startet einen echten Chromium, setzt
`localStorage`, klickt acht Wege (Erststart, Anker setzen, Wiederfinden,
Pro-Gates, Teilen, Suche, alle Reiter, Englisch) und liest jeden Bildschirm aus.
Bericht: `docs/WALKTHROUGH.md`, 32 Ansichten (inkl. 360-dp-Telefon), 0 Befunde
nach den Korrekturen.

| Fund | Was passierte | Beleg |
|---|---|---|
| `app.features.night` im Einstellungs-Kopf | Schlüssel existierte nie; die Lampe zeigte den rohen Text als ARIA-Label | `SettingsScreen` → `app.find.torch` |
| Keine Prüfung „benutzter Schlüssel existiert" | Der Render-Smoke verglich nur DE gegen EN – beide dürfen denselben Schlüssel *nicht* haben | `renderSmoke.tsx` 1b: liest jedes statische `t('…')` und löst es in beiden Sprachen auf (409 Stellen) |
| **Absturz im Reiter „Finden"** | `mapTarget` war ein `useMemo` *hinter* zwei frühen `return`s – „Rendered more hooks than during the previous render" | Hook über alle Ausstiege gezogen |
| Auswahl im Reiter „Finden" führte zurück zur Liste | alle Knöpfe riefen `onChooseAnother` | `onChoose` + `AppShell`: bleibt im Reiter, Ziel wechselt |
| „Wähle einen Anker" war unerreichbar | ohne Auswahl fiel der Screen still auf `activeAnchors[0]` zurück | Auswahl nötig, außer bei genau einem Anker |
| „Wähle einen Anker" (Knopf oben) sprang in die Ankerliste | `onChooseAnother` setzte den Tab um | bleibt im Fund-Reiter |
| Näher-dran-Signal: zwei Schalter, einer ohne Wirkung | Fund-Screen hielt lokalen State, Einstellungen schrieben `settings` | eine Quelle: `settings.proximityFeedback`; im Free-Tarif aus, Knopf öffnet Pro |
| Free-Schalter stand auf „an", obwohl Pro | `settings.proximityFeedback` default `true` | `aria-checked={plan === 'pro' && …}` |
| „Archiviere einen Anker…" für Free-Nutzer | Archivieren *ist* Pro | `limitBannerBody`: „Lösche einen alten Anker…" |
| „Wallets & Anleitung" im Anker-Editor | Knopf öffnet das Pro-Sheet, nicht eine Krypto-Anleitung | `app.pro.what` |
| Onboarding schloss auch bei „Ablehnen" | `void finish()` ohne Blick auf das Ergebnis | Zustand wird gelesen, bei 0 Rechten bleibt der Schirm und erklärt |
| Vier Häkchen vor der ersten Frage | Deko als Zusage | Häkchen nur ohne Ablehnung, sonst echter Zustand |
| „2.4 m" in der deutschen App | `${rounded}` ohne Dezimalzeichen | `formatDistance`, Test korrigiert (`8,4 m`) |
| „O/E" auf dem Kompass | Krücke für beide Sprachen | `locale === 'de' ? 'O' : 'E'` |
| Zwei Kreuze im Suchfeld | Chromes eigenes plus unser Knopf | `::-webkit-search-cancel-button` aus |
| Sheet öffnete mitten im Inhalt | Autofokus sprang auf den ersten FAQ-Knopf | `Sheet`: `.sheet__body` bekommt den Fokus, `scrollTop = 0` |
| Zwei Knöpfe „Aktivieren", einer ohne Wirkung | unterer Knopf wechselte nur den Reiter | unten: „Ich habe schon eine Lizenz" (rechts: prüft) |
| Englischer Untertitel „ENVIRONMENTAL MEMORY ANC…" | 0,12 em Sperrung auf 412 px | 0,08 em; unter 380 px 8,5 px ohne Sperrung |
| Ankertitel endeten nach 20 Zeichen | einzeilig mit Ellipse | zwei Zeilen (`line-clamp`) |
| Schalter „Mit Notiz & Medien" ohne sichtbare Beschriftung | Erklärung stand erst unter dem Code | Knopf mit Schalter **und** Text |

Der Lauf scheitert jetzt auch an Laufzeitfehlern, leeren Bildschirmen und rohen
Übersetzungsschlüsseln – nicht nur an fehlendem Text.

## 5c. Stand nach der Layout-Runde (PR #43, #44)

Diesmal ging es um das, was man auf einem fremden Gerät sieht, aber auf dem
eigenen nicht: **die Website ließ sich seitlich wegziehen.** `body { overflow-x:
hidden }` schluckt die Scrollleiste, also fällt es niemandem auf – rechts blitzt
beim Wischen nur ein leerer Streifen auf. Gemessen (`scrollWidth > clientWidth`)
war sie auf 412 px um 3 px, auf 360 px um 8 px, auf 480 px um 50 px und auf
einem 1024-px-Tablet um 127 px zu breit. Vier Ursachen, alle erst im Browser bei
der richtigen Breite sichtbar:

| Fund | Ursache | Beleg |
|---|---|---|
| Kopfzeile 421–1179 px | Marke mit Untertitel + sechs Navigationseinträge + Sprach- und Pro-Knopf brauchen 1175 px | `Header.css`: unter 600 px kein Untertitel, unter 420 px kein Pro-Knopf in der Zeile, 941–1179 px engere Abstände |
| Download-Kasten 320–412 px | `grid-template-columns: 1fr` ist `minmax(auto, 1fr)` und wird so breit wie das breiteste Kind – der Release-Knopf mit `nowrap` misst 314 px | `Download.css`: `minmax(0, 1fr)`, Knöpfe dürfen unter 420 px umbrechen |
| Rechts-Seiten ≤ 360 px | dasselbe Muster; „Datenschutzhinweis“ zog die Spalte auf 327 px | `LegalPage.css`: `minmax(0, 1fr)`, Überschrift auf 1,55 rem |
| Kartenstapel ≤ 412 px | `.multiview__pane` ist 14 px nach rechts verschoben und gedreht; abgeschnitten hat ihn nur der `body` | `MultiView.css`: `overflow-x: clip` an der Sektion |

Dazu **zwei Funde in der App**, die ein Screenshot nicht zeigt:

| Fund | Was passierte | Beleg |
|---|---|---|
| „Rückgängig“ nach „Anker setzen“ tat nichts | der `onClick` war ein leerer Handler mit dem Kommentar „undo handled by editor delete“ – den es nicht gab. Wer sich vertippte, bekam den Anker nicht weg, und im Free-Tarif zählt jeder gegen das Limit von drei | `AppShell.tsx` löscht den gerade angelegten Anker, `walkthrough.mjs` zählt die Anker vor und nach dem Tippen (`journeyUndo`) |
| Die Meldung lag hinter dem Editor-Fuß | der Toast sitzt auf Höhe der Tab-Leiste, der Sheet-Fuß direkt über dem Bildschirmrand – „Rückgängig“ war damit nicht antippbar | `Sheet.tsx` markiert `body[data-sheet-open]` und misst die Fußzeile; `app.css` hebt den Toast darüber |
| Drei Knöpfe brachen mitten im Wort | „Park-/Timer“, „Anker/speichern“ auf 412 px | `app.css`: `white-space: nowrap` im Sheet-Fuß, unter 420 px bekommt die Hauptaktion eine eigene Zeile |

Neu: `tools/check-responsive.mjs` + `.github/workflows/responsive.yml` messen
jede Route bei 15 Breiten (320–1440 px) und nennen das Element, das übersteht –
gegen `vite preview`, weil `python3 -m http.server` `/legal/privacy` mit 404
beantwortet und genau dort einer der Fehler saß.

## 5d. Stand nach der Schriftgrößen-Runde (PR #46)

`docs/DESIGN_SYSTEM.md` behauptete seit dem ersten Tag, im App-Shell stünden
alle Schriftgrößen in `rem` — „Text scales with browser/OS font size". In
`packages/app/src/styles/app.css` standen **93 Schriftgrößen, alle in px, und
keine einzige in rem**. Wer auf dem Telefon 200 % Schrift einstellte, sah
exakt dieselbe 15-px-Schrift wie vorher. Für viele Menschen ist das die
einzige Möglichkeit, die App überhaupt zu lesen.

Umgestellt auf `rem` bei einer Wurzel von 10 px (damit `1.5rem` die gewohnten
15 px sind) – und danach das gemessen, was dabei bricht:

| Fund | Ursache | Behebung |
|---|---|---|
| Seite 89 px zu breit bei 200 % auf 320 dp | `.app` ist ein Grid; Kinder haben `min-width: auto` | `grid-template-columns: minmax(0, 1fr)` |
| Suchfeld 353 px breit | Chromium gibt `<input>` eine Mindestbreite aus dem `size`-Attribut | `.toolbar` mit `minmax(0, 1fr)` |
| Sortierzeile ragte rechts heraus | Text und Auswahl waren eine nicht umbruchfähige Zeile | `.row--between` darf umbrechen |
| Sprach-/Darstellungs-Schalter ragte heraus | drei Segmente ohne Umbruch | `.segmented` umbricht, Segmente bleiben einzeilig |
| Vier Reiter teilten sich die Leiste in Viertel | bei 200 % ist „Einstellungen" 81 px breit, die Spalte 74 px → „Einst/ellun/gen" | Spalten an den Inhalt (`grid-auto-columns: auto`), Beschriftung bei `min(0.95rem, 14px)` gedeckelt |
| Kopfzeile brach nicht um | Marke + drei Knöpfe in einer starren Zeile | `.topbar` darf umbrechen |
| Suchfeld hatte feste Höhe | Text wurde oben und unten abgeschnitten | `min-height` statt `height` |
| Beschriftung der Reiter brauchte einen eigenen Span | loser Textknoten im Grid wird so breit wie sein längstes Wort | `<span class="tab__label">` |

`walkthrough.mjs` prüft jetzt zusätzlich **320 dp bei 200 %** und **412 dp bei
150 %**: keine Seite breiter als der Bildschirm, und kein Reiter, dessen
Beschriftung abgeschnitten ist. Bericht: 38 Ansichten.

## 6. Die drei teuersten Funde

1. **`floorLabel` ist nicht eingebbar** (#6). Das Höhen-Lotse — Kern-USP für Tiefgaragen — hat keine Datenquelle. Ein Nutzer merkt das erst, wenn er in Ebene 3 steht.
2. **Der Leerzustand heißt „Unbenannter Anker“** (#23). Der allererste Eindruck einer neuen Installation ist ein Platzhaltertext.
3. **Der Einheiten-Schalter lügt** (#27). Eine Einstellung, die nichts tut, kostet Vertrauen in *alle* Einstellungen.

---

## 7. Roadmap

Reihenfolge nach „Schaden pro Tag, den der Punkt verursacht“, nicht nach Aufwand.
Jede Phase endet mit `npm run verify` + Commit; APK nur, wenn native Dateien betroffen sind.

### Phase 1 — Ehrlichkeit & Kernlücken (P1) — ✅ erledigt (PR #6)
Ziel: Nichts Behauptetes bleibt unimplementiert, kein toter Schalter.

| Task | Datei(en) | Fertig, wenn |
|---|---|---|
| 1.1 Etagen-Eingabe | `AnchorEditor` | Feld „Etage/Ebene“ sichtbar, speichert `floorLabel`, Lotse zeigt es |
| 1.2 Leerzustand | `HomeScreen` | 0 Anker → eigener Titel + „So funktioniert's“-Knopf |
| 1.3 Einheiten wirksam ✅ | `geo.ts`, `useUnits.ts`, Liste + Suche | imperial → ft/mi, Tests decken es ab |
| 1.4 Schrittschätzung | `AppStore`, `engine.ts` | bei GPS-Aussetzer > 8 s Position aus Schritten fortgeschrieben, sichtbar als „geschätzt ±X m“ |
| 1.5 Eigener Bestätigungsdialog | `ui/Confirm.tsx` | Löschen fragt bilingual im App-Stil |
| 1.6 Benachrichtigung antippbar | `AppShell`, `native.ts` | Tippen öffnet den Anker im Suchbildschirm, `fired` gesetzt |
| 1.7 Timer von der Karte | `HomeScreen` | Auto-Anker hat einen Uhr-Knopf, ein Tipp → Timer-Sheet |
| 1.8 Taschenlampe im Suchbildschirm | `FindScreen` | Knopf oben rechts, auch im Nachtmodus sichtbar |

### Phase 2 — Selbsterklärend (P1) — 2.1/2.2/2.3/2.5 ✅ (PR #6)
| Task | Fertig, wenn |
|---|---|
| 2.1 Hilfe-Center in der App (FAQ, Sensoren, Notfall, „was wAI nicht kann“) | ersetzt das 3-Schritte-Sheet, offline, DE/EN |
| 2.2 Ankunft mit Folgeaktion | „Angekommen“ bietet Timer stoppen / archivieren / löschen |
| 2.3 Fehlermeldungen mit Handlung | jeder Warnhinweis nennt den nächsten Schritt |
| 2.4 Foto mit Blickrichtung im Abgleich | „aufgenommen bei 240° — dreh dich nach rechts“ |
| 2.5 Fokus-Trap + deutsche ARIA-Labels | Sheets fangen Tab-Fokus, Labels lokalisiert |

### Phase 3 — Optik (P1) — ✅ erledigt (PR #6)
| Task | Fertig, wenn |
|---|---|
| 3.1 Aurora-Hintergrund + Glas-Kanten | Tiefe ohne Lesbarkeitsverlust, `prefers-reduced-motion` aus |
| 3.2 Kompass: Glow + Näherungspuls + zählende Distanz | Distanz animiert, Ring atmet schneller je näher |
| 3.3 Anker-Einschlag | beim Speichern ein kurzer Impuls am Knopf + Haptik |
| 3.4 Listen-Stagger + Karten-Hover/Press | Karten erscheinen gestaffelt (max. 8) |
| 3.5 Mikro-Details | Skeletons, Tab-Indikator, Zahlen-Ticker, reduzierte Bewegung überall |

### Phase 4 — Parkspot-Tiefe (P2) — ✅ erledigt
| Task | Zustand |
|---|---|
| 4.1 „Wo steht mein Auto?“ als eigene Kachel | ✅ `CarSpotCard` über der Liste: Entfernung/Etage als große Zahl, Parkzeit daneben, ein Tipp zum Kompass. Bei ≤ 15 Min. Restzeit wird sie bernsteinfarben, bei Überziehung rot |
| 4.2 Ticket-Foto im Timer | ✅ „Parkschein fotografieren“ direkt im Timer-Sheet, Foto hängt am Anker |
| 4.3 „10 Minuten vorher“-Erinnerung | ✅ zweiter Slot (`slot=1`), damit sich die beiden Erinnerungen nicht gegenseitig löschen; unter 12 Min. automatisch ausgeblendet |
| 4.4 Etagen-Assistent beim Setzen | ✅ Presets −3 … 3 + Freitext (Phase 1.1) |

### Phase 5 — Außenwirkung angleichen (P2) — ✅ 5.1, 5.3 und 5.2
| Task | Warum |
|---|---|
| 5.1 Claims gegen Code prüfen ✅ | `tools/check-claims.mjs`, in `verify` verdrahtet, gegen Fehlalarm getestet |
| 5.2 Screenshots erzeugen (Runner mit Chromium) ✅ | neun Bilder, reproduzierbar (feste Koordinaten), selbstgeprüft |
| 5.3 Store-Text um Auto-Kachel + Erinnerung ✅ | Store-Text und Landing-Use-Case nennen Auto-Kachel, 10-Minuten-Erinnerung und Parkschein-Foto |

### Phase 6 — Launch-Gate (P3, blockiert Veröffentlichung)

Der aktuelle Ablauf und die Sicherheitsrisiken stehen in der
[Launch-Checkliste](LAUNCH_CHECKLIST.md); insbesondere muss vor kommerziellem
Betrieb der offengelegte Lizenz-Ausstellerschlüssel ersetzt werden.

| Task | Status |
|---|---|
| 6.1 Release-Keystore + 4 `WAI_*`-Secrets | offen (Nutzer) |
| 6.2 GitHub Pages aktivieren | offen (Nutzer) |
| 6.3 Anwaltliche Prüfung `docs/LEGAL_REVIEW.md` | offen (Nutzer) |
| 6.4 Gerätetest im Flugmodus | offen |
| 6.5 Kompromittierten Lizenz-Ausstellerschlüssel ersetzen und Ausgabe testen | offen (Nutzer) |
| 6.6 Preview-Release gelöscht; finalen Downloadpfad vor Launch prüfen | teilweise erledigt; Downloadpfad offen |

---

## 6a. Karte & GPS (2026-11-25)

| Punkt | Zustand |
|---|---|
| **GPS** | `@capacitor/geolocation` mit echtem Watch; Timeout pro Messung auf 8 s gesenkt (20 s ließ die App im Parkhaus ohne Position stehen), `maximumAge` 1 s — ein Minuten alter Fix zeigt auf die Einfahrt, nicht auf die Säule. Ohne Fix übernimmt nach 8 s die Schrittschätzung (14) |
| **Karte** | Offline-Paket aus OpenStreetMap, Zoom 18, ~0,4 m pro Einheit. Reiter „Karte" im Fund-Screen: Häuser, Straßen (nach Klasse), Wasser, Grün, Parkhäuser hervorgehoben, Straßennamen, eigene Position mit Genauigkeitskreis, Ziel, Brotkrumen-Spur, Maßstab, ODbL-Nennung |
| **Paket** | `tools/build-map-pack.mjs` fragt Overpass einmal ab und schneidet Kacheln. Im Repo liegt ein echtes Paket „München Mitte" (48.128–48.145 / 11.555–11.595): **622 Kacheln, 4 903 Häuser, 460 Grünflächen, 29 Gewässer, ~3 MB**, erzeugt von `.github/workflows/map-pack.yml` auf einem Runner und zurückcommittet. Ein Lauf braucht ~1 min; Overpass drosselt, ein zweiter Versuch nach einer Minute geht |
| **Was das echte Paket aufdeckte** | Das synthetische Demo-Paket war ein Gitter aus perfekten Rechtecken — jeder Fehler im Zeichenweg blieb unsichtbar. Die erste ehrliche Karte sah aus wie ein Knoten aus Bindfaden. Fünf Ursachen, alle gefunden und je mit Test fixiert: (1) jeder Punkt wurde relativ zu *seiner eigenen* Kachel gespeichert, die Kachel aber nach dem *mittleren* Punkt gewählt — Objekte über einer Kante sprangen um 256 Einheiten; (2) OSM verkettet die Ringe eines Multipolygons, ein Innenhof wurde zur Linie quer durch den Block; (3) Douglas-Peucker lief auf dem *geschlossenen* Ring, dessen Grundlinie Länge null hat — doppelte Punkte und eine Schlaufe; (4) Gebäude wurden *über* das Straßennetz gemalt, was wie zufällig kreuzende Linien aussah; (5) `visibleTiles` gab den Kachelversatz in **Bildpixeln** zurück, der Renderer addierte ihn zu **Welteinheiten** und teilte erst danach — richtig nur beim Standardmaßstab 2,4 |
| **Kartografie-Entscheidungen** | Reihenfolge Flächen → Häuser → Straßen (Hauptstraßen zuletzt). Fußwege erst unter 1,6 Einheiten/Pixel. Läden sind Punkte ohne Text, Parkhäuser behalten Namen und gelbe Markierung. Straßennamen einmal je 90 px. Gebäude über 160 m Kantenlänge (Bahnhofshallen, Kaufhausriegel) bleiben weg statt als Schleier zu stören |
| **Warum kein Google/OSM-Tile-Layer** | Der Kern der App ist „offline, kein Konto". Kacheln aus dem Netz hätten die CSP, die Store-Texte und `check:claims` gebrochen |
| **Mehrere Städte** | `packages/app/public/map/packs.json` ist die Registry der Gebiete auf dem Gerät; jedes Paket liegt in `map/<slug>/` (Index + Kacheln). `pickPack` wählt das Paket, das den Standort enthält, sonst das nächstgelegene; beim Wechsel wird der Kachel-Cache geleert. Außerhalb aller Gebiete nennt die Meldung, was offline vorhanden ist. Der Generator leitet den Slug aus dem Namen ab und pflegt die Registry — eine zweite Stadt ist ein Workflow-Lauf mit anderen Koordinaten. Ausgeliefert: München Mitte (622 Kacheln, 4 903 Häuser) |
| **Grenzen** | Ein Paket deckt ein Gebiet ab. Liegt der Standort außerhalb, sagt die Karte das (`app.map.outsidePack`) statt eine leere Fläche zu zeigen. Etagen im Gebäude bleiben Sache des Höhen-Lotsen (9) |

## 7a. Erledigte Arbeit (Stand nach PR #9)

| PR | Inhalt |
|---|---|
| #6 | Etagen-Eingabe, Einheiten, Schrittschätzung, Leerzustand, Confirm-Dialog, Timer auf der Auto-Karte, Tippen auf Erinnerung, Taschenlampe im Suchbildschirm, Hilfe-Center, Ankunft mit Folgeaktion, Fehlertexte mit nächstem Schritt, komplette Optik-Schicht |
| #7 | `tools/check-claims.mjs` in `verify` — Behauptungen müssen im Code gedeckt sein (gegen Fehlalarm getestet) |
| #8 | `CarSpotCard` („Wo steht mein Auto?“), zweiter Erinnerungs-Slot 10 Min. vorher, Parkschein-Foto |
| #9 | Store-Text und Landing nennen die neuen Parkspot-Funktionen; Test-Zähler aus den Testdateien statt README |

## 8. Definition of Done für „perfekte Parkspot-App“

- Jede Zeile in §2/§3 ist ✅ — keine ⚠️/❌ mehr ohne bewusste Entscheidung.
- Kein Bedienelement ohne Wirkung, kein Text ohne Beleg im Code.
- Ein neuer Nutzer schafft „Auto abstellen → wiederfinden“ in unter 30 Sekunden
  ohne Anleitung, im Dunkeln, ohne Netz.
- `npm run verify` grün, APK auf echtem Gerät im Flugmodus geprüft.

## 5e. Stand nach der Trefferflächen-Runde (PR #48)

`docs/DESIGN_SYSTEM.md` §4 sagt: „Tap targets ≥ 44×44 px; icon-only buttons get
a 44 px hit area via padding." Gemessen war das **nirgends** wahr – der Beweis
stand die ganze Zeit im Stylesheet:

| Bauteil | Box | Trefferfläche |
|---|---|---|
| `.icon-btn` (Sprache, Taschenlampe, Schließen) | 38×38 | 38×38 |
| `.chip` (Kategorien, Etagen, Filter) | 81–163×43 | 43 hoch |
| `.segmented button` (Sprache, Darstellung) | 62–342×42 | 42 hoch |
| `.switch` (Näher-dran-Signal) | 46×27 | 46×27 |
| `.btn--sm` (Kamera, Galerie, Aufnehmen, Pro) | 130–199×36 | 36 hoch |
| Sortier-Select | 191×30 | 30 hoch |
| Suchfeld | 330×36 | 36 hoch |

Ein 38-px-Knopf ist mit dem Daumen im Gehen ein Glücksspiel – und genau so wird
die App benutzt, in einer Tiefgarage, mit einer Tüte in der anderen Hand.

**Warum `padding`, wie die Doku sagt, nicht funktioniert:** die Knöpfe sitzen in
`flex`-Zeilen mit 2–6 px Abstand. Drei Pixel mehr Innenabstand pro Seite schieben
die Nachbarn weg und brechen die Leisten bei 320 dp – genau der Fehler, der in
der Layout-Runde (PR #43) behoben wurde. Stattdessen ein unsichtbares `::after`
mit 44 px Kantenlänge, zentriert; das kostet kein Layout.

**Wo die Aufweitung nicht geht, wächst die Box:** mehrere Knöpfe in einer 6-px-
Reihe (`.btn--xs` in der Rückgängig-Zeile) bekommen keine Hitzone, weil eine
übergroße Fläche die des Nachbarn schneidet und der falsche Knopf gewinnt.
Dort ist eine kleine Fläche das kleinere Übel; überall sonst wurde die Höhe
selbst angehoben.

**Der Test:** `tools/check-tap-targets.mjs` startet die App, klappert die vier
Reiter ab und tastet für jedes bedienbare Element die Trefferfläche mit
`elementFromPoint` in **halben Pixeln** von der Kante nach außen ab. Drei
Anläufe waren nötig, jeder mit einem eigenen Fehler:

1. `getBoundingClientRect()` misst die Box, nicht die Fläche – genau die
   Unterscheidung, um die es hier geht (ein 38-px-Knopf *soll* 44 haben).
2. 1-px-Raster: bei 38 px auf halben Pixeln meldet die Messung „43" und erfindet
   einen Fehler. Halbe Pixel, sonst misst man die Rundung.
3. Die Hitzone vergrößerte `scrollWidth` eines 37-px-Chips auf 40 – der
   Walkthrough meldete daraufhin drei vollständig lesbare Chips als
   „abgeschnitten". Der Walkthrough misst seitdem die Textstrecke per `Range`
   statt `scrollWidth`, und ein künstlich verengter Reiter erzeugt weiterhin 36
   echte Befunde – der Fehlalarm ist weg, die Empfindlichkeit nicht.

Bericht: `docs/TAP_TARGETS.md` (40 Elemente, alle ≥ 44×44), erzeugt im
Workflow `.github/workflows/tap-targets.yml`.

## 5f. Stand nach der Fokus-Runde (PR #49)

Derselbe Absatz in `docs/DESIGN_SYSTEM.md` (§2) sagt auch: „focus rings ≥ 3:1
against both the surface and the surrounding background". Nachgerechnet hatte
das ebenfalls niemand — und es stimmte nicht. Vier Fehler, alle unsichtbar für
jeden Test, der nur Tokens liest:

| Fund | Warum es niemand merkte | Behebung |
|---|---|---|
| Chip-Fokusring war `--border-2` | 1,40:1 im Nachtmodus, 1,64:1 auf einer Karte – ein Hauch über der Fläche | `--text-3` (4,6–6,4:1), bleibt ruhig und liest sich nicht als Auswahl |
| Textfelder hatten `outline: none` | Fokus war nur ein farbiger 1-px-Rahmen, an derselben Stelle wie der Ruhezustand | `:focus-visible` mit echtem 2-px-Ring |
| Suchfeld hatte **gar keinen** Ring | Der Ring des `<input>` lag unter dem Rand der Hülle; die Hülle färbt sich nur bei `:focus-within` | Ring auf die Hülle, `outline-offset: -2px` |
| Einwilligungs-Box hob den Ring mit `outline: none` auf | Ein Muster, das sich beim Kopieren fortsetzt | entfernt |
| `transition: all` in `.chip`, `.category-btn`, `.segmented button`, `.anchor-card__timer` | animierte den Ring von 0 auf 2 px – im entscheidenden Moment unsichtbar | die drei Eigenschaften, die sich wirklich ändern |

**Korrektur zur ursprünglichen Prüfung:** Die 24 gemeldeten Stationen waren
kein Editor-Nachweis: ohne Testanker wurde dessen Öffnen still übersprungen.
Der Test legt nun einen Testanker an, verlangt den Editor und das Pro-Sheet und
bricht ab, wenn Pflichtfelder nicht per Tab erreicht werden. Dabei zeigte sich,
dass `Sheet` bei neuem `onClose`-Callback den Fokus jedes Mal zurücksetzte;
der Fokus bleibt nun auch bei einem Rerender im Feld. Die Gegenprobe entfernt
den Ring der Editor-Textarea und muss mit genau diesem Befund fehlschlagen.

Der aktuelle Bericht `docs/FOCUS_RINGS.md` nennt Zahl und Ansichten pro Theme.
Er prüft berechnete Outline-Stile und modellierte Hintergrundfarben, nicht die
real gemalten Pixel, Verläufe oder Abschneidung. Auch die frühere Website-Probe
war eine Stichprobe und keine vollständige Prüfung. Sichtprüfung und Gerätetest
bleiben für den Launch offen.
