# wAI — Legal Review Checklist

> **Wichtig / Important:** Die Rechtstexte in `packages/shared/src/legal/` sind
> sorgfältig erstellte **Entwürfe**, keine Rechtsberatung. Vor dem kommerziellen
> Einsatz muss eine Rechtsanwältin oder ein Rechtsanwalt mit Bezug zum
> **tatsächlichen Vertriebsland** die Texte prüfen und freigeben. Dieses Dokument
> listet genau die Punkte, die dabei entschieden werden müssen.
>
> The legal texts are carefully drafted **templates**, not legal advice. Before
> commercial launch, a lawyer qualified in the **actual country of distribution**
> must review and approve them. This document lists exactly what needs deciding.

---

## 1. Anwaltliche Prüfpunkte / Points a lawyer must confirm

### 1.1 Anbieterkennzeichnung (Impressum)

- [ ] Vollständiger Name/Namensform des Anbieters, ladungsfähige Anschrift
      (kein Postfach). Bei Kleinunternehmern in DE: Name + Adresse sind Pflicht,
      auch ohne Handelsregister.
- [ ] Umsatzsteuer-Identifikationsnummer oder Kleinunternehmerhinweis
      (§ 19 UStG) korrekt formuliert.
- [ ] Verantwortlicher für journalistisch-redaktionelle Inhalte (§ 18 Abs. 2 MStV),
      falls zutreffend.
- [ ] Kontakt-E-Mail unmittelbar erreichbar (`hippie.highho@gmail.com`) sowie eine
      zweite Kontaktmöglichkeit (z. B. Kontaktformular) – EuGH-Entscheidung zu
      Art. 12 DSGVO verlangt schnelle Kontaktaufnahme.
- [ ] Bei Vertrieb in Österreich/Schweiz: jeweilige Offenlegungspflichten
      (ECG § 5, UWG Art. 3 Abs. 1 lit. s CH).

### 1.2 Verbraucherrecht (Fernabsatz / digitale Inhalte)

- [x] Widerrufsrecht: Bei digitalen Inhalten erlischt es gemäß § 356 Abs. 5 BGB,
      wenn der Unternehmer mit der Ausführung begonnen hat, nachdem der Verbraucher
      **ausdrücklich zugestimmt** und seine Kenntnis vom Erlöschen bestätigt hat.
      → Umgesetzt: aktive, nicht vorausgewählte Checkbox im Pro-Sheet; ohne
      Zustimmung werden keine Zahlungswege angezeigt. Zeitpunkt wird lokal
      gespeichert (`purchaseConsentAt`). Formulierung anwaltlich bestätigen lassen.
- [x] Widerrufsbelehrung als eigenständiges Dokument: `/legal/withdrawal`
      (`packages/shared/src/legal/withdrawal.ts`) inkl. Muster-Widerrufsformular.
      Anwaltlich zu prüfen bleibt die exakte Formulierung der Erlöschens-Klausel.
- [ ] Preisangabenverordnung: Endpreis inkl. USt., Hinweis "einmalig, kein Abo".
      Bei reinen Krypto-Preisen ist zusätzlich ein Euro-Preis anzugeben.
- [ ] Button-Lösung (§ 312j Abs. 3 BGB): Schaltfläche muss "Zahlungspflichtig
      bestellen" o. ä. lauten — bei Direktzahlung an eine Wallet ist zu klären, ob
      überhaupt ein Fernabsatzvertrag über die Website geschlossen wird oder erst
      per Mail. Empfehlung: klar als Bestellung kennzeichnen.
- [ ] Grundpreisangaben entfallen (keine laufende Leistung), aber Laufzeit
      „unbefristet/einmalig" muss eindeutig sein.

### 1.3 Krypto-Zahlungen

- [ ] **Keine KWG-Erlaubnis nötig?** Der Anbieter nimmt Krypto als *eigene*
      Gegenleistung für eine eigene Leistung entgegen (Eigengeschäft, kein
      Finanzdienstleistungsgeschäft für Dritte). Von einem Anwalt bestätigen lassen,
      inkl. MiCA-Abgrenzung (MiCA betrifft Krypto-Dienstleister, nicht Händler, die
      Krypto als Zahlung akzeptieren).
- [ ] **Geldwäschegesetz (GwG):** Händler, die Krypto akzeptieren, sind keine
      Verpflichteten nach § 2 GwG, solange sie keine Krypto-Dienstleistungen
      erbringen. Bestätigen lassen und intern dokumentieren.
- [ ] Steuerliche Behandlung: Zufluss von Krypto ist Betriebseinnahme, Bewertung
      in EUR zum Zuflusszeitpunkt (§ 6 Abs. 1 Nr. 2 EStG / § 256 HGB). Spätere
      Kursänderungen beim Tausch sind gesondert zu erfassen.
- [ ] **Finalität und Netzwerkgebühren** müssen transparent sein (AGB Ziffer zu
      Zahlung + Crypto-Guide). Prüfen, ob eine "keine Rückerstattung"-Klausel in
      dieser Absolutheit zulässig ist — sicherer: Rückerstattung *anbieten*,
      Netzwerkgebühren abziehen (so ist es formuliert).
- [ ] Adressangaben: Haftung bei falsch kopierter Adresse liegt beim Nutzer; AGB
      sollte das ausdrücklich sagen (ist enthalten).
- [ ] Spenden: klar von Kaufleistung trennen, keine Gegenleistung, kein
      Spendenquittungsversprechen (keine gemeinnützige Organisation).

### 1.4 Haftung & Sicherheit

- [ ] Haftungsausschluss für Richtung/Höhe/Entfernung: muss die **gesetzlich
      zwingende Haftung** (Vorsatz, grobe Fahrlässigkeit, Leben/Körper/Gesundheit,
      Kardinalpflichten, ProdHaftG) unberührt lassen — Text prüfen.
- [ ] Klarstellung "kein Navigations-/Rettungsgerät" auch in den App-Store-Texten
      und im Onboarding (vorhanden).
- [ ] Bei Outdoor-/Wassersport-Nutzung: Hinweis auf Mitführung offizieller Karten
      und Notfallmittel (im Disclaimer enthalten; juristisch auf Angemessenheit
      prüfen).
- [ ] Keine Zusicherung von Sensorgenauigkeit — Formulierung "Näherungswerte"
      muss auch bei Werbeaussagen gelten (Marketingtexte gegenlesen).

### 1.5 Datenschutz (DSGVO)

- [ ] Verzeichnis von Verarbeitungstätigkeiten anlegen (auch bei Ein-Personen-
      Betrieben empfohlen; Art. 30 DSGVO).
- [ ] Rechtsgrundlagen im Datenschutzhinweis: Art. 6 Abs. 1 lit. b (Vertrag) für
      Lizenzabwicklung, lit. f (berechtigtes Interesse) für Support, lit. a
      (Einwilligung) für Kamera/Mikrofon/Zugriff auf Medien, soweit nicht
      Vertragserfüllung.
- [ ] **Berechtigungen**: Kamera, Mikrofon, Standort, Bewegungssensoren,
      Benachrichtigungen — jeweils Zweck und Rechtsgrundlage benennen. Android-
      Berechtigungsdialoge müssen im Kontext erklärt werden (Onboarding-Slide
      vorhanden).
- [ ] Hosting der Landingpage: Auftragsverarbeitungsvertrag (Art. 28 DSGVO) mit
      dem Hoster, Server-Logfiles (IP) mit Speicherdauer und Rechtsgrundlage
      benennen, ggf. Drittlandtransfer + SCC.
- [ ] Falls IP-freie Statistik (Plausible/Umami) eingesetzt wird: als
      datenschutzfreundlich dokumentieren, trotzdem im Text nennen.
- [ ] **Kein** Cookie-Banner nötig, solange keine nicht-technischen Cookies oder
      Tracker gesetzt werden → aktuelle Implementierung prüfen.
- [ ] Betroffenenrechte: Auskunft, Berichtigung, Löschung, Einschränkung,
      Datenübertragbarkeit, Widerspruch — umsetzbar? (Löschung = App-Daten löschen
      + Mail an Anbieter für Lizenzdaten; beschreiben.)
- [ ] Aufbewahrung von Lizenz-/Rechnungsdaten: steuerrechtliche Fristen (6/10
      Jahre) müssen die Löschzusage überlagern — im Text präzisieren.
- [ ] Kinder: App nicht an Kinder gerichtet, keine Altersverifikation nötig;
      Datenschutzhinweis enthält Hinweis.

### 1.6 Google-Play-Politik (falls Play-Release)

- [ ] **Payments policy**: Digitale Güter müssen grundsätzlich über Google Play
      Billing laufen. Ausnahmen (Stand der Recherche, muss zum Release-Zeitpunkt
      erneut geprüft werden):
      - USA: externe Zahlungslinks für Apps seit Okt. 2025 zulässig (nach
        Gerichtsentscheidung), mit Informationspflichten.
      - EU/EWR: "Alternative Billing"-Programme mit reduzierter Gebühr, aber nicht
        freie Wallet-Zahlung ohne Teilnahme.
      - Übrige Länder: i. d. R. keine externen Links.
      → **Konsequenz:** wAI wird primär als direkte APK verteilt. Für Play ist
      entweder (a) Play Billing zu integrieren, (b) nur in zugelassenen Regionen
      mit externem Link zu veröffentlichen, oder (c) eine Free-only-Version ohne
      Kaufmöglichkeit in Play zu stellen.
- [ ] Spenden/Tips ohne Gegenleistung sind zulässig (kein Play Billing) — Abgrenzung
      zu digitalen Inhalten sauber halten.
- [ ] Data-Safety-Formular: keine Erhebung, keine Weitergabe, lokale Speicherung,
      Löschung in der App (Werte in `docs/STORE_LISTING.md`).
- [ ] Berechtigungsdeklaration: `ACCESS_FINE_LOCATION` erfordert
      Datenschutzerklärung + ggf. Formular; `POST_NOTIFICATIONS`, `CAMERA`,
      `RECORD_AUDIO` jeweils mit Zweck.
- [ ] Werbe-ID: **nicht** verwendet → im Manifest nicht deklarieren
      (`advertisingIdClient` fehlt bereits).
- [ ] Familien-/Inhaltsfreigabe: "Alle" / USK 0 plausibel, keine Nutzerinteraktion
      mit Fremden.

### 1.7 Marken- und Namensrecht

- [ ] "wAI" auf Kollisionen prüfen (DPMA-Recherche, Klassen 9 und 42). Achtung:
      Häufung von "AI"-Namen in Klasse 9; Recherche zwingend vor Launch.
- [ ] Domain-/Handle-Sicherung (`wai.andrexthedev.dev`, Store-Handle).
- [ ] Icon: eigenständig erstellt (keine Fremdassets) — dokumentiert.
- [ ] "AndrexTheDev" als Marke/Handle konsistent verwenden.

### 1.8 Barrierefreiheit

- [ ] BFSG (ab 28.06.2025 in Kraft) gilt für Verbraucherprodukte, **aber**:
      Kleinstunternehmen (< 10 Beschäftigte und ≤ 2 Mio. € Umsatz) sind
      ausgenommen. Status prüfen und dokumentieren; freiwillig trotzdem die
      WCAG-AA-Punkte aus `docs/DESIGN_SYSTEM.md` einhalten.
- [ ] Website: ausreichende Kontraste, Tastaturbedienbarkeit, Fokusindikatoren
      (umgesetzt).

---

## 2. Was bereits umgesetzt ist / Already implemented

| Anforderung | Umsetzung |
|---|---|
| Bilingual DE/EN in allen Rechtstexten | `packages/shared/src/legal/*` mit `de`/`en` je Dokument |
| Keine Sicherheits-/Navigationsgarantie | Disclaimer, Abschnitt 1–3, plus Wiederholung in AGB und App-Onboarding |
| Eigenverantwortung im Verkehr/Gelände | Disclaimer Ziffer 3 und 5, AGB 8 |
| Krypto-Finalität, Gebühren, falsche Netze | AGB Zahlungsabschnitt + Crypto-Guide + UI-Warnungen |
| Free/Pro-Leistungsumfang | AGB Ziffer 2–4, Landingpage-Vergleichstabelle |
| Lokale Speicherung, Berechtigungen | Datenschutzhinweis Ziffern 2–4, Berechtigungsliste |
| Kontakt/Impressum | `legal/imprint.ts`, überall verlinkt |
| Empfehlung anwaltlicher Prüfung | Sichtbar in App (Rechtliches) und auf der Website |
| Widerrufsverzicht bei digitalen Inhalten | Eigene Seite `/legal/withdrawal` + **aktive Checkbox im Pro-Sheet** (nicht vorausgewählt, Zeitpunkt lokal gespeichert) |

### Offene technische Punkte aus der rechtlichen Prüfung

1. **Druckbare Fassung** der Rechtstexte (PDF oder `print.css`) für die
   Nachweispflicht. Die Consent-Checkbox und die Seite `/legal/withdrawal` sind
   bereits umgesetzt.
4. **Hosting-Details** im Datenschutzhinweis ergänzen, sobald der Hoster feststeht
   (Name, Ort, AVV-Referenz, Logfile-Speicherdauer).
5. **Steuerliche Erfassung** der Krypto-Zuflüsse (Ledger-Template in
   `docs/LICENSING.md` Abschnitt 7).

---

## 3. English checklist (condensed)

1. **Imprint**: full legal name, physical address, VAT status, direct contact,
   § 18 MStV line if applicable.
2. **Consumer law**: explicit withdrawal-right waiver for digital content with an
   *unchecked* consent box before payment; standalone withdrawal notice page;
   euro price shown alongside crypto amounts; "one-time payment, no subscription"
   stated unambiguously.
3. **Crypto**: confirm no KWG/MiCA licence is required for accepting crypto as
   payment for your own product; confirm no GwG obligations; value receipts in EUR
   at the time of receipt; keep network-fee and finality warnings visible; refunds
   minus fees.
4. **Liability**: disclaimer must leave mandatory liability (intent, gross
   negligence, life/body/health, cardinal duties, product liability) untouched;
   repeat "not a navigation or rescue device" in the store listing and onboarding.
5. **GDPR**: processing register, legal bases per purpose, permission rationale for
   camera/mic/location/sensors/notifications, host DPA and log retention, no cookie
   banner needed while no non-essential trackers exist, retention periods overriding
   the deletion promise for invoice data.
6. **Google Play**: payments policy differs by region — primary distribution is a
   direct APK; for Play either integrate Play Billing, restrict external links to
   permitted regions, or ship a free-only listing. Donations are allowed. Fill the
   data-safety form as "no collection", declare permission purposes, no advertising
   ID.
7. **Trademark**: check "wAI" in DPMA/EUIPO classes 9 and 42 before launch; secure
   domain and handles; document that all assets are original.
8. **Accessibility**: BFSG exemption for micro-enterprises — verify status and
   document; keep WCAG AA practices voluntarily.
