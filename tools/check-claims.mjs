#!/usr/bin/env node
/**
 * Claims check: store listing und Landingpage dürfen nichts versprechen, was im
 * Code nicht existiert.
 *
 * Der aufwendigste Fund der Vollständigkeitsprüfung (docs/ROADMAP.md) war nicht
 * ein fehlendes Feature, sondern ein Feature, das *behauptet* wurde und nur als
 * Typ existierte (Schrittschätzung). Dieser Check verhindert die Wiederholung:
 * jede Zeile nennt eine Behauptung und den Code, der sie tragen muss.
 *
 *   node tools/check-claims.mjs          # prüfen
 *   node tools/check-claims.mjs --list   # Tabelle ausgeben
 */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

/**
 * Jede Behauptung braucht (a) einen sichtbaren Beleg im Quelltext und (b) einen
 * Anker im Marketing-Text. Fehlt (a), ist die Behauptung eine Lüge; fehlt (b),
 * verkauft die App ein Feature nicht, das sie hat.
 */
const CLAIMS = [
  {
    id: 'one-tap',
    claim: { de: 'Ein-Tipp-Anker', en: 'one tap' },
    evidence: [['packages/app/src/screens/HomeScreen.tsx', 'anchor-btn']],
  },
  {
    id: 'compass',
    claim: { de: 'Kompass', en: 'compass' },
    evidence: [
      ['packages/shared/src/engine.ts', 'guidanceFor'],
      ['packages/app/src/screens/FindScreen.tsx', 'guide__needle'],
    ],
  },
  {
    id: 'elevation',
    claim: { de: 'Höhen', en: 'altitude' },
    evidence: [
      ['packages/shared/src/geo.ts', 'elevationHint'],
      // The beam is useless without an input for the level.
      ['packages/app/src/screens/AnchorEditor.tsx', 'floorLabel'],
    ],
  },
  {
    id: 'trail',
    claim: { de: 'Brotkrumen', en: 'breadcrumb' },
    evidence: [
      ['packages/shared/src/engine.ts', 'appendTrailPoint'],
      ['packages/app/src/screens/FindScreen.tsx', 'TrailCanvas'],
    ],
  },
  {
    id: 'proximity',
    claim: { de: 'Näher', en: 'proximity' },
    evidence: [['packages/shared/src/engine.ts', 'proximityTier']],
  },
  {
    id: 'steps',
    claim: { de: 'Schritt', en: 'step' },
    evidence: [
      ['packages/shared/src/engine.ts', 'advanceWalker'],
      ['packages/app/src/platform/native.ts', 'devicemotion'],
      ['packages/app/src/store/AppStore.tsx', 'estimatedSteps'],
    ],
  },
  {
    id: 'park-timer',
    claim: { de: 'Park-Timer', en: 'parking timer' },
    evidence: [
      ['packages/app/src/screens/ParkingTimerSheet.tsx', 'scheduleParkingReminder'],
      // A reminder you cannot tap back into is a dead end.
      ['packages/app/src/platform/native.ts', 'localNotificationActionPerformed'],
    ],
  },
  {
    id: 'sharing',
    claim: { de: 'Teilen', en: 'sharing' },
    evidence: [
      ['packages/shared/src/deeplink.ts', 'buildShareLink'],
      ['packages/landing/src/pages/SharePreviewPage.tsx', 'SharePreview'],
    ],
  },
  {
    id: 'map',
    // Der Marketing-Text sagt „Häuser", nicht „Gebäude" – der Claim muss die
    // Wörter der Anzeige verwenden, sonst prüft er an der Werbung vorbei.
    claim: { de: 'Häuser', en: 'buildings' },
    evidence: [
      // Die Karte ist nur dann eine Karte, wenn Umrisse ankommen: Renderer,
      // Generator und ein tatsächlich ausgeliefertes Paket.
      ['packages/app/src/screens/MapView.tsx', 'map__building'],
      ['tools/build-map-pack.mjs', 'overpass-api.de'],
      ['packages/app/public/map/muenchen-mitte/index.json', '"buildings"'],
      // Ein Paket ist erst dann „offline pro Stadt", wenn die App mehrere kennt.
      ['packages/app/public/map/packs.json', '"slug"'],
      ['packages/app/src/screens/MapView.tsx', 'pickPack'],
    ],
  },
  {
    id: 'offline',
    claim: { de: 'offline', en: 'offline' },
    evidence: [
      ['packages/app/src/store/storage.ts', 'localStorage'],
      // Legal texts must be bundled, not fetched.
      ['packages/shared/src/legal/index.ts', 'import('],
    ],
  },
  {
    id: 'units',
    claim: { de: 'Einheiten', en: 'units' },
    evidence: [
      ['packages/shared/src/geo.ts', 'DistanceUnits'],
      ['packages/app/src/i18n/useUnits.ts', 'useUnits'],
    ],
  },
  {
    id: 'bilingual',
    claim: { de: 'Deutsch', en: 'German' },
    evidence: [
      ['packages/shared/src/i18n/de.ts', 'export'],
      ['packages/shared/src/i18n/en.ts', 'export'],
    ],
  },
];

const listing = readFileSync(path.join(ROOT, 'store/listing.json'), 'utf8');
const landingText = [
  'packages/shared/src/i18n/de.ts',
  'packages/shared/src/i18n/en.ts',
]
  .map((file) => readFileSync(path.join(ROOT, file), 'utf8'))
  .join('\n');

const read = (file) => {
  const full = path.join(ROOT, file);
  return existsSync(full) ? readFileSync(full, 'utf8') : '';
};

/**
 * Wortgrenzen-scharf suchen. Ein Substring-Vergleich hätte ein umbenanntes
 * `advanceWalkerGone` als Beleg für `advanceWalker` akzeptiert – genau der
 * Fehler, den dieser Check verhindern soll.
 */
const has = (source, needle) => {
  if (needle.startsWith('import(')) return source.includes(needle);
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^\\w$])${escaped}($|[^\\w$])`).test(source);
};

if (process.argv.includes('--list')) {
  console.log('Befund'.padEnd(14) + 'Behauptung'.padEnd(22) + 'Belege');
  for (const item of CLAIMS) {
    const evidence = item.evidence.map(([file, needle]) => {
      const ok = has(read(file), needle);
      return `${ok ? '✔' : '✖'} ${path.basename(file)}`;
    });
    console.log(`${item.id.padEnd(14)}${item.claim.de.padEnd(22)}${evidence.join(', ')}`);
  }
  process.exit(0);
}

let failures = 0;
for (const item of CLAIMS) {
  // 1. Beleg im Code
  for (const [file, needle] of item.evidence) {
    const source = read(file);
    if (!source) {
      failures++;
      console.log(`✖ ${item.id}: ${file} fehlt`);
    } else if (!has(source, needle)) {
      failures++;
      console.log(`✖ ${item.id}: ${file} enthält "${needle}" nicht mehr — Behauptung nicht mehr gedeckt`);
    }
  }

  // 2. Die Behauptung muss im Marketing auftauchen (sonst verkauft die App
  //    ein Feature nicht). Groß-/Kleinschreibung wird ignoriert.
  const needle = item.claim.de.toLowerCase();
  const inListing = listing.toLowerCase().includes(needle);
  const inLanding = landingText.toLowerCase().includes(needle);
  if (!inListing && !inLanding) {
    failures++;
    console.log(`✖ ${item.id}: Behauptung "${item.claim.de}" kommt weder im Store-Text noch auf der Website vor`);
  }
}

/**
 * Der zweite, unabhängige Widerspruch: die Free-Spalte wirbt mit "unbegrenzt",
 * während `FREE_LIMITS.activeAnchors` bei 3 steht. Ein Nutzer merkt das beim
 * vierten Anker — und dann ist es kein Marketingproblem mehr.
 */
const comparisonSources = [
  read('packages/landing/src/sections/Comparison.tsx'),
  read('packages/shared/src/i18n/de.ts'),
  read('packages/shared/src/i18n/en.ts'),
].join('\n');

const freeLimit = /activeAnchors:\s*(\d+)/.exec(read('packages/shared/src/product.ts'))?.[1];
if (!freeLimit) {
  console.log('✖ product.ts: FREE_LIMITS.activeAnchors nicht gefunden');
  failures++;
} else {
  // Nur die Free-Zeilen prüfen: "free: 'unbegrenzt'" wäre eine Lüge.
  const freeUnlimited = /free:\s*'[^']*unbegrenzt/i.test(comparisonSources);
  if (freeUnlimited) {
    console.log(`✖ Free-Tarif verspricht "unbegrenzt", der Code erlaubt ${freeLimit} aktive Anker`);
    failures++;
  }
  const claimsThree = comparisonSources.toLowerCase().includes(`${freeLimit} gleichzeitige`) ||
    comparisonSources.toLowerCase().includes(`${freeLimit} simultaneous`);
  if (!claimsThree) {
    console.log(`✖ Free-Tarif nennt die Grenze von ${freeLimit} aktiven Ankern nirgends`);
    failures++;
  }
}

if (failures) {
  console.log(`\n${failures} Behauptung(en) ohne Deckung. Entweder Code nachziehen oder Text korrigieren (docs/ROADMAP.md).`);
  process.exit(1);
}
console.log(`Alle ${CLAIMS.length} Behauptungen sind im Code gedeckt und im Marketing sichtbar.`);
