# Geteilte Anker — Link-Format & Betrieb / Shared anchors — link format & operations

> Kurzfassung: Ein Anker wird als **Link** geteilt, dessen Daten im **Fragment**
> stecken. Das Fragment wird nie an einen Server übertragen. Ohne App zeigt der
> Link eine lesbare Vorschau, mit App übergibt er den Anker in einem Tipp.
>
> Summary: an anchor is shared as a **link** whose payload lives in the
> **fragment**. Fragments are never sent to a server. Without the app the link
> shows a readable preview; with the app it hands the anchor over in one tap.

## 1. Format

| Form | Example | Where it is used |
|---|---|---|
| Kanonischer Link / canonical link | `https://andrexthedev.github.io/wAI/a/#WAIX1.eyJ2…` | Messenger, Mail, QR-Code |
| Nur Code / bare code | `WAIX1.eyJ2…` | Import-Feld, Datei, Gedächtnisstütze |
| Query-Variante | `…/a/?code=WAIX1.…` | Notnagel, falls ein Client das Fragment abschneidet |
| Deep-Link (App) | `wai://anchor/WAIX1.…` | explizite App-Übergabe, Tests |
| Android-Intent | `intent://anchor/WAIX1.…#Intent;scheme=wai;package=dev.andrexthedev.wai;S.browser_fallback_url=…;end` | „In der App öffnen“ auf der Vorschauseite |

Alle Formen werden von **einer** Funktion gelesen: `extractShareCode()` in
`packages/shared/src/deeplink.ts`. Sie akzeptiert zusätzlich Text, in dem der Link
mitten in einer Nachricht steht. Anschließend läuft der Code durch dieselbe
Sanitisierung wie der manuelle Import (`anchorFromShareCode()` in
`packages/app/src/store/shareImport.ts`) — kaputte oder manipulierte Codes werden
verworfen, Medien werden nie ungefragt übernommen.

## 2. Warum Fragment statt Query

`#…` wird vom Browser **nicht** an den Webserver gesendet. Damit sieht der
Hosting-Anbieter (GitHub Pages) weder Koordinaten noch Notiz — die Zusage
„nichts wird hochgeladen“ bleibt auch beim Teilen wahr. Die Vorschauseite liest
den Code ausschließlich lokal und setzt `robots: noindex, nofollow`, solange sie
angezeigt wird.

Grenze der Ehrlichkeit: der Betreiber des Messengers, über den du teilst, sieht
den Link sehr wohl. Das steht so auch in der Datenschutzerklärung (3.6).

## 3. Vorschauseite (`/a/`)

`packages/landing/src/pages/SharePreviewPage.tsx`

- zeigt Kategorie, Name, Höhe, Zone, Notiz und Koordinaten (Coords per Knopf ausblendbar),
- „In der App öffnen“ → Intent-URL (Android) mit Browser-Fallback,
- „Code kopieren“ und Deep-Link zum Testen in einem `<details>`,
- drei Zustände: gültig, beschädigt, kein Code im Link — alle bilingual.

Wichtig für den Betrieb: GitHub Pages liefert für `/a/` die `404.html` aus. Weil
das Bundle relative Asset-Pfade nutzt (`base: './'`), bekommt diese Kopie in
`pages.yml` ein `<base href="/<repo>/">` injiziert; der Router liest dasselbe Tag
und schneidet das Präfix ab. Ohne diesen Schritt würde `/a/assets/…` angefragt
und die Seite bliebe leer. Der Workflow prüft das Tag anschließend explizit.

Lokal testen: `vite preview` bringt dafür ein kleines Middleware-Plugin mit
(`deepLinkPreview()` in `packages/landing/vite.config.ts`).

## 4. App-Seite

| Ort | Aufgabe |
|---|---|
| `packages/shared/src/deeplink.ts` | Links bauen, Codes aus beliebigem Text extrahieren |
| `packages/app/src/store/shareImport.ts` | Code → valider `Anchor` (Sanitisierung, IDs, Zeitstempel) |
| `packages/app/src/screens/ShareSheet.tsx` | „Als Link“ teilen, Link kopieren, QR enthält den Link, Import-Feld |
| `packages/app/src/screens/AppShell.tsx` | Kaltstart über `App.getLaunchUrl()`, Laufzeit über `appUrlOpen`, plus `?code=`/Fragment im Web-Build |
| `packages/app/android/.../AndroidManifest.xml` | Intent-Filter für `wai://anchor` |

Bewusste Entscheidung: **keine** Android App Links (`autoVerify`) auf
`https://…/a/`. Die Verifikation verlangt `/.well-known/assetlinks.json` in der
**Domain-Wurzel**; die Seite liegt aber unter einem Projektpfad (`/wAI/`) und
kann diese Datei dort nicht anbieten. Der `intent://`-Link mit
`package=dev.andrexthedev.wai` und `S.browser_fallback_url` erreicht dasselbe
Ziel ohne Verifikation — und fällt sauber auf die Web-Vorschau zurück, wenn die
App fehlt.

## 5. Prüfen

```bash
npm test -w @wai/shared                 # Link-/Deep-Link-Fälle
npm run smoke:render -w @wai/app        # 6 Link-Formen + 4 abgelehnte Eingaben
npm run smoke:render -w @wai/landing    # /a/ in drei Zuständen, DE + EN
npm run verify                           # alles zusammen
```

Ein echter Gerätetest bleibt nötig: APK installieren, Link aus einem Messenger
öffnen, Anker importieren, Flugmodus einschalten und zurückfinden.
