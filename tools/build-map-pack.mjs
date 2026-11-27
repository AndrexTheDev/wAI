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

/**
 * Die Projektion muss identisch zur App sein – deshalb wird die Quelle importiert
 * und nicht abgeschrieben. Zwei Kopien derselben Formel driften garantiert.
 *
 * `@wai/shared` hat kein Build-Skript (es wird über einen Vite-Alias direkt aus
 * dem Quelltext konsumiert). Ein früherer Versuch, `dist/map.js` zu laden, ist auf
 * dem Runner gescheitert – deshalb geht es hier direkt über tsx.
 */
const { project, MAP_ZOOM, TILE_SIZE, MAP_PACK_VERSION } = await import('tsx/esm/api').then(
  ({ tsImport }) => tsImport(path.join(ROOT, 'packages/shared/src/map.ts'), import.meta.url),
);

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
/**
 * Fixture-Daten sind synthetisch. Sie dürfen **nicht** als OpenStreetMap-Werk
 * ausgewiesen werden, sonst behauptet die App eine Urheberschaft, die es nicht
 * gibt – dieselbe Sorte Lüge, die dieses Projekt sonst überall entfernt.
 */
const synthetic = Boolean(fixture);

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
    tile = { x, y, roads: [], buildings: [], areas: [], labels: [], pois: [] };
    tiles.set(key, tile);
  }
  return tile;
}

/**
 * Ein Weg gehört **einer** Kachel, aber seine Punkte bleiben Weltkoordinaten des
 * Blocks, nur um den Ursprung dieser Kachel verschoben.
 *
 * Genau hier lag der Fehler, der das erste echte Paket zu einem Knoten machte:
 * `locate()` rechnete jeden Punkt relativ zu **seiner eigenen** Kachel, der Block
 * wurde aber nach dem mittleren Punkt gewählt. Punkte aus der Nachbarkachel
 * sprangen dadurch um 256 Einheiten – aus einem Haus wurde ein Fadenkreuz quer
 * über den Block. Der Renderer addiert `dx`/`dy` in **einem** Bezugssystem und
 * kann den Sprung nicht ausgleichen.
 *
 * Deshalb: Kachel einmal bestimmen, dann alle Punkte gegen **diesen** Ursprung.
 * Punkte dürfen über die Kante hinausragen (bis ±256), wie bei Vektorkacheln mit
 * Puffer; Nachbarkacheln werden ohnehin mitgezeichnet.
 */
function assignToTile(geometry) {
  const spots = geometry.map((point) => locate(point.lat, point.lon));
  // Kachel des mittleren Punktes – stabiler als der Schwerpunkt der Fläche.
  const middle = spots[Math.floor(spots.length / 2)];
  const originX = middle.x * TILE_SIZE;
  const originY = middle.y * TILE_SIZE;
  return {
    x: middle.x,
    y: middle.y,
    points: geometry.map((point) => {
      const world = project(point.lat, point.lon);
      return [round(world.x - originX), round(world.y - originY)];
    }),
  };
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
      tile.pois.push({ kind: 'parking', x: spot.local[0], y: spot.local[1] });
      if (tags.name) tile.labels.push({ text: tags.name.slice(0, 28), x: spot.local[0], y: spot.local[1], kind: 'parking' });
    } else if (tags.shop) {
      /**
       * Läden sind Wegmarken, keine Werbung. Erste Fassung schrieb jeden Namen als
       * Beschriftung in die Kachel – auf dem Screenshot standen 15 Ladennamen über
       * einem Fleck und verdeckten die Straßen. Jetzt ein Punkt ohne Text.
       */
      tile.pois.push({ kind: 'shop', x: spot.local[0], y: spot.local[1] });
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
      /**
       * Ein Gebäude mit Innenhof hat in OSM einen Außen- und mehrere Innenringe;
       * `out geom` liefert sie als eine Punktfolge. Naiv gezeichnet zieht der Pfad
       * eine Linie quer durch den Block – auf dem ersten echten Paket war genau das
       * der Grund, warum die Karte wie ein Knoten aussah.
       *
       * Ohne Multipolygon-Auswertung wird daraus der Umriss: konvexe Hülle,
       * vereinfacht. Ehrlicher als ein durchkreuzter Ring, und für „neben welchem
       * Haus stehe ich" genau genug.
       */
      const outline = simplifyRing(hull(run.points), 0.6);
      tile.buildings.push({
        points: outline,
        ...(tags.building === 'garage' || tags.building === 'parking' ? { kind: 'parking' } : {}),
      });
      if (tags.name) {
        const [cx, cy] = centroid(run.points);
        tile.labels.push({ text: tags.name.slice(0, 22), x: cx, y: cy, kind: 'place' });
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

/** Konvexe Hülle (Monotone Chain) – macht aus mehreren Ringen einen Umriss. */
function hull(points) {
  // Dedupe first: a closed ring repeats its first point, and duplicates make the
  // monotone chain emit a second, overlapping ring (seen as a 'knot' on screen).
  const unique = [];
  for (const point of points) {
    if (!unique.some((p) => p[0] === point[0] && p[1] === point[1])) unique.push(point);
  }
  const pts = unique.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (pts.length < 3) return pts;
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  return [...lower, ...upper];
}

/**
 * Douglas–Peucker in Weltpixeln. Bei 0,4 m pro Einheit ist 0,6 Einheiten (≈25 cm)
 * unterhalb jeder Darstellungsgenauigkeit, spart aber die Hälfte der Punkte.
 */
function simplifyRing(points, tolerance) {
  if (points.length <= 4) return [...points, points[0]];
  let maxDistance = 0;
  let index = 0;
  const [ax, ay] = points[0];
  const [bx, by] = points[points.length - 1];
  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicular(points[i], [ax, ay], [bx, by]);
    if (d > maxDistance) {
      maxDistance = d;
      index = i;
    }
  }
  if (maxDistance > tolerance) {
    const left = simplifyRing(points.slice(0, index + 1), tolerance).slice(0, -1);
    const right = simplifyRing(points.slice(index), tolerance);
    return [...left, ...right];
  }
  return [...points, points[0]];
}

function perpendicular([px, py], [ax, ay], [bx, by]) {
  const dx = bx - ax;
  const dy = by - ay;
  const length = Math.hypot(dx, dy);
  if (length === 0) return Math.hypot(px - ax, py - ay);
  return Math.abs(dy * (px - ax) - dx * (py - ay)) / length;
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
  source: synthetic
    ? 'Synthetische Demodaten – kein OpenStreetMap-Material'
    : '© OpenStreetMap-Mitwirkende, ODbL 1.0 – openstreetmap.org/copyright',
  synthetic,
  generatedAt: new Date().toISOString(),
};

let totalBytes = 0;
for (const tile of [...tiles.values()].sort((a, b) => a.y - b.y || a.x - b.x)) {
  // Leere Kacheln (nur Wasser, kein Gebäude) sind trotzdem nützlich: sie zeigen,
  // dass dort nichts ist. Ganz leere dagegen nicht.
  if (tile.buildings.length === 0 && tile.roads.length === 0 && tile.areas.length === 0) continue;
  const json = JSON.stringify({
    z: MAP_ZOOM,
    x: tile.x,
    y: tile.y,
    roads: tile.roads,
    buildings: tile.buildings,
    areas: tile.areas,
    labels: tile.labels,
    pois: tile.pois,
  });
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


