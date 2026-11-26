#!/usr/bin/env node
/**
 * Map-Paket bauen: OpenStreetMap → Kacheln für ein Gebiet.
 *
 * Ergebnis ist ein Ordner `public/map/`, den die App offline liest:
 *
 *   public/map/index.json        ← Gebiet, Herkunft, Lizenz, Kachelverzeichnis
 *   public/map/18/<x>/<y>.json   ← Gebäude, Straßen, Flächen, Beschriftungen
 *
 * Warum ein Generator und kein fertiges Paket im Repo: Gebäudeumrisse ändern sich,
 * ein Gebiet ist eine Entscheidung des Nutzers („München Mitte"), und ein
 * 20-MB-Blob in git wäre für jeden Klon eine Strafe. Erzeugt wird auf einem Runner
 * mit Netz, committet nur das Ergebnis für das Standardgebiet.
 *
 * Aufruf:
 *   node tools/build-map-pack.mjs --south 48.13 --west 11.56 --north 48.14 --east 11.59 \
 *        --name "München Mitte" --out packages/app/public/map
 *   node tools/build-map-pack.mjs --fixture tools/fixtures/overpass-sample.json   # ohne Netz
 *
 * Lizenz: die Daten sind © OpenStreetMap-Mitwirkende, ODbL. Die Attribution steht
 * im Index, in den App-Einstellungen und auf der Kartenansicht.
 */
import { mkdirSync, readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 && args[index + 1] !== undefined ? args[index + 1] : fallback;
};

/* Die Projektion muss identisch zur App sein – deshalb wird sie importiert und
   nicht abgeschrieben. Zwei Kopien derselben Formel driften garantiert. */
const { project, MAP_ZOOM, TILE_SIZE, MAP_PACK_VERSION } = await import(
  path.join(ROOT, 'packages/shared/dist/map.js')
).catch(async () => {
  // Fallback für den Fall, dass shared noch nicht gebaut wurde: tsx direkt.
  return import(path.join(ROOT, 'packages/shared/src/map.ts'));
});

const bbox = {
  south: Number(arg('south', '48.1280')),
  west: Number(arg('west', '11.5550')),
  north: Number(arg('north', '48.1450')),
  east: Number(arg('east', '11.5950')),
};
const name = arg('name', 'München Mitte');
const outDir = path.resolve(ROOT, arg('out', 'packages/app/public/map'));
const fixture = arg('fixture');
const force = args.includes('--force');

if (!(bbox.south < bbox.north && bbox.west < bbox.east)) {
  console.error('✖ --south/--west/--north/--east ergeben kein Rechteck');
  process.exit(1);
}
if (existsSync(path.join(outDir, 'index.json')) && !force) {
  console.error(`✖ ${path.relative(ROOT, outDir)}/index.json existiert – mit --force überschreiben`);
  process.exit(1);
}

/* ------------------------------------------------------------------ */
/* Daten holen                                                         */
/* ------------------------------------------------------------------ */

const OVERPASS = 'https://overpass-api.de/api/interpreter';

/**
 * Ein einziger Aufruf für alles, was man zum Zurückfinden braucht: Häuser (damit
 * man die Ecke erkennt), Straßen (Orientierung), Wasser und Grün (Landmarken),
 * Parkplätze (das Ziel der App) und Läden als Wegmarken.
 */
function query() {
  const box = `${bbox.south},${bbox.west},${bbox.north},${bbox.east}`;
  return `[out:json][timeout:90];
(
  way["building"](${box});
  way["highway"~"^(motorway|trunk|primary|secondary|tertiary|residential|unclassified|service|living_street|pedestrian|footway|path|steps)$"](${box});
  way["natural"="water"](${box});
  way["leisure"~"^(park|garden|playground)$"](${box});
  way["landuse"~"^(grass|forest|meadow)$"](${box});
  node["amenity"="parking"](${box});
  node["shop"](${box});
  node["entrance"](${box});
);
out geom;`.replace(/\n\s*/g, '\n');
}

async function loadElements() {
  if (fixture) {
    const raw = JSON.parse(readFileSync(path.resolve(ROOT, fixture), 'utf8'));
    console.log(`· Fixture: ${fixture} (${raw.elements.length} Elemente, kein Netz nötig)`);
    return raw;
  }
  console.log(`· Overpass-Abfrage für ${bbox.south},${bbox.west} → ${bbox.north},${bbox.east}`);
  const response = await fetch(OVERPASS, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', 'user-agent': 'wAI-map-pack/1.0 (+https://andrexthedev.github.io/wAI)' },
    body: new URLSearchParams({ data: query() }),
  });
  if (!response.ok) throw new Error(`Overpass antwortete ${response.status}`);
  const json = await response.json();
  console.log(`· ${json.elements.length} Elemente erhalten`);
  return json;
}

/* ------------------------------------------------------------------ */
/* Kacheln                                                             */
/* ------------------------------------------------------------------ */

const ROAD_CLASS = {
  motorway: 'motorway',
  trunk: 'motorway',
  primary: 'primary',
  secondary: 'primary',
  tertiary: 'primary',
  residential: 'residential',
  unclassified: 'residential',
  living_street: 'residential',
  pedestrian: 'residential',
  service: 'service',
  footway: 'footway',
  path: 'footway',
  steps: 'footway',
};

const round = (value) => Math.round(value * 10) / 10;

/** Ein Punkt → Kachel + kachel-lokale world-Pixel. */
function locate(lat, lon) {
  const world = project(lat, lon);
  const x = Math.floor(world.x / TILE_SIZE);
  const y = Math.floor(world.y / TILE_SIZE);
  return {
    key: `${x}/${y}`,
    x,
    y,
    local: [round(world.x - x * TILE_SIZE), round(world.y - y * TILE_SIZE)],
  };
}

const tiles = new Map();
function tileFor(x, y) {
  const key = `${x}/${y}`;
  let tile = tiles.get(key);
  if (!tile) {
    tile = { x, y, roads: [], buildings: [], areas: [], labels: [] };
    tiles.set(key, tile);
  }
  return tile;
}

/**
 * Ein Weg gehört **einer** Kachel: der unter seinem Schwerpunkt.
 *
 * Erste Fassung hat Wege an Kachelgrenzen zerschnitten – dann blieb von einem
 * Gebäude pro Kachel nur ein Punktestumpf übrig und die Karte war leer. Punkte
 * dürfen deshalb über die Kachelkante hinausragen (bis ±256), genau wie bei
 * Vektorkacheln mit Puffer; der Renderer zeichnet Nachbarkacheln mit und clippt.
 * Ein kleiner Puffer von einer Kachel Kantenlänge genügt, weil kein Gebäude dieser
 * Stadt größer als ein Block ist – größere werden aufgeteilt (siehe unten).
 */
function assignToTile(geometry) {
  const spots = geometry.map((point) => locate(point.lat, point.lon));
  const cx = spots.reduce((sum, spot) => sum + spot.local[0] + 0, 0) / spots.length;
  const cy = spots.reduce((sum, spot) => sum + spot.local[1], 0) / spots.length;
  void cx;
  void cy;
  // Kachel des mittleren Punktes – stabiler als der Schwerpunkt der Fläche.
  const middle = spots[Math.floor(spots.length / 2)];
  return { x: middle.x, y: middle.y, points: spots.map((spot) => spot.local) };
}

let skippedDegenerate = 0;
let skippedUnknown = 0;

for (const element of (await loadElements()).elements) {
  const tags = element.tags ?? {};
  const hasGeometry = Array.isArray(element.geometry) && element.geometry.length >= 2;

  if (element.type === 'node') {
    if (typeof element.lat !== 'number' || typeof element.lon !== 'number') continue;
    const spot = locate(element.lat, element.lon);
    const tile = tileFor(spot.x, spot.y);
    if (tags.amenity === 'parking') {
      tile.areas.push({ kind: 'parking', points: [spot.local, spot.local] });
      if (tags.name) tile.labels.push({ text: tags.name.slice(0, 28), x: spot.local[0], y: spot.local[1], kind: 'parking' });
    } else if (tags.shop && tags.name) {
      tile.labels.push({ text: tags.name.slice(0, 24), x: spot.local[0], y: spot.local[1], kind: 'place' });
    }
    continue;
  }

  if (!hasGeometry) {
    skippedUnknown++;
    continue;
  }

  // Gebäude und Flächen: geschlossen und mit Fläche, sonst ist es ein Strich.
  if (tags.building || tags.natural === 'water' || tags.leisure || tags.landuse) {
    const run = assignToTile(element.geometry);
    // Ein Gebäude braucht mindestens drei Ecken, sonst ist es ein Strich.
    if (run.points.length < 4) {
      skippedDegenerate++;
      continue;
    }
    const tile = tileFor(run.x, run.y);
    if (tags.building) {
      tile.buildings.push({
        points: run.points,
        ...(tags.building === 'garage' || tags.building === 'parking' ? { kind: 'parking' } : {}),
      });
      if (tags.name) {
        const [cx, cy] = centroid(run.points);
        tile.labels.push({ text: tags.name.slice(0, 26), x: cx, y: cy, kind: 'place' });
      }
    } else {
      tile.areas.push({
        kind: tags.natural === 'water' ? 'water' : 'green',
        points: run.points,
      });
    }
    continue;
  }

  if (tags.highway) {
    const roadClass = ROAD_CLASS[tags.highway];
    if (!roadClass) {
      skippedUnknown++;
      continue;
    }
    const run = assignToTile(element.geometry);
    if (run.points.length < 2) continue;
    const tile = tileFor(run.x, run.y);
    tile.roads.push({ class: roadClass, points: run.points });
    // Straßennamen nur einmal je Kachel und nur an längeren Linien – sonst steht
    // derselbe Name fünfmal auf dem Bildschirm.
    if (tags.name && run.points.length >= 3) {
      const [cx, cy] = centroid(run.points);
      tile.labels.push({ text: tags.name.slice(0, 24), x: cx, y: cy, kind: 'street' });
    }
    continue;
  }

  skippedUnknown++;
}

function centroid(points) {
  const sum = points.reduce((acc, [x, y]) => [acc[0] + x, acc[1] + y], [0, 0]);
  return [round(sum[0] / points.length), round(sum[1] / points.length)];
}

/* ------------------------------------------------------------------ */
/* Sortieren, aufräumen, schreiben                                     */
/* ------------------------------------------------------------------ */

/**
 * Innerhalb einer Kachel: wichtige Straßen zuletzt zeichnen (oben), Fußwege zuerst.
 * Gleichzeitig Dubletten bei Beschriftungen entfernen.
 */
const ROAD_ORDER = { footway: 0, service: 1, residential: 2, primary: 3, motorway: 4 };
for (const tile of tiles.values()) {
  tile.roads.sort((a, b) => ROAD_ORDER[a.class] - ROAD_ORDER[b.class]);
  const seen = new Set();
  tile.labels = tile.labels.filter((label) => {
    const key = `${label.kind}:${label.text}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Erst schreiben, wenn feststeht, dass etwas Brauchbares entstanden ist.
 * Reihenfolge ist wichtig: ein abgebrochener Lauf darf kein `index.json`
 * hinterlassen, das die App dann als „Karte da" liest und leer anzeigt.
 */
if (tiles.size === 0 || [...tiles.values()].every((tile) => tile.buildings.length === 0)) {
  console.error('✖ Kein einziges Gebäude im Gebiet – falsche Koordinaten oder leere Antwort?');
  process.exit(1);
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const index = {
  version: MAP_PACK_VERSION,
  name,
  zoom: MAP_ZOOM,
  bounds: bbox,
  tiles: [],
  source: '© OpenStreetMap-Mitwirkende, ODbL 1.0 – openstreetmap.org/copyright',
  generatedAt: new Date().toISOString(),
};

let totalBytes = 0;
for (const tile of [...tiles.values()].sort((a, b) => a.y - b.y || a.x - b.x)) {
  // Leere Kacheln (nur Wasser, kein Gebäude) sind trotzdem nützlich: sie zeigen,
  // dass dort nichts ist. Ganz leere dagegen nicht.
  if (tile.buildings.length === 0 && tile.roads.length === 0 && tile.areas.length === 0) continue;
  const json = JSON.stringify({ z: MAP_ZOOM, x: tile.x, y: tile.y, roads: tile.roads, buildings: tile.buildings, areas: tile.areas, labels: tile.labels });
  const dir = path.join(outDir, String(MAP_ZOOM), String(tile.x));
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, `${tile.y}.json`), json);
  totalBytes += Buffer.byteLength(json);
  index.tiles.push({
    x: tile.x,
    y: tile.y,
    bytes: Buffer.byteLength(json),
    buildings: tile.buildings.length,
    roads: tile.roads.length,
  });
}

writeFileSync(path.join(outDir, 'index.json'), `${JSON.stringify(index, null, 2)}\n`);

const summary = `\n${index.tiles.length} Kacheln · ${(totalBytes / 1024).toFixed(0)} kB · ${index.tiles.reduce((n, t) => n + t.buildings, 0)} Gebäude in ${name}`;
console.log(summary);
if (skippedDegenerate) console.log(`  · ${skippedDegenerate} zu kleine Gebäudefragmente übersprungen`);
if (skippedUnknown) console.log(`  · ${skippedUnknown} Elemente ohne darstellbare Geometrie übersprungen`);


