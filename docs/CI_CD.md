# wAI — CI/CD und Release-Prozess

Alles rund um Build, Signatur und Veröffentlichung läuft über GitHub Actions.
Kein Build-Server, kein Docker, kein lokales SDK nötig. Ein Push allein ist aber
keine Launch-Freigabe: siehe [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md), insbesondere
zum noch offenen Downloadpfad und zum kompromittierten Lizenzschlüssel.

---

## 1. Die drei Workflows

| Workflow | Datei | Auslöser | Ergebnis |
|---|---|---|---|
| **CI** | `.github/workflows/ci.yml` | jeder Push, jeder PR | Typecheck, 72 Unit-Tests, Render-Smoke (DE/EN, alle Routen), Android-Asset-Checks, Web-Build |
| **Android build** | `.github/workflows/android.yml` | Push auf `main`/`arena/**`, Tags `v*`, manuell | signiertes APK + AAB, Prüfsummen, Build-Info, optional GitHub-Release |
| **Deploy website** | `.github/workflows/pages.yml` | Push auf `main` | Landingpage inkl. eingebetteter App-Demo auf GitHub Pages |
| **Responsive layout** | `.github/workflows/responsive.yml` | Änderungen an `packages/landing/src/**` | jede Route bei 15 Breiten (320–1440 px) auf seitlichen Überlauf gemessen |

Alle Workflows lassen sich zusätzlich manuell starten (Actions → Workflow →
„Run workflow“).

### Was der Android-Workflow im Detail macht

1. JDK 21 (Temurin) bereitstellen.
2. Android SDK 36 vorbereiten (nutzt das vorinstallierte SDK des Runners,
   installiert nur fehlende Pakete – keine Drittanbieter-Action, keine
   Download-URLs, die verschwinden können).
3. `npm ci`, Gradle-Cache laden.
4. `npm run check:android` – XML-Gültigkeit, Ressourcen-Referenzen, Icon- und
   Splash-Abdeckung, Berechtigungs-Policy, DE/EN-String-Parität, Gradle-Sanity.
5. `tools/ci-signing.sh` – Keystore aus dem Secret oder Wegwerf-Key für Vorschauen.
6. `tools/build-android.sh` – Tests, Web-Build, `cap sync`, `assembleRelease`,
   `bundleRelease`, Signaturprüfung, Manifest-/Inhaltsprüfung, Prüfsummen.
7. Artefakte hochladen (90 Tage), bei Tag/`release=true` ein GitHub-Release
   mit APK, AAB, `SHA256SUMS.txt` und `build-info.json` veröffentlichen.

## 2. Signatur einrichten (einmalig, durch dich)

Ein Release-APK muss signiert sein. Den Schlüssel erzeugst **du** lokal – er
gehört nie ins Repository.

```bash
bash tools/make-keystore.sh
```

Das Skript legt `~/.wai/wai-release.jks` an, zeigt die Zertifikatsdaten und
druckt die vier Secrets, die du im Repository hinterlegst:

| Secret | Inhalt |
|---|---|
| `WAI_KEYSTORE_BASE64` | `base64 -w0 ~/.wai/wai-release.jks` |
| `WAI_KEYSTORE_PASSWORD` | Keystore-Passwort |
| `WAI_KEY_ALIAS` | `wai` |
| `WAI_KEY_PASSWORD` | Key-Passwort (meist identisch) |

```bash
gh secret set WAI_KEYSTORE_BASE64 < ~/.wai/keystore.b64
gh secret set WAI_KEYSTORE_PASSWORD
gh secret set WAI_KEY_ALIAS --body wai
gh secret set WAI_KEY_PASSWORD
```

Ohne diese Secrets erzeugen gewöhnliche Branch-/PR-Läufe weiterhin Testartefakte
mit einem Wegwerf-Schlüssel. Die Release-Sperre auf `main` blockiert eine
Veröffentlichung mit Preview-Signatur. Das frühere öffentliche Preview-Release
`v1.0.0` samt Assets wurde gelöscht; das gleichnamige Git-Tag bleibt bestehen.

> **Wenn der Schlüssel verloren geht:** Bei aktiviertem Play App Signing kannst du
> in der Play Console einen neuen Upload-Key hinterlegen. Bei reiner
> APK-Verteilung müssen Nutzer die App deinstallieren, um ein Update zu
> installieren. Deshalb: zwei Offline-Backups.

## 3. Eine Version veröffentlichen

```bash
bash tools/release.sh patch        # oder minor / major
```

Das Skript prüft den sauberen Working Tree, lässt `npm run verify` laufen, hebt
die Version an **einer** Stelle an (App, Root, `product.ts`, `versionCode` /
`versionName` in Gradle), committet `release: v1.0.1`, setzt ein annotiertes Tag
und pusht beides. Das Tag startet den Android-Workflow, der das Release
veröffentlicht.

Nur zum Testen, **ohne Veröffentlichung**:

```bash
gh workflow run android.yml --ref main -f release=false
```

Achtung: `release=true` und ein `v*`-Tag fordern eine Veröffentlichung an.
Die Release-Sperre auf `main` blockiert Preview-Signatur, den bekannten
kompromittierten Lizenz-Ausstellerschlüssel und Vite-Key-Overrides. Sie prüft
weder die Identität des Signaturzertifikats noch Rechtsfreigabe oder Gerätetest.
Erst nach allen Freigaben in [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md) veröffentlichen.
Alte Tags und andere Refs können ältere Workflow-Versionen enthalten.

## 4. Artefakte und wo sie landen

| Artefakt | Inhalt | Ablage |
|---|---|---|
| `wai-apk-<version>` | `wai-<version>.apk`, `SHA256SUMS.txt`, `build-info.json` | Actions-Artefakt (90 Tage) **und** GitHub-Release |
| `wai-aab-<version>` | `wai-<version>.aab` für Google Play | Actions-Artefakt (90 Tage) **und** Release |
| `wai-build-logs-<n>` | Gradle-Logs, `mapping.txt`, Berichte | Actions-Artefakt (30 Tage) |
| `landing-dist` | fertige Website inkl. `/app/`-Demo | Actions-Artefakt (14 Tage) |

Die Landingpage verlinkt standardmäßig auf `/releases/latest`. Nach Entfernung
des Preview-Releases existiert derzeit kein finales Release als Download-Ziel.
Vor öffentlichem Deploy Downloadpfad und Freigaben prüfen; `VITE_APK_URL` (und
`VITE_APK_SHA256`) kann später auf eine eigene, geprüfte Datei zeigen.

## 5. Website veröffentlichen (GitHub Pages)

1. Repository → **Settings → Pages → Source: GitHub Actions**.
2. Push auf `main` (oder Workflow manuell starten).
3. Nach dem Deploy: `https://andrexthedev.github.io/wAI/`

Die Seite enthält die komplette Marketing-Site, alle Rechtstexte unter
`/legal/...` und die echte App als Demo unter `/app/`. Ein `404.html`-Kopiermuster
lässt Deep-Links funktionieren.

Solange Pages nicht aktiviert ist, überspringt der Workflow den Deploy-Schritt und
schreibt nur einen Hinweis in die Job-Zusammenfassung – der Build bleibt grün.

## 6. Pull Requests

Jeder PR durchläuft automatisch:

- CI (Pflicht): Typecheck, Tests, Render-Smoke, Android-Checks
- Android build (bei Änderungen an App/Shared/Tools): prüft, dass der APK-Build
  tatsächlich durchläuft – inklusive Manifest-Merger und javac

Damit sind die beiden Fehlerklassen, die den ersten Build gekillt haben
(XML-Kommentar mit `--`, nicht existierende Capacitor-API), dauerhaft abgedeckt.

## 7. Fehlersuche

| Symptom | Ursache | Lösung |
|---|---|---|
| `Android asset checks failed` | XML/Ressource/Berechtigung | Meldung nennt Datei und Grund; `npm run check:android` lokal reproduzieren |
| `ManifestMerger2 MergeFailureException` | ungültiges XML im Manifest | `--` in Kommentaren verbieten die Checks |
| `compileReleaseJavaWithJavac FAILED` | Java-Fehler | Annotation `Gradle` enthält `error:` und `symbol:`-Zeilen |
| Build grün, aber „preview build“ | Secrets fehlen | Abschnitt 2 |
| `Resource not accessible by integration` beim Pages-Deploy | Pages nicht aktiviert | Settings → Pages → GitHub Actions |
| „Unknown JSON field“ bei `gh` | CLI-Version | Felder mit `gh api` holen oder CLI aktualisieren |

Der Workflow schreibt Gradle-Ausgaben zusätzlich in Logdateien und spiegelt
Fehlerzeilen als **Check-Annotationen**. Damit ist die Ursache direkt im
PR-/Actions-Tab sichtbar, ohne das komplette Log herunterzuladen.

---

## English summary

Four workflows: **CI** (every push/PR — typecheck, 72 unit tests, bilingual
render smoke tests, Android asset checks, web build), **Android build** (JDK 21 +
SDK 36, `tools/ci-signing.sh`, `tools/build-android.sh` producing a signed APK and
AAB with signature, manifest and bundle-content verification, artifacts plus an
optional GitHub release), **Deploy website** (builds the landing page with the
embedded app demo and publishes it to GitHub Pages, skipping cleanly until Pages is
enabled) and **Responsive layout** (`tools/check-responsive.mjs` measures every
route at fifteen widths from 320 to 1440 px and fails on any horizontal overflow,
naming the element that sticks out).

Signing: configure the four `WAI_*` secrets using a trusted machine. Ordinary
builds without them remain preview artifacts; publication is blocked without
release signing and a reviewed issuer key not on the known-compromised list. The
former public preview release and assets were deleted; its tag remains.
`tools/release.sh` tags and pushes after checks; manual legal, device
and certificate-identity approvals remain essential. The landing page links to
`/releases/latest`; see the launch checklist before making it public.

Failures are surfaced as check annotations (Gradle errors, javac `error:`/`symbol:`
lines, asset-check messages), so the cause is visible without downloading logs. The
two bugs that broke the first build — an illegal `--` inside an XML comment and a
nonexistent Capacitor API — are now caught by `npm run check:android` and by the
build itself, respectively.
