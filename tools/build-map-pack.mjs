#!/usr/bin/env node
/**
 * Map-Paket bauen: OpenStreetMap → Kacheln für ein Gebiet.
 *
 * Ergebnis ist ein Ordner `public/map/<slug>/`, den die App offline liest:
 *
 *   public/map/packs.json              ← welche Pakete es gibt (Gebiete, Slug)
 *   public/map/<slug>/index.json       ← Gebiet, Herkunft, Lizenz, Kacheln
 *   public/map/<slug>/18/<x>/<y>.json  ← Gebäude, Straßen, Flächen, Beschriftungen
 *
 * Ein Paket ist **ein** Gebiet; die App kann mehrere halten. Ohne `<slug>` wäre
 * „offline pro Stadt" eine Behauptung mit genau einer Stadt.
 *
 * Warum ein Generator und kein fertiges Paket im Repo: Gebäudeumrisse ändern sich,
 * ein Gebiet ist eine Entscheidung des Nutzers („München Mitte"), und ein
 * 20-MB-Blob in git wäre für jeden Klon eine Strafe. Erzeugt wird auf einem Runner
 * mit Netz, committet nur das Ergebnis für das Standardgebiet.
 *
 * Aufruf:
 *   node tools/build-map-pack.mjs --south 48.13 --west 11.56 --north 48.14 --east 11.59 \
 *        --name "München Mitte" --slug muenchen-mitte --out packages/app/public/map
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
/** Ein Name wird zum Ordner: „München Mitte" → „muenchen-mitte". */
function slugify(value) {
  return value
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
}

const name = arg('name', 'München Mitte');
const slug = arg('slug', slugify(name));
const rootDir = path.resolve(ROOT, arg('out', 'packages/app/public/map'));
const outDir = path.join(rootDir, slug);
const tilePrefix = `${slug}/${MAP_ZOOM}`;
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
  relation["building"](${box});
  relation["natural"="water"](${box});
  relation["landuse"~"^(grass|forest|meadow)$"](${box});
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
  /**
   * Overpass ist ein von Freiwilligen bezahlter Dienst und antwortet unter Last
   * regelmäßig mit 429 oder 502. Ein einzelner Fehlschlag ist kein Grund, den Lauf
   * aufzugeben – aber auch kein Grund, beliebig oft zu klopfen: drei Versuche mit
   * wachsender Pause, dann ehrlich scheitern.
   */
  let lastError = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(OVERPASS, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded', 'user-agent': 'wAI-map-pack/1.0 (+https://andrexthedev.github.io/wAI)' },
        body: new URLSearchParams({ data: query() }),
      });
      if (!response.ok) throw new Error(`Overpass antwortete ${response.status}`);
      const json = await response.json();
      console.log(`· ${json.elements.length} Elemente erhalten`);
      return json;
    } catch (error) {
      lastError = error;
      if (attempt < 3) {
        const wait = attempt * 20_000;
        console.log(`· Versuch ${attempt} fehlgeschlagen (${error.message}) – ${wait / 1000}s Pause`);
        await new Promise((resolve) => setTimeout(resolve, wait));
      }
    }
  }
  throw new Error(`${lastError?.message} – Overpass ist ausgelastet, bitte in einigen Minuten erneut starten`);
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

/** Der flächengrößte Ring einer Gruppe – bei Gebäuden der Außenring. */
function largest(rings) {
  let best = rings[0];
  let bestArea = 0;
  for (const ring of rings) {
    let area = 0;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      area += (ring[j].lon + ring[i].lon) * (ring[j].lat - ring[i].lat);
    }
    if (Math.abs(area) > bestArea) {
      bestArea = Math.abs(area);
      best = ring;
    }
  }
  return best;
}

/**
 * Zerlegt eine Punktfolge, die mehrere geschlossene Ringe enthält.
 *
 * OSM verkettet bei `out geom` die Ringe eines Multipolygons. Ein Gebäudeblock mit
 * Innenhof kommt so als Außenring **plus** Innenring an, ein Stadtpark als mehrere
 * Wiesen. Der Pfad springt dann vom Ende des einen zum Anfang des nächsten Ringes –
 * quer durch den Block. Hier wird an der Wiederkehr des Startpunktes getrennt.
 */
function splitRings(geometry) {
  const rings = [];
  let current = [];
  for (const point of geometry) {
    const previous = current[current.length - 1];
    if (previous && previous.lat === point.lat && previous.lon === point.lon) continue;
    current.push(point);
    const first = current[0];
    if (current.length >= 4 && point.lat === first.lat && point.lon === first.lon) {
      rings.push(current);
      current = [];
    }
  }
  if (current.length >= 3) rings.push(current);
  // Kein geschlossener Ring erkannt: die ganze Folge bleibt ein Umriss.
  return rings.length ? rings : [geometry];
}

/**
 * Zerlegt eine OSM-Relation in ihre Ringe.
 *
 * `out geom` hängt die Ringe eines Multipolygons **aneinander** – ein Gebäudeblock
 * mit Innenhof kommt als eine Punktfolge, ein Stadtpark mit drei Wiesen als eine
 * Linie von Wiese zu Wiese. Genau das waren die langen Striche quer über die erste
 * echte Karte. Eine Relation liefert dagegen ihre Mitglieder einzeln; daraus werden
 * echte Ringe, und nur der äußere Umriss wird gezeichnet.
 */
function relationRings(element) {
  const rings = [];
  for (const member of element.members ?? []) {
    if (member.type !== 'way' || member.role === 'inner') continue;
    if (!Array.isArray(member.geometry) || member.geometry.length < 3) continue;
    const ring = member.geometry.map((point) => [point.lat, point.lon]);
    const first = ring[0];
    const last = ring[ring.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) ring.push(first);
    rings.push(ring);
  }
  if (!rings.length) return [];
  // Nur der größte Außenring: der Umriss eines Blocks, nicht jede Teilfläche.
  const longest = rings.reduce((best, ring) => (ring.length > best.length ? ring : best), rings[0]);
  return [longest.map(([lat, lon]) => ({ lat, lon }))];
}

let skippedDegenerate = 0;
let skippedOversized = 0;
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
    /**
     * Bei Relationen sind die Mitglieder die Wahrheit, bei Wegen die Geometrie.
     * Vorher wurde eine Relation wie ein Weg behandelt – ihre Ringe kamen
     * verkettet an und wurden zu einem Zickzack über die halbe Kachel.
     */
    /**
     * Bei Relationen sind die Mitglieder die Wahrheit, bei Wegen die Geometrie.
     * Vorher wurde eine Relation wie ein Weg behandelt – ihre Ringe kamen
     * verkettet an und wurden zu einem Zickzack quer über die Kachel.
     *
     * Und wenn ein Weg doch einmal mehrere Ringe in einer Punktfolge trägt (OSM
     * tut das bei manchen Flächen), wird daraus der Umriss statt eines Knotens.
     */
    const rings =
      element.type === 'relation'
        ? relationRings(element)
        : [element.geometry].map((ring) => splitRings(ring));
    for (const group of rings) {
      // Bei Gebäuden zählt der Umriss: ein Innenhof ist ein Loch, keine zweite
      // Hütte mitten im Block. Flächen (Wiesen, Wasser) dürfen mehrere Teile haben.
      const drawn = tags.building ? [largest(group)] : group;
      for (const ring of drawn) {
        if (ring.length < 3) continue;
        const run = assignToTile(ring);
        // Ein Gebäude braucht mindestens drei Ecken, sonst ist es ein Strich.
        if (run.points.length < 4) {
          skippedDegenerate++;
          continue;
        }
        const tile = tileFor(run.x, run.y);
        if (tags.building) {
          /**
           * Ein Umriss von mehr als 160 m Kantenlänge ist kein Haus, sondern ein
           * zusammengefasster Gebäudekomplex (Bahnhofshalle, Kaufhausriegel). Als
           * Zickzack über zwei Kacheln verdeckt er die halbe Nachbarschaft und
           * liefert keine Information – also bleibt er weg, statt zu stören.
           */
          const xs = run.points.map(([x]) => x);
          const ys = run.points.map(([, y]) => y);
          const extent = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
          if (extent > 400) {
            skippedOversized++;
            continue;
          }
          tile.buildings.push({
            points: simplifyRing(run.points, 0.6),
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
      }
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
  /**
   * Ein Ring wird als **offene** Linie vereinfacht und danach wieder geschlossen.
   *
   * Die frühere Fassung hat Douglas-Peucker direkt auf den geschlossenen Ring
   * angewandt – dessen erster und letzter Punkt identisch sind. Die Strecke
   * dazwischen hat dann die Länge null, der Abstand jedes Punktes dazu ist
   * beliebig groß, und die Rekursion spaltete am falschen Ort: übrig blieb ein
   * Ring mit doppelten Punkten und einer Schlaufe, die auf dem Schirm wie ein
   * Knoten aussah.
   */
  const unique = [];
  for (const point of points) {
    const last = unique[unique.length - 1];
    if (last && last[0] === point[0] && last[1] === point[1]) continue;
    unique.push(point);
  }
  const closed = unique.length > 1
    && unique[0][0] === unique[unique.length - 1][0]
    && unique[0][1] === unique[unique.length - 1][1];
  const open = closed ? unique.slice(0, -1) : unique;
  if (open.length < 3) return [];
  const simplified = open.length > 3 ? douglasPeucker(open, tolerance) : open;
  return [...simplified, simplified[0]];
}

/** Douglas-Peucker auf einer **offenen** Linie. */
function douglasPeucker(points, tolerance) {
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
  if (maxDistance > tolerance && index > 0) {
    return [
      ...douglasPeucker(points.slice(0, index + 1), tolerance).slice(0, -1),
      ...douglasPeucker(points.slice(index), tolerance),
    ];
  }
  return [points[0], points[points.length - 1]];
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
  slug,
  name,
  zoom: MAP_ZOOM,
  bounds: bbox,
  tiles: [],
  source: synthetic
    ? 'Synthetische Demodaten – kein OpenStreetMap-Material'
    : '© OpenStreetMap-Mitwirkende, ODbL 1.0 – openstreetmap.org/copyright',
  /**
   * Kurzform für die Anzeige auf der Karte. Der lange Satz ist richtig, passt auf
   * einem Handy aber in keine Ecke – dort steht die knappe Nennung, der volle Satz
   * bleibt im Index und damit überall sonst verfügbar.
   */
  attribution: synthetic ? null : '© OpenStreetMap-Mitwirkende · ODbL',
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

/**
 * Registry pflegen: `map/packs.json` ist die einzige Stelle, an der die App
 * erfährt, welche Gebiete offline vorliegen. Wird sie nicht mitgeschrieben, kennt
 * die App ein zweites Paket nie – sie würde es weder finden noch anbieten.
 */
const registryPath = path.join(rootDir, 'packs.json');
const registry = existsSync(registryPath)
  ? JSON.parse(readFileSync(registryPath, 'utf8'))
  : { version: 1, packs: [] };
const buildings = index.tiles.reduce((n, tile) => n + tile.buildings, 0);
const summaryEntry = {
  slug,
  name,
  bounds: bbox,
  buildings,
  ...(synthetic ? { synthetic: true } : {}),
};
registry.version = 1;
registry.packs = [...registry.packs.filter((pack) => pack.slug !== slug), summaryEntry].sort((a, b) =>
  a.slug.localeCompare(b.slug),
);
writeFileSync(registryPath, `${JSON.stringify(registry, null, 2)}\n`);
console.log(`· Registry: ${registry.packs.map((pack) => pack.slug).join(', ')}`);

const summary = `\n${index.tiles.length} Kacheln · ${(totalBytes / 1024).toFixed(0)} kB · ${buildings} Gebäude in ${name} (${slug})`;
console.log(summary);
if (skippedDegenerate) console.log(`  · ${skippedDegenerate} zu kleine Gebäudefragmente übersprungen`);
if (skippedOversized) console.log(`  · ${skippedOversized} übergroße Gebäudekomplexe ausgelassen (>160 m)`);
if (skippedUnknown) console.log(`  · ${skippedUnknown} Elemente ohne darstellbare Geometrie übersprungen`);


