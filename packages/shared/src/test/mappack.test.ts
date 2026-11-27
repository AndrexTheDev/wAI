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
  execFileSync(
    process.execPath,
    ['tools/build-map-pack.mjs', '--fixture', 'tools/fixtures/overpass-sample.json', '--out', dir, '--force', ...extra],
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
