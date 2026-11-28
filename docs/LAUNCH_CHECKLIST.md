# wAI — Launch-Checkliste

**Statusaufnahme 25.11.2026. Kein Freigabenachweis.** Ein grüner Build allein ist
kein Launch: Signatur, Lizenz-Ausstellung, Rechtstexte, Hosting und Gerätetest
müssen für den tatsächlich zu veröffentlichenden Stand bestätigt werden.
Diese Liste ergänzt [CI_CD.md](CI_CD.md), [BUILD_AND_RELEASE.md](BUILD_AND_RELEASE.md)
und [LEGAL_REVIEW.md](LEGAL_REVIEW.md); sie ersetzt keine Rechtsberatung.

## Zuerst: Downloadpfad nach Entfernung des Preview-Releases

- Das öffentliche Preview-Release `v1.0.0` wurde auf Wunsch des Eigentümers samt
  Release-Assets gelöscht. Das Git-Tag `v1.0.0` bleibt bestehen. Zum Zeitpunkt der
  Prüfung gibt es kein anderes GitHub-Release; alte Asset-Links sind nicht mehr
  verfügbar und der Standardlink der Landingpage auf
  [`/releases/latest`](https://github.com/AndrexTheDev/wAI/releases/latest) hat
  derzeit kein finales Release als Ziel.
- [ ] Vor Aktivierung von Pages einen passenden Downloadpfad festlegen. Ein neues
  finales Release darf erst nach den folgenden Freigaben öffentlich erscheinen.
  Änderungen am bestehenden Tag und Auswirkungen auf frühere Nutzer bewusst prüfen.
- **Wichtig:** Preview und echtes Release haben unterschiedliche Signaturschlüssel.
  Android akzeptiert ein Update über die Preview-Installation daher normalerweise
  nicht. Ein nötiges Deinstallieren kann lokale Daten löschen: vorher Testdaten
  sichern. Eine Prüfsumme bestätigt Dateiintegrität, nicht die Identität des
  Signaturschlüssels.

## 1. Android-Signatur — Eigentümer

- [ ] Auf einem vertrauenswürdigen eigenen Gerät einen dedizierten Release-Key
  erzeugen (`bash tools/make-keystore.sh`) oder einen bereits gesicherten,
  passenden Schlüssel verwenden. Einen bestehenden Schlüssel **nicht** ohne
  sorgfältige Prüfung überschreiben. Keystore und Passwörter verschlüsselt und
  getrennt sichern; Wiederherstellung an zwei Orten prüfen. Direkte APK-Updates
  benötigen denselben Signaturschlüssel; bei Play App Signing gelten für Upload-
  und App-Signierschlüssel die Einstellungen der Play Console.
- [ ] In GitHub → **Settings → Secrets and variables → Actions** die vier
  Repository-Secrets `WAI_KEYSTORE_BASE64`, `WAI_KEYSTORE_PASSWORD`,
  `WAI_KEY_ALIAS`, `WAI_KEY_PASSWORD` setzen. Details und lokale `gh`-Befehle in
  [CI_CD.md §2](CI_CD.md#2-signatur-einrichten-einmalig-durch-dich). Schlüssel,
  Passwörter und Base64-Inhalt niemals in Chat, Git, Logs oder Tickets einfügen.
  Ob Secrets derzeit existieren, konnte am 25.11.2026 wegen fehlender API-Rechte
  nicht geprüft werden; ihre Werte sind ohnehin nicht auslesbar.
- [ ] **Ohne Veröffentlichung** den Workflow `Android build` auf dem vorgesehenen
  Commit mit `release=false` starten. In Actions `build-info.json` auf
  `signingMode: release` prüfen und das APK mit `apksigner verify --print-certs`
  prüfen; den SHA-256-Zertifikatfingerabdruck mit dem auf dem eigenen Gerät
  unabhängig ermittelten Release-Zertifikat vergleichen. Die bereitgestellten
  Prüfsummen ebenfalls prüfen. `release=false` ist die Voreinstellung; ein Tag
  `v*` oder `release=true` fordert dagegen ein GitHub-Release an. Nach Integration
  der Release-Sperre blockiert diese Preview-Signatur, den bekannten kompromittierten
  Lizenzschlüssel und Vite-Key-Overrides. Sie prüft nicht, ob das Zertifikat das
  tatsächlich gewünschte ist, und ersetzt keine manuellen Freigaben.

## 2. Lizenz-Ausstellung — Eigentümer, vor Verkauf von Pro

- **Sicherheitsvorfall:** Bei einer Repository-Prüfung am 25.11.2026 wurde der
  lokale private Lizenz-Ausstellerschlüssel versehentlich in einer Tool-Ausgabe
  angezeigt. Die lokale Datei passte zum im Repository hinterlegten öffentlichen
  Standardschlüssel. Diesen Schlüssel als **kompromittiert** betrachten und für
  den kommerziellen Betrieb nicht weiterverwenden. Keine geheimen Werte aus der
  Ausgabe kopieren, weitergeben oder erneut anzeigen.
- [ ] Auf einem vertrauenswürdigen eigenen Gerät ein **neues** Ed25519-Schlüsselpaar
  erzeugen und den privaten Teil geschützt und redundant sichern. `keygen` schreibt
  Dateien unter `tools/keys/`, ändert aber nicht automatisch den in der App
  eingebetteten Schlüssel. Existierende Schlüssel nicht mit `--force` überschreiben,
  bevor Sicherung und Auswirkungen auf vorhandene Lizenzen geklärt sind.
- [ ] Nur den neuen **öffentlichen** Schlüssel in
  `packages/shared/src/license-key.ts` eintragen und über den üblichen Review- und
  Build-Prozess übernehmen. Eventuell gesetzte `VITE_WAI_ISSUER_KEY`-Build-Overrides
  müssen dazu passen; diese können den Standard in der App überschreiben. Niemals
  den privaten Schlüssel committen. Schon installierte Builds akzeptieren den neuen
  Schlüssel nicht automatisch: Migrations-/Neuinstallationsweg für Testnutzer und
  gegebenenfalls vorhandene Lizenzen klären, bevor irgendetwas verteilt wird.
- [ ] Mit dem neuen privaten Schlüssel einen **Test**-Token ausstellen und im
  tatsächlich vorgesehenen APK offline aktivieren; zusätzlich einen fremd
  signierten oder manipulierten Token ablehnen lassen. Privatschlüssel und Token
  nicht in öffentlichen Logs veröffentlichen. Erst danach Ausgabe, Backup und
  Supportprozess für echte Käufe freigeben. Siehe [LICENSING.md](LICENSING.md).

## 3. Recht und Hosting — Eigentümer + qualifizierte Rechtsberatung

- [ ] Vertriebsland, Anbieteridentität und tatsächlichen Hosting-/Bezahlprozess
  festlegen. [LEGAL_REVIEW.md](LEGAL_REVIEW.md) und die Texte unter
  `packages/shared/src/legal/` einer im Vertriebsland qualifizierten Anwältin oder
  einem Anwalt vorlegen; Freigabe und nötige Änderungen dokumentieren. Insbesondere
  Verbraucherrecht/Widerruf, Krypto-Zahlung, Datenschutz und Anbieterangaben
  prüfen lassen; für Google Play zusätzlich die dann geltenden Zahlungsregeln.
- [ ] Fehlende oder vorläufige Angaben vor Veröffentlichung ersetzen: Das
  Impressum nennt derzeit ausdrücklich eine noch fehlende ladungsfähige Anschrift;
  Name, Adresse und Steuer-/Anbieterangaben nicht raten. Auch Hosting-Angaben und
  aus der Beratung folgende technische oder textliche Änderungen abschließen.
- [ ] **Erst wenn die öffentlichen Inhalte und der Downloadpfad freigegeben sind:**
  GitHub → **Settings → Pages → Source: GitHub Actions** aktivieren; Workflow
  `Deploy website` manuell auf `main` ausführen und auf tatsächlichen Erfolg des
  **Deploy**-Jobs achten. Am 25.11.2026 meldete die Repository-API `has_pages:
  false`; der jüngste grüne Pages-Build hatte den Deploy übersprungen.
- [ ] In einem normalen Browser die Startseite, `/app/` und die direkten Links
  `/legal/imprint`, `/legal/privacy`, `/legal/terms`, `/legal/withdrawal` unter
  `https://andrexthedev.github.io/wAI/` öffnen; Inhalte und Sprache prüfen.
  Auch Download-Ziel und Freigabestatus kontrollieren, nicht nur den Build-Status.

## 4. Gerätetest — Eigentümer mit echtem Android-Gerät

- [ ] Build-Commit, Version, APK-SHA-256 und Zertifikatfingerabdruck sowie Gerät,
  Android-Version und Datum protokollieren. Das endgültige release-signierte APK
  frisch installieren und nach jeder relevanten Änderung erneut testen.
- [ ] Draußen bei erlaubtem Standortzugriff einen Anker setzen. Flugmodus aktivieren
  und prüfen, dass WLAN/mobile Daten tatsächlich aus sind (GPS kann je nach Gerät
  im Flugmodus weiter funktionieren). App vollständig schließen und offline neu
  öffnen: Ist der Anker noch da? Richtung, Entfernung und Genauigkeit realistisch
  und als Näherung gekennzeichnet? Kompass durch Drehen und ggf. Kalibrieren prüfen.
- [ ] GPS separat einschränken bzw. in einer geeigneten Umgebung den Empfang
  verlieren lassen: Anzeige für fehlendes/schwaches GPS, Schritt-/Kompass-Fallback
  und wachsende Unsicherheit auf diesem Gerät beobachten. Nicht annehmen, dass
  Flugmodus alleine GPS deaktiviert; sicher und nicht im Straßenverkehr testen.
- [ ] Offline Fotos/Notizen, Export und Wiederherstellung mit Testdaten sowie die
  offline Lizenz-Aktivierung mit dem neuen Test-Token prüfen. Falls im Release
  angeboten: Timer/Benachrichtigung (inkl. Android-Berechtigung), Taschenlampe und
  DE/EN testen. Netzübergänge prüfen; externe Links, Mail und Kartendownloads nicht
  als offline verfügbar voraussetzen.
- [ ] Ergebnis je Schritt mit **bestanden / fehlgeschlagen / nicht unterstützt**,
  Beobachtung und ggf. Ticket dokumentieren. Keine echten Koordinaten, Tokens,
  Fotos oder anderen personenbezogenen Daten in öffentliche Berichte aufnehmen.
  Abweichungen beheben und die Prüfung mit dem endgültigen Build wiederholen.

## 5. Freigabe und Veröffentlichung

- [ ] Alle zutreffenden Punkte oben und [BUILD_AND_RELEASE.md §8](BUILD_AND_RELEASE.md#8-release-checklist)
  abschließen; finale `npm run verify`-, Android-Build- und ggf. Store-Checks auf
  dem Release-Commit dokumentieren. Ein Versionscode muss für jeden Play-Upload
  steigen. Keine Käufer oder echten Zahlungen für den Test benötigen.
- [ ] Tastaturfokus vor Freigabe visuell auf Gerät und in weiteren relevanten
  Ansichten prüfen. Der korrigierte `check:focus` umfasst jetzt Startseite, Editor
  und Pro-Sheet mit Testanker, ersetzt aber keinen vollständigen Nachweis: Die
  berechnete Hintergrundfarbe eines Vorfahren garantiert weder Sichtbarkeit noch
  Kontrast des ganzen Rings bei Verläufen, Überlagerung oder Abschneidung.
- [ ] Erst nach ausdrücklicher Freigabe ein neues Release planen. `tools/release.sh`
  ändert Dateien, committet, taggt **und pusht**; der `v*`-Tag veröffentlicht
  automatisch. `gh workflow run android.yml --ref main -f release=true` ist
  ebenfalls eine Veröffentlichung, **kein** reiner Testlauf. Vorher Version,
  Ziel-Commit, Signatur, bestehendes Tag und die Freigaben überprüfen.
- [ ] Nach Veröffentlichung den öffentlichen Download, SHA-256 und
  Zertifikatfingerabdruck unabhängig kontrollieren sowie die Pages-/Store-Links
  und Supportmöglichkeiten prüfen.
