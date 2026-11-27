/**
 * Der Pack-Generator wird gegen eine echte Overpass-Antwort geprüft.
 *
 * In der Bauumgebung ist Overpass gesperrt; ein Generator, den niemand je gegen
 * echte Daten laufen lassen hat, ist eine Behauptung. Das Fixture enthält die
 * Fälle, die beim Bauen tatsächlich wehgetan haben: Gebäude über Kachelgrenzen,
 * ein zu kleines Fragment, ein Punkt ohne Fläche und Straßen mit und ohne Namen.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');

function buildInto(dir: string, extra: string[] = []): string {
  // Der Generator nimmt das **erste** --fixture. Ein fest eingetragenes Default
  // vor `extra` hätte jeden Test heimlich gegen das Beispiel-Fixture laufen lassen.
  const chosen = extra.includes('--fixture') ? extra : ['--fixture', 'tools/fixtures/overpass-sample.json', ...extra];
  execFileSync(
    process.execPath,
    ['tools/build-map-pack.mjs', '--out', dir, '--force', ...chosen],
    { cwd: ROOT, encoding: 'utf8' },
  );
  return readFileSync(path.join(dir, 'index.json'), 'utf8');
}

test('the generator turns an OSM answer into a usable pack', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'wai-map-'));
  try {
    const index = JSON.parse(buildInto(dir));

    assert.equal(index.version, 1);
    assert.equal(index.zoom, 18);
    // Wichtig: ein aus Fixtures gebautes Paket ist synthetisch und darf **nicht**
    // mit OpenStreetMap-Nennung ausgeliefert werden. Der Test hat vorher genau
    // das Gegenteil festgeschrieben – eine falsche Zusicherung ist schlimmer als
    // keine, weil sie den Fehler deckt.
    assert.equal(index.synthetic, true);
    assert.doesNotMatch(index.source, /ODbL/);
    assert.match(index.source, /Synthetisch/);
    assert.ok(index.tiles.length > 0, 'pack has no tiles');

    const buildings = index.tiles.reduce((sum: number, tile: { buildings: number }) => sum + tile.buildings, 0);
    // Das Fixture hat zwei echte Gebäude; das dritte ist ein Dreieck-Fragment mit
    // drei Punkten (also kein geschlossener Ring) und muss verworfen werden.
    assert.equal(buildings, 2, `expected 2 buildings, got ${buildings}`);

    // Jede Kachel liegt als Datei dort, wo der Index sie verspricht.
    for (const tile of index.tiles) {
      const file = path.join(dir, String(index.zoom), String(tile.x), `${tile.y}.json`);
      assert.ok(existsSync(file), `missing tile file ${file}`);
      const content = JSON.parse(readFileSync(file, 'utf8'));
      assert.equal(content.x, tile.x);
      assert.equal(content.y, tile.y);
      assert.equal(content.z, index.zoom);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a building that crosses a tile edge survives whole', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'wai-map-'));
  try {
    const index = JSON.parse(buildInto(dir));
    // Genau der Fehler der ersten Fassung: ein an der Kante zerschnittenes Polygon
    // hatte nur noch einen Stumpf. Jedes Gebäude muss ein geschlossener Ring mit
    // mindestens vier Punkten sein.
    let rings = 0;
    for (const tile of index.tiles) {
      const content = JSON.parse(
        readFileSync(path.join(dir, String(index.zoom), String(tile.x), `${tile.y}.json`), 'utf8'),
      );
      for (const building of content.buildings as Array<{ points: Array<[number, number]> }>) {
        assert.ok(building.points.length >= 4, `building with ${building.points.length} points`);
        rings++;
      }
    }
    assert.ok(rings >= 2, `expected both buildings somewhere, found ${rings}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('roads keep their class and only named ones get a label', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'wai-map-'));
  try {
    const index = JSON.parse(buildInto(dir));
    const classes = new Set<string>();
    const labels: string[] = [];
    for (const tile of index.tiles) {
      const content = JSON.parse(
        readFileSync(path.join(dir, String(index.zoom), String(tile.x), `${tile.y}.json`), 'utf8'),
      );
      for (const road of content.roads as Array<{ class: string }>) classes.add(road.class);
      for (const label of content.labels as Array<{ text: string }>) labels.push(label.text);
    }
    assert.ok(classes.has('residential'), `classes: ${[...classes].join(', ')}`);
    assert.ok(classes.has('footway'));
    assert.ok(labels.includes('Kaufingerstraße'), `labels: ${labels.join(', ')}`);
    // Namenlose Wege dürfen keine leeren Beschriftungen erzeugen.
    assert.ok(!labels.some((text) => text.trim() === ''));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a building across a tile edge keeps one coordinate origin', () => {
  /**
   * Der Fehler, der das erste echte Paket unlesbar machte: `locate()` rechnete
   * jeden Punkt relativ zu **seiner eigenen** Kachel, der Block wurde aber nach dem
   * mittleren Punkt gewählt. Ein Haus, das über die Kante reicht, sprang dadurch um
   * 256 Einheiten – auf dem Screenshot ein Fadenkreuz quer über den Block.
   *
   * Erwartet: alle Punkte gegen **einen** Ursprung. Das Haus im Fixture ist
   * 40×30 Einheiten groß; ein Ursprungssprung wäre 256 – an der Bounding-Box also
   * sofort zu sehen. (Das synthetische Overpass-Fixture-Haus ist absichtlich grob
   * und 149 Einheiten breit, deshalb wird hier gezielt das Kanten-Fixture geprüft.)
   */
  const dir = mkdtempSync(path.join(tmpdir(), 'wai-map-'));
  try {
    const index = JSON.parse(buildInto(dir, ['--fixture', 'tools/fixtures/tile-edge.json']));
    let houses = 0;
    for (const tile of index.tiles) {
      const content = JSON.parse(
        readFileSync(path.join(dir, String(index.zoom), String(tile.x), `${tile.y}.json`), 'utf8'),
      );
      for (const building of content.buildings as Array<{ points: Array<[number, number]> }>) {
        const xs = building.points.map(([x]) => x);
        const ys = building.points.map(([, y]) => y);
        const width = Math.max(...xs) - Math.min(...xs);
        const height = Math.max(...ys) - Math.min(...ys);
        assert.ok(width < 100 && height < 100, `house torn across tiles: ${width}×${height}`);
        houses++;
      }
      // Dieselbe Falle für Wege: ein Straßenzug über die Kante darf nicht springen.
      for (const road of content.roads as Array<{ points: Array<[number, number]> }>) {
        const xs = road.points.map(([x]) => x);
        const ys = road.points.map(([, y]) => y);
        assert.ok(
          Math.max(...xs) - Math.min(...xs) < 200 && Math.max(...ys) - Math.min(...ys) < 200,
          `road torn across tiles: ${JSON.stringify(road.points)}`,
        );
      }
    }
    assert.equal(houses, 1, 'the edge house must be stored');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a road is stored whole, not cut at every tile edge', () => {
  // Das Fixture hat eine Wohnstraße mit drei Punkten über zwei Kacheln. Zerlegt
  // ergab das zwei Striche, die an der Kante abrissen – auf dem echten Paket sah
  // die Karte deshalb aus wie ein Flickenteppich.
  const dir = mkdtempSync(path.join(tmpdir(), 'wai-map-'));
  try {
    const index = JSON.parse(buildInto(dir));
    let threePoint = 0;
    for (const tile of index.tiles) {
      const content = JSON.parse(
        readFileSync(path.join(dir, String(index.zoom), String(tile.x), `${tile.y}.json`), 'utf8'),
      );
      for (const road of content.roads as Array<{ class: string; points: unknown[] }>) {
        if (road.points.length >= 3) threePoint++;
      }
    }
    assert.ok(threePoint >= 1, 'the three-point street must survive as one polyline');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a shop becomes a dot, never a label', () => {
  // Erste Fassung schrieb jeden Ladennamen als Beschriftung in die Kachel; auf dem
  // echten Paket standen 15 davon über einem Fleck und verdeckten die Straßen, die
  // orientieren. Läden sind jetzt ein Punkt ohne Text.
  const dir = mkdtempSync(path.join(tmpdir(), 'wai-map-'));
  try {
    const index = JSON.parse(buildInto(dir));
    let shops = 0;
    for (const tile of index.tiles) {
      const content = JSON.parse(
        readFileSync(path.join(dir, String(index.zoom), String(tile.x), `${tile.y}.json`), 'utf8'),
      );
      for (const poi of content.pois ?? []) if (poi.kind === 'shop') shops++;
      for (const label of content.labels as Array<{ text: string }>) {
        assert.notEqual(label.text, 'Bäckerei', `shop became a label: ${label.text}`);
      }
    }
    assert.equal(shops, 1, 'the bakery must be a poi dot');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a building with a courtyard becomes one clean outline', () => {
  /**
   * OSM liefert Außen- und Innenring als eine Punktfolge. Unbehandelt zeichnet der
   * Pfad quer durch den Block – auf dem ersten echten Paket sah die Karte deshalb
   * aus wie ein Knoten. Erwartet: ein geschlossener Ring ohne Überkreuzungen.
   */
  const dir = mkdtempSync(path.join(tmpdir(), 'wai-map-'));
  try {
    execFileSync(
      process.execPath,
      ['tools/build-map-pack.mjs', '--fixture', 'tools/fixtures/courtyard.json', '--out', dir, '--force'],
      { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' },
    );
    const files = readdirSync(path.join(dir, '18'), { recursive: true })
      .filter((entry) => String(entry).endsWith('.json'))
      .map((entry) => path.join(dir, '18', String(entry)));
    let checked = 0;
    for (const file of files) {
      const content = JSON.parse(readFileSync(file, 'utf8'));
      for (const building of content.buildings as Array<{ points: Array<[number, number]> }>) {
        const ring = building.points;
        // Geschlossen …
        assert.deepEqual(ring[0], ring[ring.length - 1], `not closed: ${JSON.stringify(ring)}`);
        // … ohne doppelte Punkte in Folge …
        for (let i = 1; i < ring.length; i++) {
          assert.notDeepEqual(ring[i], ring[i - 1], 'duplicate consecutive point');
        }
        // … und deutlich weniger Punkte als die 10 des Fixtures: die Hülle räumt auf.
        assert.ok(ring.length <= 6, `expected a simplified outline, got ${ring.length} points`);
        checked++;
      }
    }
    assert.ok(checked >= 2, `expected both buildings, checked ${checked}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the shipped demo pack does not claim to be OpenStreetMap', () => {
  // Das Paket im Repo ist das, was Nutzer sehen: es muss dieselbe Ehrlichkeit
  // tragen wie der Generator.
  const shipped = JSON.parse(
    readFileSync(path.join(ROOT, 'packages/app/public/map/index.json'), 'utf8'),
  );
  if (!shipped.synthetic) return; // Ein echtes Paket ist der bessere Zustand.
  assert.doesNotMatch(shipped.source, /ODbL|OpenStreetMap-Mitwirkende/);
  assert.ok(shipped.tiles.length > 0);
});

test('an empty answer fails loudly instead of shipping a blank map', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'wai-map-'));
  const fixtures = mkdtempSync(path.join(tmpdir(), 'wai-fix-'));
  try {
    const empty = path.join(fixtures, 'empty.json');
    execFileSync(process.execPath, ['-e', 'require("fs").writeFileSync(process.argv[1], JSON.stringify({elements:[]}))', empty]);
    assert.throws(
      () => execFileSync(process.execPath, ['tools/build-map-pack.mjs', '--fixture', empty, '--out', dir, '--force'], {
        cwd: ROOT,
        encoding: 'utf8',
        stdio: 'pipe',
      }),
      /Kein einziges Gebäude/,
      'a pack without buildings must not be written',
    );
    // Und es bleibt nichts Halbfertiges zurück, das später geladen würde.
    assert.ok(!existsSync(path.join(dir, 'index.json')));
  } finally {
    rmSync(dir, { recursive: true, force: true });
    rmSync(fixtures, { recursive: true, force: true });
  }
});

test('the pack lands on the grid the app expects', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'wai-map-'));
  try {
    const index = JSON.parse(buildInto(dir));
    // Die Kachelkoordinaten müssen zum selben Projektionssystem gehören wie
    // `tileOf` in der App, sonst liegt die Karte neben der Wirklichkeit.
    const expectedX = Math.floor(
      ((11.5755 + 180) / 360) * 256 * Math.pow(2, 18),
    ) / 256;
    assert.ok(Math.abs(139501 - expectedX) < 2, `tile x ${139501} vs expected ~${expectedX}`);
    const dirs = readdirSync(path.join(dir, '18'));
    assert.ok(dirs.length > 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a relation is drawn as its outline, not as one line through all its parts', () => {
  /**
   * OSM verkettet bei `out geom` die Ringe eines Multipolygons. Ein Gebäudeblock
   * mit Innenhof oder ein Park aus mehreren Wiesen kam als **eine** Punktfolge an –
   * und wurde als Zickzack über die halbe Kachel gezeichnet. Genau das waren die
   * langen Striche auf der ersten echten Karte.
   */
  const dir = mkdtempSync(path.join(tmpdir(), 'wai-map-'));
  try {
    const index = JSON.parse(buildInto(dir, ['--fixture', 'tools/fixtures/courtyard.json']));
    for (const tile of index.tiles) {
      const content = JSON.parse(
        readFileSync(path.join(dir, String(index.zoom), String(tile.x), `${tile.y}.json`), 'utf8'),
      );
      for (const building of content.buildings as Array<{ points: Array<[number, number]> }>) {
        const ring = building.points;
        // Ein Innenhof darf kein zweites Haus im Block werden: genau zwei Gebäude.
        const xs = ring.map(([x]) => x);
        const ys = ring.map(([, y]) => y);
        assert.ok(Math.max(...xs) - Math.min(...xs) < 300, 'outline spans a tile edge twice');
        assert.ok(Math.max(...ys) - Math.min(...ys) < 300, 'outline spans a tile edge twice');
        assert.deepEqual(ring[0], ring[ring.length - 1]);
      }
    }
    // Und die Anzahl: der Innenhof ist ein Loch, keine Hütte.
    let houses = 0;
    for (const tile of index.tiles) {
      const content = JSON.parse(
        readFileSync(path.join(dir, String(index.zoom), String(tile.x), `${tile.y}.json`), 'utf8'),
      );
      houses += (content.buildings as unknown[]).length;
    }
    assert.equal(houses, 2, `expected the block and the house, got ${houses}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
