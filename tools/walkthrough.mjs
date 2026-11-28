#!/usr/bin/env node
/**
 * Nutzer-Workflow prüfen – in der laufenden App, nicht im Quellcode.
 *
 *   node tools/walkthrough.mjs [--url http://127.0.0.1:5174] [--out docs/WALKTHROUGH.md]
 *                              [--chromium /pfad/zum/chrome] [--shots .walkthrough]
 *
 * `--chromium` ist für Umgebungen gedacht, in denen `npx playwright install`
 * scheitert (fehlende NSS-Bibliotheken). Auf einem Runner genügt der Standard.
 *
 * Warum das existiert
 * -------------------
 * `check-store-listing.mjs` prüft Dateien, `check-claims.mjs` prüft Behauptungen,
 * der Screenshot-Lauf prüft neun Bilder. Was keiner davon prüft, ist der Weg:
 * Startet die App verständlich? Führt jeder Knopf dorthin, wo sein Text sagt?
 * Steht irgendwo ein Platzhalter, ein `undefined` oder ein englischer Satz in der
 * deutschen Oberfläche?
 *
 * Dieses Skript klickt den Workflow durch wie ein ungeduldiger Erstnutzer. Jeder
 * Schritt liest den sichtbaren Text, alle bedienbaren Elemente und alle
 * ARIA-Labels und meldet, was nach Fehler aussieht. Das Ergebnis ist eine
 * Markdown-Datei im Repo – lesbar ohne Artefakt-Download, prüfbar per git.
 *
 * Die Prüfungen sind bewusst *Befunde*, keine Urteile: was hier auffällt, muss
 * ein Mensch entscheiden. Nur die harten Fälle (undefined, Platzhalter,
 * Schrift „null") lassen den Lauf scheitern.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const getArg = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};

const url = getArg('url', 'http://127.0.0.1:5174');
const outFile = path.resolve(ROOT, getArg('out', 'docs/WALKTHROUGH.md'));
const shotDir = path.resolve(ROOT, getArg('shots', '.walkthrough'));

/** Wie ein Handy: 412×732 CSS-Pixel, wie im Screenshot-Workflow. */
const VIEWPORT = { width: 412, height: 732 };

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  console.error('✖ Playwright fehlt:  npm i -D playwright  &&  npx playwright install chromium');
  process.exit(2);
}

/**
 * Chromium suchen: erst der Schalter, dann die Umgebung, sonst der von
 * Playwright verwaltete Browser. In einer Umgebung ohne `playwright install`
 * (fehlende NSS-Bibliotheken) zeigt `--chromium` auf ein eigenes Binary; dann
 * braucht es eventuell `LD_LIBRARY_PATH` auf dessen `lib`-Ordner.
 */
const executablePath = getArg('chromium', process.env.WAI_CHROMIUM || undefined);

let browser;
try {
  browser = await chromium.launch({
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
    ...(executablePath ? { executablePath } : {}),
  });
} catch (error) {
  console.error('✖ Kein steuerbarer Chromium:', String(error).split('\n')[0]);
  process.exit(2);
}

mkdirSync(shotDir, { recursive: true });

/**
 * Muster, die in einer Auslieferung nie vorkommen dürfen. Jede Zeile trägt den
 * Grund bei sich, damit der Bericht ohne Nachschlagen lesbar ist.
 */
const SUSPICIOUS = [
  { re: /\bundefined\b/i, reason: 'Platzhalter aus dem Code sichtbar' },
  { re: /\bNaN\b/, reason: 'Rechnung ohne Ergebnis' },
  { re: /\bnull\b/i, reason: 'Rohwert statt Text' },
  { re: /\{\w+\}/, reason: 'unersetzter Platzhalter' },
  { re: /\(\d*\)\s*(Etage|floor)/i, reason: 'Plural-Platzhalter „(n)"' },
  { re: /\bEtage\(n\)|\bfloor\(s\)/i, reason: 'Plural-Platzhalter' },
  { re: /\$t\(|TODO|FIXME|lorem ipsum/i, reason: 'Entwicklertext' },
  /**
   * Ein unaufgelöster Schlüssel erscheint als `app.irgendwas.text` im Bild –
   * genau das ist mit `app.features.night` passiert und blieb monatelang
   * unbemerkt, weil keine Prüfung je in die App geschaut hat.
   */
  { re: /\b(?:app|common|landing|legal)\.[a-z][a-zA-Z0-9]*(?:\.[a-zA-Z0-9]+)+/, reason: 'roher Übersetzungsschlüssel' },
  /** „2.4 m" in der deutschen Oberfläche – Dezimalpunkt statt Komma. */
  { re: /\d\.\d\s*(m|km|ft|mi)\b/, reason: 'Dezimalpunkt in deutscher Ansicht' },
  { re: /\bTap to save your current location\b/, reason: 'alter, zu langer Hinweis' },
];

/** Erwartete Sprache je Ansicht – ein deutscher Satz in der EN-Fassung ist ein Fehler. */
const GERMAN_MARKERS = /\b(und|nicht|dein|deine|Anker|Einstellungen|Zurück|Speichern|Abbrechen)\b/;
const ENGLISH_MARKERS = /\b(the|your|and|with|Save|Cancel|Settings|Back)\b/;

const results = [];
const issues = [];
const records = [];

const log = (line) => console.log(line);

async function textOf(page) {
  return page.evaluate(() => document.body.innerText.replace(/\n{3,}/g, '\n\n').trim());
}

/**
 * Alle bedienbaren Elemente mit Beschriftung. Leere Knöpfe und englische
 * ARIA-Labels fallen hier auf, nicht erst bei einem Screenreader.
 */
async function controlsOf(page) {
  return page.evaluate(() => {
    const label = (node) => {
      const text = (node.innerText ?? '').replace(/\s+/g, ' ').trim();
      const aria = (node.getAttribute('aria-label') ?? '').trim();
      const title = (node.getAttribute('title') ?? '').trim();
      return text || aria || title;
    };
    return Array.from(document.querySelectorAll('button, a[href], [role="button"], [role="tab"], [role="switch"]'))
      .filter((node) => node.offsetParent !== null)
      .map((node) => ({
        tag: node.tagName.toLowerCase(),
        role: node.getAttribute('role') ?? '',
        text: label(node),
        aria: (node.getAttribute('aria-label') ?? '').trim(),
        pressed: node.getAttribute('aria-pressed') ?? node.getAttribute('aria-checked') ?? '',
        disabled: node.hasAttribute('disabled'),
      }));
  });
}

/** Ist die Seite über die Tab-Leiste hinausgerutscht? Gleiche Messung wie im Capture. */
async function layoutOf(page) {
  return page.evaluate(() => {
    const box = (selector) => {
      const node = document.querySelector(selector);
      if (!node) return null;
      const r = node.getBoundingClientRect();
      return { top: Math.round(r.top), bottom: Math.round(r.bottom), height: Math.round(r.height) };
    };
    return {
      viewportHeight: window.innerHeight,
      app: box('.app'),
      body: box('.app__body'),
      tabbar: box('.tabbar'),
      sheet: box('.sheet'),
      scroll: (() => {
        const node = document.querySelector('.app__body');
        return node ? node.scrollHeight - node.clientHeight : 0;
      })(),
      /**
       * Abgeschnittene Texte: `text-overflow: ellipsis` ist ehrlich, versteckt
       * aber Inhalt. Der englische Untertitel las sich als „ENVIRONMENTAL
       * MEMORY ANC…" – im Bild sah das nach einem Fehler aus, in keiner Prüfung
       * nach irgendetwas. Gesucht wird nur bei Elementen, die ausdrücklich
       * kürzen dürfen; ein zufälliger Überlauf ist ein Layoutfehler und wäre
       * schon oben aufgefallen.
       */
      truncated: (() => {
        /**
         * Ist der *Text* breiter als sein Kasten?
         *
         * `scrollWidth > clientWidth` ist der falsche Vergleich, seit Knöpfe
         * eine unsichtbare Trefferfläche als `::after` tragen: ein 37 px breiter
         * Chip mit 44 px Trefferfläche meldet `scrollWidth = 40`, obwohl im Bild
         * nichts fehlt. Genau so wurden drei vollständig lesbare Chips als
         * „abgeschnitten" gemeldet – ein Fehlalarm macht den nächsten echten
         * Fund unglaubwürdig. Gemessen wird deshalb die Textstrecke selbst.
         */
        const overflows = (node) => {
          const box = node.getBoundingClientRect();
          if (box.width === 0) return false;
          const range = document.createRange();
          range.selectNodeContents(node);
          const ink = range.getBoundingClientRect();
          range.detach?.();
          if (ink.width === 0) return false;
          const padRight = parseFloat(getComputedStyle(node).paddingRight) || 0;
          return ink.right - (box.right - padRight) > 1;
        };
        return Array.from(document.querySelectorAll('.topbar__sub, .topbar__name, .tab, .chip'))
          .filter((node) => node.offsetParent !== null && overflows(node))
          .map((node) => (node.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 40));
      })(),
    };
  });
}

/** Klickt das erste sichtbare Element, dessen Text (oder aria-label) passt. */
async function tap(page, patterns, { within = null, waitMs = 550, exclude = [] } = {}) {
  const list = (Array.isArray(patterns) ? patterns : [patterns]).filter(Boolean);
  const hit = await page.evaluate(
    ({ texts, scope, skip }) => {
      const root = scope
        ? Array.from(document.querySelectorAll('*')).find((n) =>
            (n.textContent ?? '').replace(/\s+/g, ' ').includes(scope) &&
            n.querySelector('button, a[href], [role="button"]'),
          )
        : document;
      const nodes = Array.from(
        (root ?? document).querySelectorAll('button, a[href], [role="button"], [role="tab"]'),
      ).filter((node) => node.offsetParent !== null);
      for (const node of nodes) {
        const text = (node.innerText ?? '').replace(/\s+/g, ' ').trim();
        const aria = (node.getAttribute('aria-label') ?? '').trim();
        const match = texts.some(
          (t) => text === t || text.startsWith(t) || aria === t || aria.startsWith(t),
        );
        /**
         * `exclude` ist nötig, weil `startsWith` sonst den erstbesten Treffer
         * nimmt: „Wähle einen Anker" beginnt auch mit „Wähle…", und der Knopf
         * „Finden" in der Tab-Leiste beginnt mit „Finden".
         */
        const blocked = skip.some((t) => text === t || text.startsWith(t) || aria === t || aria.startsWith(t));
        if (!match || blocked) continue;
        node.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        return text || aria;
      }
      return null;
    },
    { texts: list, scope: within, skip: Array.isArray(exclude) ? exclude : [exclude] },
  );
  await page.waitForTimeout(waitMs);
  return hit;
}

/**
 * Ein Schritt im Workflow: aufnehmen, prüfen, weitergehen.
 * `expect` ist die Zusage, die der Bildschirm einlösen muss.
 */
async function step(page, view, { expect = [], note = '', shot = true, ignoreCase = false } = {}) {
  const text = await textOf(page);
  const controls = await controlsOf(page);
  const layout = await layoutOf(page);
  const findings = [];

  for (const pattern of SUSPICIOUS) {
    const match = text.match(pattern.re);
    if (match) findings.push(`Text enthält „${match[0]}" (${pattern.reason})`);
  }
  for (const wanted of expect) {
    const present = ignoreCase
      ? text.toLocaleLowerCase('de').includes(wanted.toLocaleLowerCase('de'))
      : text.includes(wanted);
    if (!present) findings.push(`erwartet „${wanted}" fehlt`);
  }
  const emptyButtons = controls.filter((c) => !c.text);
  if (emptyButtons.length) findings.push(`${emptyButtons.length} Knopf/Knöpfe ohne Beschriftung`);
  const englishAria = controls.filter((c) => c.aria && ENGLISH_MARKERS.test(c.aria) && GERMAN_MARKERS.test(text));
  if (englishAria.length) {
    findings.push(`englische ARIA-Labels in deutscher Ansicht: ${englishAria.map((c) => `„${c.aria}"`).join(', ')}`);
  }
  if (layout.app && layout.app.bottom > layout.viewportHeight + 1) {
    findings.push(`.app ragt ${layout.app.bottom - layout.viewportHeight} px unter den Viewport`);
  }
  if (layout.body && layout.tabbar && layout.body.bottom > layout.tabbar.top + 1) {
    findings.push('Inhalt liegt hinter der Tab-Leiste');
  }
  if (layout.sheet && layout.sheet.bottom > layout.viewportHeight + 1) {
    findings.push('Sheet ragt unter den Viewport');
  }
  if (layout.truncated.length) {
    findings.push(`abgeschnittener Text: ${layout.truncated.map((t) => `„${t}…"`).join(', ')}`);
  }

  /**
   * Ein leerer Bildschirm ist kein „nichts zu beanstanden", sondern ein Absturz:
   * nach einem React-Fehler bleibt der Baum leer und `innerText` ist ''.
   */
  if (text.trim().length < 4) {
    findings.push('Bildschirm ist leer – wahrscheinlich ein Absturz beim Rendern');
  }

  const file = path.join(shotDir, `${String(results.length).padStart(2, '0')}-${view.replace(/\W+/g, '-')}.png`);
  if (shot) await page.screenshot({ path: file }).catch(() => {});

  results.push({ view, note, layout, controls, text });
  if (findings.length) {
    issues.push({ view, findings, text });
    log(`  ! ${view}: ${findings.join(' · ')}`);
  } else {
    log(`  ✔ ${view}`);
  }
  return { text, controls, layout, findings };
}

/**
 * Der Bericht wird committet – deshalb darf er sich nicht bei jedem Lauf ändern.
 * Zwei Dinge schwanken von Natur aus: der Kompasskurs (das Gerät dreht sich
 * minimal) und die Scrollhöhe (eine Animation war noch nicht fertig). Beides
 * wird für den Bericht geglättet, damit ein Diff nur echte Änderungen zeigt.
 */
const stable = (text) =>
  text
    // Peilung: „NO 27°" → „NO NN°"
    .replace(/\b[NSOW]{1,2}\s+\d{1,3}°/g, (match) => `${match.replace(/\d{1,3}/, 'NN')}`)
    .replace(/±\s*\d+([.,]\d+)?\s*m/g, '±N m')
    /** Entfernungen: die Demo-Position wandert, „2,4 m" ist keine Aussage. */
    .replace(/\b\d+([.,]\d+)?\s*(m|km|ft|mi)\b/g, 'N $2')
    /**
     * Laufende Zeiten: „24 Min.", „1 Std. 35 Min.", „12 s". Kein `\b` nach der
     * Einheit – „Min." endet auf einen Punkt, und dahinter ist keine Wortgrenze
     * mehr, also griff die Regel nie.
     */
    .replace(/\b\d+\s*(Min\.|Std\.|h\b|s\b)/g, 'N $1')
    .replace(/\b\d{1,3}°/g, 'NN°');

/**
 * Sitzung starten. `onboarding: false` überspringt die Einführung, weil die
 * eigenen Schritte dafür da sind.
 */
async function session({ locale = 'de', onboarding = false, anchors = false, viewport = VIEWPORT } = {}) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 2,
    locale: locale === 'de' ? 'de-DE' : 'en-US',
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  page.on('pageerror', (error) => {
    records.push({ kind: 'js-error', message: String(error).slice(0, 200) });
  });
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });
  await page.waitForTimeout(600);

  if (onboarding) await page.evaluate(() => window.localStorage.clear());
  else
    await page.evaluate(
      ({ loc }) => {
        window.localStorage.setItem(
          'wai.v1.settings',
          JSON.stringify({ locale: loc, theme: 'dark', proximity: false, units: 'metric', onboardingDone: true }),
        );
      },
      { loc: locale },
    );

  if (anchors) {
    await page.evaluate(() => {
      const now = Date.now();
      const base = { category: 'other', altitude: 411, floorLabel: '', createdAt: now, updatedAt: now, photos: [], voices: [], trail: [], favorite: false, archived: false };
      const anchors = [
        { ...base, id: 'w-a', name: 'Mein Auto · Säule B17', category: 'car', lat: 48.1362, lng: 11.5832, floorLabel: '−3', zone: 'Zone B · 2,50 €/h', note: 'Rechts neben dem blauen Pfeiler.', parking: { startedAt: now - 95 * 60000, limitMinutes: 120, reminderState: 'scheduled' } },
        { ...base, id: 'w-b', name: 'Wegkreuzung West', category: 'nature', lat: 48.1349, lng: 11.5818 },
      ];
      window.localStorage.setItem('wai.v1.anchors', JSON.stringify(anchors));
    });
  }

  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  return { context, page };
}

/* ============================================================
   1. Erststart: kann jemand ohne Anleitung loslegen?
   ============================================================ */
async function journeyFirstRun() {
  const { context, page } = await session({ onboarding: true });
  const first = await step(page, 'Erststart: Begrüßung', { expect: ['Willkommen bei wAI', 'Ein Tipp reicht'] });
  if (!/Überspringen|Skip/.test(first.text)) {
    issues.push({ view: 'Erststart: Begrüßung', findings: ['kein Ausweg ohne Berechtigungen'], text: first.text });
  }

  // Drei Folien, dann die Berechtigungsseite. Der Text des Knopfes ist
  // „Weiter" – vorher prüfte dieses Skript auf „Erlauben" und meldete damit
  // seinen eigenen Fehler, nicht den der App.
  for (let i = 1; i <= 3; i += 1) {
    const next = await tap(page, ['Weiter', 'Next']);
    if (!next) issues.push({ view: `Erststart: Folie ${i}`, findings: ['kein „Weiter"-Knopf'], text: '' });
    await step(page, `Erststart: Folie ${i + 1}`, { expect: [] });
  }

  const allow = await tap(page, ['Berechtigungen erteilen', 'Grant permissions']);
  if (!allow) issues.push({ view: 'Erststart: Berechtigungen', findings: ['kein Knopf „Berechtigungen erteilen"'], text: '' });
  await page.waitForTimeout(1500);
  const { text: after } = await step(page, 'Erststart: nach Berechtigungen', { expect: [] });
  /**
   * Nach dem Antrag muss entweder die App da sein oder ein erklärter Zustand.
   * Vorher galt jeder Ausgang als Erfolg: der Bildschirm schloss sich auch,
   * wenn der Nutzer alles abgelehnt hatte.
   */
  const onHome = /Anker setzen/.test(after);
  const explained = /nichts erlaubt|nothing was granted/i.test(after);
  if (!onHome && !explained) {
    issues.push({
      view: 'Erststart: nach Berechtigungen',
      findings: ['weder Startbildschirm noch Erklärung – die Einführung bleibt stehen, ohne zu sagen warum'],
      text: after,
    });
  }
  if (onHome) {
    const accuracy = /Genauigkeit|Accuracy/.test(after);
    if (!accuracy) issues.push({ view: 'Erststart: Startbildschirm', findings: ['keine Genauigkeitsangabe unter dem Ring'], text: after });
  }

  // Der Hinweis unter dem Ring muss die Genauigkeit zeigen, nicht den Demo-Status.
  const text = await textOf(page);
  if (!/Genauigkeit|Accuracy/.test(text)) {
    issues.push({ view: 'Erststart: Startbildschirm', findings: ['keine Genauigkeitsangabe unter dem Ring'], text });
  }
  await context.close();
}

/* ============================================================
   2. Anker setzen: der Kern in einem Tipp
   ============================================================ */
async function journeySetAnchor() {
  const { context, page } = await session();
  await step(page, 'Start ohne Anker', { expect: ['Anker setzen'] });

  const hit = await tap(page, ['Anker setzen']);
  if (!hit) issues.push({ view: 'Anker setzen', findings: ['Ring nicht klickbar'], text: '' });
  // Die Überschriften im Editor stehen in Großbuchstaben (CSS), im Text also
  // „TITEL"/„KATEGORIE" – der Vergleich ist deshalb ohne Rücksicht auf Schreibweise.
  await step(page, 'Editor nach dem Setzen', { expect: ['Titel', 'Kategorie'], ignoreCase: true });

  // Etage ist der Kern-USP: prüfen, dass die Presets da sind.
  const etage = await tap(page, ['−3', '-3']);
  if (!etage) issues.push({ view: 'Editor: Etage', findings: ['kein Etagen-Preset'], text: '' });

  // Der Knopf heißt „Anker speichern", nicht „Speichern" – vorher scheiterte
  // dieser Schritt an einer falschen Erwartung im Skript.
  const saved = await tap(page, ['Anker speichern', 'Save anchor', 'Speichern']);
  if (!saved) issues.push({ view: 'Editor: Speichern', findings: ['kein Speichern-Knopf'], text: '' });
  await page.waitForTimeout(800);
  const { text } = await step(page, 'Start mit einem Anker', { expect: ['Anker'] });
  /**
   * Nach dem Speichern muss der neue Anker in der Liste stehen. „Unbenannter
   * Anker" ist der ehrliche Platzhalter für einen Anker ohne Titel – der Test
   * suchte vorher nach „Mein Auto", das hier niemand eingetippt hatte.
   */
  if (!/Unbenannter Anker|Unnamed anchor|Anker gesetzt/.test(text)) {
    issues.push({ view: 'Start mit einem Anker', findings: ['der gespeicherte Anker erscheint nicht in der Liste'], text });
  }
  await context.close();
}

/* ============================================================
   2b. Rückgängig: nimmt der Knopf den Anker wirklich zurück?
   ============================================================ */
async function journeyUndo() {
  /**
   * „Anker setzen" legt sofort einen Anker an und zeigt dazu die Meldung
   * „Anker gesetzt · Rückgängig". Der Knopf hatte einen leeren Handler: er war
   * sichtbar, bedienbar und tat nichts. Ein Nutzer, der sich vertippt, bekam
   * seinen Anker also nicht mehr weg – und im Free-Tarif zählt jeder Anker
   * gegen das Limit von drei.
   *
   * Der Schritt zählt die Anker vorher und nachher, statt nur zu prüfen, dass
   * der Knopf da ist: genau das war ja der Fehler.
   */
  const { context, page } = await session();
  const count = () =>
    page.evaluate(() => {
      try {
        return JSON.parse(window.localStorage.getItem('wai.v1.anchors') ?? '[]').length;
      } catch {
        return -1;
      }
    });

  await tap(page, ['Anker setzen']);
  await step(page, 'Rückgängig: nach dem Setzen', { expect: ['Anker gesetzt'], shot: false });
  const afterCreate = await count();
  const undo = await tap(page, ['Rückgängig', 'Undo']);
  if (!undo) {
    issues.push({ view: 'Rückgängig', findings: ['keine „Rückgängig"-Aktion nach dem Setzen'], text: await textOf(page) });
  }
  await page.waitForTimeout(700);
  const afterUndo = await count();
  if (afterCreate < 1) {
    issues.push({ view: 'Rückgängig', findings: ['„Anker setzen" hat keinen Anker angelegt'], text: '' });
  } else if (afterUndo >= afterCreate) {
    issues.push({
      view: 'Rückgängig',
      findings: [`„Rückgängig" ließ ${afterUndo} statt ${afterCreate - 1} Anker übrig – der Knopf tut nichts`],
      text: await textOf(page),
    });
  }
  await step(page, 'Rückgängig: danach wieder leer', { expect: ['Anker setzen'], shot: false });
  await context.close();
}

/* ============================================================
   3. Wiederfinden: Kompass, Karte, Spur, Foto
   ============================================================ */
async function journeyFind() {
  const { context, page } = await session({ anchors: true });

  // Erst der kurze Weg von der Startseite: die Auto-Kachel.
  const opened = await tap(page, ['Zum Auto', 'To the car']);
  if (!opened) issues.push({ view: 'Finden', findings: ['kein „Zum Auto" auf der Auto-Kachel'], text: '' });
  await step(page, 'Finden: Kompass', { expect: ['LUFTLINIE'] });
  const backHome = await tap(page, ['Zurück', 'Back']);
  if (!backHome) issues.push({ view: 'Finden: zurück', findings: ['kein Zurück-Knopf'], text: '' });
  await step(page, 'Zurück in der Liste', { expect: ['Anker'] });

  /**
   * Und jetzt der Weg, den ein Neuling nimmt: unten auf „Finden" tippen, dann
   * ein Ziel aus der Liste wählen. Genau der war kaputt – jeder Eintrag führte
   * zurück zur Ankerliste, und ohne Auswahl sprang der Reiter stillschweigend
   * auf den ersten Anker.
   */
  await tap(page, ['Finden'], { exclude: ['Zurück'] });
  const choose = await step(page, 'Finden: Liste', { expect: ['Wähle einen Anker', 'Mein Auto'] });
  if (!choose.text.includes('Mein Auto')) {
    issues.push({ view: 'Finden: Liste', findings: ['der Anker fehlt in der Auswahlliste des Fund-Reiters'], text: choose.text });
  }
  const picked = await tap(page, ['Mein Auto']);
  await page.waitForTimeout(700);
  const { text: pickedText } = await step(page, 'Finden: Auswahl aus dem Reiter', { expect: [] });
  if (!/LUFTLINIE|Luftlinie|Distance/.test(pickedText)) {
    issues.push({
      view: 'Finden: Auswahl aus dem Reiter',
      findings: ['nach dem Tippen auf einen Anker startet keine Rückführung – man landet wieder in der Liste'],
      text: pickedText,
    });
  }

  for (const [label, view] of [
    [['Karte', 'Map'], 'Finden: Karte'],
    [['Spur', 'Trail'], 'Finden: Spur'],
    [['Foto', 'Photo'], 'Finden: Foto'],
    [['Kompass', 'Compass'], 'Finden: zurück zum Kompass'],
  ]) {
    const hit = await tap(page, label, { waitMs: 900 });
    if (!hit) issues.push({ view, findings: ['Reiter nicht auffindbar'], text: '' });
    await step(page, view, { shot: false });
  }

  await context.close();
}

/* ============================================================
   4. Pro-Gates: führen sie zur Erklärung oder ins Leere?
   ============================================================ */
async function journeyProGates() {
  const { context, page } = await session({ anchors: true });
  const card = await tap(page, ['Mein Auto'], { within: 'Mein Auto' });
  if (!card) issues.push({ view: 'Pro-Gates', findings: ['Ankerkarte nicht klickbar'], text: '' });
  await page.waitForTimeout(400);
  await step(page, 'Editor eines Ankers', { expect: ['Teilen'] });

  const fav = await tap(page, ['Favorit', 'Favourite']);
  await step(page, 'Favorit im Free-Tarif', { expect: ['Pro'] });
  if (!/Pro/.test(await textOf(page))) {
    issues.push({ view: 'Favorit im Free-Tarif', findings: ['kein Pro-Hinweis nach dem Tippen auf Favorit'], text: '' });
  }
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  await context.close();
}

/* ============================================================
   5. Teilen: ist der Code kopierbar und der Link verständlich?
   ============================================================ */
async function journeyShare() {
  const { context, page } = await session({ anchors: true });
  await tap(page, ['Mein Auto'], { within: 'Mein Auto' });
  await page.waitForTimeout(400);
  await tap(page, ['Teilen', 'Share']);
  await page.waitForTimeout(500);
  const { text } = await step(page, 'Teilen', { expect: ['Kein Server'] });
  if (!/WAIX1\./.test(text)) issues.push({ view: 'Teilen', findings: ['kein teilbarer Code sichtbar'], text });
  await context.close();
}

/* ============================================================
   6. Suche und Filter: findet man, was man sucht?
   ============================================================ */
async function journeySearch() {
  const { context, page } = await session({ anchors: true });
  const field = await page.$('input[type="search"], input[placeholder]');
  if (!field) {
    issues.push({ view: 'Suche', findings: ['kein Suchfeld auf der Startseite'], text: '' });
  } else {
    await field.fill('Auto');
    await page.waitForTimeout(500);
    const { text } = await step(page, 'Suche nach „Auto"', { expect: ['Mein Auto'] });
    if (text.includes('Wegkreuzung')) {
      issues.push({ view: 'Suche nach „Auto"', findings: ['nicht passender Anker bleibt in der Trefferliste'], text });
    }
    // Ein Kreuz zum Löschen, nicht zwei: Chromes eigenes Kreuz plus unser Knopf.
    const crosses = await page.evaluate(() => {
      const input = document.querySelector('input[type="search"]');
      return {
        ourButtons: Array.from(document.querySelectorAll('.search button')).length,
        nativeAppearance: input ? getComputedStyle(input).getPropertyValue('-webkit-appearance') : '',
      };
    });
    if (crosses.ourButtons > 1) {
      issues.push({ view: 'Suche nach „Auto"', findings: [`${crosses.ourButtons} Löschknöpfe im Suchfeld`], text });
    }
    await field.fill('zzz-nichts');
    await page.waitForTimeout(500);
    const { text: none } = await step(page, 'Suche ohne Treffer', { expect: ['Kein Treffer'] });
    if (!/Filter zurücksetzen/.test(none)) {
      issues.push({ view: 'Suche ohne Treffer', findings: ['kein Weg aus dem Leerzustand'], text: none });
    }
    // Und der Weg heraus muss auch funktionieren.
    await tap(page, ['Filter zurücksetzen']);
    await page.waitForTimeout(400);
    const { text: reset } = await step(page, 'Nach dem Zurücksetzen', { expect: ['Mein Auto'] });
    if (!/Mein Auto/.test(reset)) {
      issues.push({ view: 'Nach dem Zurücksetzen', findings: ['„Filter zurücksetzen" holt die Anker nicht zurück'], text: reset });
    }
  }
  await context.close();
}

/* ============================================================
   7. Einstellungen, Hilfe, Archiv, Pro – der Rest der Leiste
   ============================================================ */
async function journeyTabs() {
  const { context, page } = await session({ anchors: true });

  await tap(page, ['Einstellungen', 'Settings']);
  const settingsStep = await step(page, 'Einstellungen', { expect: ['Sprache', 'Alles offline', 'Rückmeldung'] });

  /**
   * Der Schalter „Näher-dran-Signal" darf sich im Free-Tarif nicht so anfühlen,
   * als wäre er an: vorher stand er auf „an", war aber wirkungslos. Er muss
   * entweder aus sein oder das Pro-Sheet öffnen.
   */
  const proximity = await page.evaluate(() => {
    const node = Array.from(document.querySelectorAll('[role="switch"]')).find(
      (el) => el.getAttribute('aria-label') === 'Näher-dran-Signal' || el.getAttribute('aria-label') === 'Getting-closer signal',
    );
    return node ? { checked: node.getAttribute('aria-checked'), disabled: node.getAttribute('aria-disabled') } : null;
  });
  if (proximity && proximity.checked === 'true') {
    issues.push({
      view: 'Einstellungen',
      findings: ['„Näher-dran-Signal" steht im Free-Tarif auf an, obwohl es Pro ist'],
      text: settingsStep.text,
    });
  }

  const { text } = await step(page, 'Einstellungen: unten', { expect: [] });
  // Scrollen bis ans Ende: steht dort etwas Unerwartetes?
  await page.evaluate(() => {
    const body = document.querySelector('.app__body');
    if (body) body.scrollTop = body.scrollHeight;
  });
  await page.waitForTimeout(300);
  await step(page, 'Einstellungen: Ende der Seite', { shot: false });

  await tap(page, ['Archiv', 'Archive']);
  const archive = await step(page, 'Archiv', { expect: [] });
  /**
   * Im Free-Tarif ist das Archiv gesperrt. Dann muss der Bildschirm das sagen –
   * und zwar mit einem Grund, der stimmt: „Archiviere einen Anker" schickte
   * Nutzer zu einer Funktion, die sie nicht haben.
   */
  if (/Archiviere einen Anker|Archive an anchor/.test(archive.text)) {
    issues.push({
      view: 'Archiv',
      findings: ['der Text schickt zum Archivieren, obwohl Archivieren selbst Pro ist'],
      text: archive.text,
    });
  }

  await tap(page, ['Anker', 'Anchors']);
  await tap(page, ['Pro', 'Freischalten']);
  await step(page, 'Pro-Sheet', { expect: ['14,99'] });
  /**
   * Zwei Knöpfe mit demselben Text hintereinander sind ein Klassiker: unten ein
   * „Aktivieren", das nur den Reiter wechselt, und im Inhalt noch einmal einer,
   * der wirklich prüft. Hier wird nachgesehen, ob der untere Knopf nach dem
   * Tippen etwas anderes ist als vorher.
   */
  const before = await page.evaluate(() => document.querySelector('.sheet__foot')?.innerText.trim() ?? '');
  await tap(page, ['Aktivieren', 'Activate']).catch(() => {});
  await page.waitForTimeout(500);
  const after = await page.evaluate(() => document.querySelector('.sheet__foot')?.innerText.trim() ?? '');
  if (before && after && before === after && /Aktivieren|Activate/.test(before)) {
    issues.push({
      view: 'Pro-Sheet',
      findings: [`der Knopf „${before}" tut sichtbar nichts – danach steht er unverändert da`],
      text: after,
    });
  }
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);

  const help = await tap(page, ['Hilfe', 'Help', 'So funktioniert']);
  if (help) {
    await step(page, 'Hilfe', { expect: [] });
    /**
     * Ein Sheet, das mitten im Inhalt aufgeht, ist ein Fehler: oben fehlt die
     * Überschrift. „Hilfe & Fragen" sprang zur ersten FAQ, weil der Fokus auf
     * dem ersten Knopf lag.
     */
    const scrolled = await page.evaluate(() => {
      const body = document.querySelector('.sheet__body');
      return body ? body.scrollTop : 0;
    });
    if (scrolled > 2) {
      issues.push({ view: 'Hilfe', findings: [`Sheet öffnet ${scrolled} px unterhalb des Anfangs`], text: '' });
    }
  } else issues.push({ view: 'Hilfe', findings: ['kein Hilfe-Einstieg auffindbar'], text: '' });
  await context.close();
}

/* ============================================================
   7b. Kleines Telefon: passt alles noch?
   ============================================================ */
async function journeySmallPhone() {
  /**
   * 360 × 640 war lange die kleinste übliche Android-Größe. Bei 412 px passte
   * der englische Untertitel nach einer Korrektur, bei 360 px wurde aus
   * „UMGEBUNGS-GEDÄCHTNISANKER" ein „UMGEBUNGS-GEDÄCHTN…". Ohne diesen Durchlauf
   * wäre das erst auf einem fremden Gerät aufgefallen.
   */
  const { context, page } = await session({ anchors: true, viewport: { width: 360, height: 640 } });
  const home = await step(page, 'Kleines Telefon: Start', { expect: ['Anker setzen'] });
  if (home.layout.app && home.layout.app.bottom > home.layout.viewportHeight + 1) {
    issues.push({ view: 'Kleines Telefon: Start', findings: ['die App ist höher als der Bildschirm'], text: home.text });
  }
  await tap(page, ['Einstellungen', 'Settings']);
  await step(page, 'Kleines Telefon: Einstellungen', { expect: ['Sprache'] });
  await context.close();

  /**
   * 320 × 568 ist das kleinste Gerät, das noch in Gebrauch ist (iPhone SE der
   * ersten Generation, ältere Androids). Dort war der Untertitel unter dem
   * Markennamen abgeschnitten – in beiden Sprachen, denn „Environmental Memory
   * Anchor" ist länger als „UMGEBUNGS-GEDÄCHTNISANKER". `step` prüft
   * abgeschnittenen Text an `.topbar__sub` von sich aus; hier geht es darum,
   * dass die kleinste Breite überhaupt einmal gemessen wird.
   */
  const tiny = await session({ anchors: true, viewport: { width: 320, height: 568 }, locale: 'en' });
  await step(tiny.page, 'Sehr kleines Telefon (EN)', { expect: ['Anchors'] });
  await tap(tiny.page, ['Settings', 'Einstellungen']);
  await step(tiny.page, 'Sehr kleines Telefon: Einstellungen (EN)', { expect: ['Language'] });
  await tiny.context.close();
}

/* ============================================================
   7c. Große Systemschrift: bleibt die App bedienbar?
   ============================================================ */
async function journeyLargeText() {
  /**
   * Die App hatte 93 Schriftgrößen in px und keine einzige in rem: wer auf dem
   * Telefon 200 % Schrift einstellte, sah exakt dieselbe 15-px-Schrift wie
   * vorher. Das ist für viele Menschen die einzige Möglichkeit, die App
   * überhaupt zu lesen – und `docs/DESIGN_SYSTEM.md` behauptete seit jeher das
   * Gegenteil („all sizes in rem inside the app shell").
   *
   * Alle Schriftgrößen stehen jetzt in rem bei einer Wurzel von 10 px; dieser
   * Durchlauf prüft bei 320 dp und 200 %, dass dabei nichts aus dem Bild
   * rutscht: keine Seite darf breiter sein als der Bildschirm, und die vier
   * Reiter der Tab-Leiste müssen vollständig lesbar bleiben.
   */
  for (const [width, scale, label] of [
    [320, 20, 'Große Schrift: 320 dp · 200 %'],
    [412, 15, 'Große Schrift: 412 dp · 150 %'],
  ]) {
    const { context, page } = await session({ anchors: true, viewport: { width, height: 700 } });
    // `font-size` auf der Wurzel ist genau das, was der Browser bei „Schrift
    // vergrößern" tut.
    await page.addStyleTag({ content: `html { font-size: ${scale}px }` });
    await page.waitForTimeout(600);
    await step(page, label, { expect: ['Anker'], shot: false });

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (overflow > 1) {
      issues.push({ view: label, findings: [`die Seite ist ${overflow} px breiter als der Bildschirm`], text: '' });
    }
    /**
     * Ein Reiter, der seine Beschriftung nicht mehr zeigt, ist ein toter Knopf:
     * man weiß nicht, wohin er führt. `scrollWidth > clientWidth` ist genau
     * dieser Fall – auch wenn CSS-`overflow` ihn unsichtbar macht.
     */
    const clipped = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.tab'))
        .filter((tab) => tab.scrollWidth > tab.clientWidth + 1)
        .map((tab) => (tab.textContent ?? '').trim()),
    );
    if (clipped.length) {
      issues.push({ view: label, findings: [`abgeschnittene Reiter: ${clipped.map((t) => `„${t}"`).join(', ')}`], text: '' });
    }
    await context.close();
  }
}

/* ============================================================
   8. Englisch: ist die zweite Sprache vollständig?
   ============================================================ */
async function journeyEnglish() {
  const { context, page } = await session({ locale: 'en', anchors: true });
  const { text } = await step(page, 'Start (EN)', { expect: ['Anchors'] });
  const german = (text.match(new RegExp(GERMAN_MARKERS, 'g')) ?? []).length;
  if (german > 2) {
    issues.push({
      view: 'Start (EN)',
      findings: [`${german} deutsche Wörter in der englischen Oberfläche`],
      text,
    });
  }
  await tap(page, ['Settings', 'Einstellungen']);
  await step(page, 'Einstellungen (EN)', { expect: ['Language'] });
  await context.close();
}

/* ============================================================ */
try {
  log('▶ Nutzer-Workflow');
  await journeyFirstRun();
  await journeySetAnchor();
  await journeyUndo();
  await journeyFind();
  await journeyProGates();
  await journeyShare();
  await journeySearch();
  await journeyTabs();
  await journeySmallPhone();
  await journeyLargeText();
  await journeyEnglish();
} catch (error) {
  issues.push({ view: 'Abbruch', findings: [String(error).split('\n')[0]], text: '' });
  log(`✖ Abbruch: ${String(error).split('\n')[0]}`);
} finally {
  await browser.close();
}

/* ---------------- Bericht ---------------- */

const lines = [
  '# Nutzer-Workflow — automatisch geprüft',
  '',
  '> Erzeugt von ' + '`tools/walkthrough.mjs`' + ' gegen die laufende App.',
  '> Nicht von Hand geschrieben: das Skript klickt den Weg wie ein Erstnutzer und',
  '> liest jeden Bildschirm aus. Ein neuer Lauf überschreibt die Datei.',
  '>',
  '> Das Datum steht nicht hier, sondern in der Git-Historie dieser Datei – sonst',
  '> wäre jeder Lauf ein Diff, auch wenn sich nichts geändert hat. Kurs,',
  '> Genauigkeit und Scrollhöhe sind geglättet, aus demselben Grund.',
  '',
  `**Ansichten:** ${results.length} · **Befunde:** ${issues.length}`,
  '',
];

if (issues.length) {
  lines.push('## Befunde', '');
  for (const issue of issues) {
    lines.push(`### ${issue.view}`, '');
    for (const finding of issue.findings) lines.push(`- ${finding}`);
    lines.push('');
  }
} else {
  lines.push('Keine Befunde: jede Ansicht war lesbar, erwartete Inhalte da, keine Platzhalter.', '');
}

lines.push('## Weg und Inhalt', '');
for (const result of results) {
  const firstLine = result.text.split('\n').map((l) => l.trim()).find((l) => l.length > 0) ?? '';
  const summary = result.text.split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 4).join(' · ');
  /**
   * Scrollhöhe: ob überhaupt gescrollt werden muss, ist die Aussage – nicht wie
   * viele Pixel, denn die schwanken mit jeder Animation und jedem Text, der
   * einen Tag länger ist. „400 oder 500 px" interessiert niemanden.
   */
  const needsScroll = result.layout.scroll > 40;
  lines.push(
    `### ${result.view}`,
    '',
    `- Erste Zeile: „${stable(firstLine).slice(0, 90)}"`,
    `- Sichtbar: ${stable(summary).slice(0, 300)}`,
    `- Bedienelemente: ${stable(result.controls.filter((c) => c.text).map((c) => c.text.slice(0, 28)).join(' | ')) || '—'}`,
    `- Scroll: ${needsScroll ? 'braucht Scrollen' : 'passt ohne Scrollen'}`,
    '',
  );
}

lines.push('## Bedienelemente je Ansicht', '');
for (const result of results) {
  const list = result.controls.filter((c) => c.text || c.aria);
  if (list.length === 0) continue;
  lines.push(`**${result.view}**`, '');
  for (const control of list) {
    const state = control.disabled ? ' (deaktiviert)' : control.pressed ? ` (aktiv: ${control.pressed})` : '';
    lines.push(`- ${control.role || control.tag}: ${stable(control.text || control.aria)}${state}`);
  }
  lines.push('');
}

if (records.length) {
  lines.push('## Laufzeitfehler', '', ...records.map((r) => `- ${r.message}`), '');
}

const report = `${lines.join('\n').trimEnd()}\n`;
writeFileSync(outFile, report);
console.log(`\n${results.length} Ansichten, ${issues.length} Befund(e) → ${path.relative(ROOT, outFile)}`);

/**
 * Nur harte Fälle lassen den Lauf scheitern: ein Platzhalter im Text, ein
 * Absturz, oder ein Bildschirm, der nicht erreichbar war. Weiches („das könnte
 * klarer sein") steht im Bericht und wird von einem Menschen entschieden.
 */
const hard = issues.filter((issue) =>
  issue.findings.some((f) =>
    /undefined|NaN|Platzhalter|Rohwert|Entwicklertext|nicht erreichbar|kein |leer –|Übersetzungsschlüssel|abgestürzt/.test(f),
  ),
);
/**
 * Ein Laufzeitfehler ist immer hart. Vorher stand er nur im Bericht, und der
 * Lauf meldete „fertig", während der halbe Bildschirm leer war.
 */
if (records.length) {
  console.error(`\n✖ ${records.length} Laufzeitfehler in der App:`);
  for (const record of records) console.error(`  - ${record.message}`);
  process.exitCode = 1;
}
if (hard.length) {
  console.error(`\n✖ ${hard.length} harter Befund(e):`);
  for (const issue of hard) console.error(`  - ${issue.view}: ${issue.findings.join(' · ')}`);
  process.exitCode = 1;
}
