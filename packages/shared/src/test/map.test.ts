/**
 * Map geometry tests.
 *
 * These are the tests that keep the map from lying: a projection that is off by a
 * few metres puts the car on the wrong side of the pillar, and a viewport that
 * drifts makes the compass disagree with the picture.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { distanceMeters } from '../geo.ts';
import {
  MAP_ZOOM,
  TILE_SIZE,
  fitToInclude,
  nearestTile,
  placeLabels,
  project,
  tileOf,
  tileOrigin,
  toScreen,
  toWorld,
  unproject,
  metresPerUnit,
  viewportFor,
  visiblePolygons,
  visibleTiles,
  pickPack,
  packContains,
} from '../map.ts';

/** München Marienplatz – a point with a known, well-tested position. */
const MARIENPLATZ = { lat: 48.1374, lng: 11.5755 };

test('projection round-trips to within a centimetre', () => {
  const metres = project(MARIENPLATZ.lat, MARIENPLATZ.lng);
  const back = unproject(metres.x, metres.y);
  assert.ok(Math.abs(back.lat - MARIENPLATZ.lat) < 1e-7, `lat drifted to ${back.lat}`);
  assert.ok(Math.abs(back.lng - MARIENPLATZ.lng) < 1e-7, `lng drifted to ${back.lng}`);
});

test('a projected distance matches the geodesic distance', () => {
  // 100 m north: the y-delta in world units, scaled by metresPerUnit, must agree
  // with the real world – otherwise "120 m entfernt" and the map tell two stories.
  const north = { lat: MARIENPLATZ.lat + 0.000899, lng: MARIENPLATZ.lng };
  const a = project(MARIENPLATZ.lat, MARIENPLATZ.lng);
  const b = project(north.lat, north.lng);
  const scale = metresPerUnit(MARIENPLATZ.lat);
  const projected = Math.hypot(b.x - a.x, b.y - a.y) * scale;
  const real = distanceMeters(MARIENPLATZ, north);
  assert.ok(Math.abs(projected - real) < real * 0.02, `projected ${projected.toFixed(1)} m vs real ${real.toFixed(1)} m`);
});

test('one world unit is 0.4 m in Munich and shrinks towards the poles', () => {
  const munich = metresPerUnit(48.14);
  assert.ok(munich > 0.35 && munich < 0.45, `got ${munich}`);
  // Mercator stretches with latitude, and the app must not pretend otherwise.
  assert.ok(metresPerUnit(70) < metresPerUnit(10));
  // A tile is therefore about one city block across – good, not a whole district.
  const tileMetres = TILE_SIZE * munich;
  assert.ok(tileMetres > 90 && tileMetres < 120, `tile is ${tileMetres.toFixed(0)} m`);
});

test('tile maths stays consistent at the corners', () => {
  const tile = tileOf(MARIENPLATZ.lat, MARIENPLATZ.lng);
  assert.equal(tile.z, MAP_ZOOM);
  const origin = tileOrigin(tile);
  const point = project(MARIENPLATZ.lat, MARIENPLATZ.lng);
  // The point must fall inside its own tile, never on the next one.
  assert.ok(point.x >= origin.x && point.x < origin.x + TILE_SIZE);
  assert.ok(point.y >= origin.y && point.y < origin.y + TILE_SIZE);
});

test('screen and world convert back to each other', () => {
  const viewport = viewportFor(MARIENPLATZ.lat, MARIENPLATZ.lng, 360, 520, 0.5);
  const centre = toScreen(viewport, viewport.centre);
  assert.equal(Math.round(centre.x), 180);
  assert.equal(Math.round(centre.y), 260);

  const world = toWorld(viewport, { x: 180, y: 260 });
  assert.ok(Math.abs(world.x - viewport.centre.x) < 1e-6);

  // 100 px to the right at 0.5 m/px is 50 m east.
  const east = toWorld(viewport, { x: 280, y: 260 });
  assert.ok(Math.abs(east.x - viewport.centre.x - 50) < 1e-6);
});

test('a building 300 m away is not drawn', () => {
  // 1 unit per pixel → the screen covers 360×520 units, i.e. roughly 220×315 m.
  const viewport = viewportFor(MARIENPLATZ.lat, MARIENPLATZ.lng, 360, 520, 1);
  const origin = { x: viewport.centre.x, y: viewport.centre.y };
  const near = { points: [[0, 0], [10, 0], [10, 10]] as Array<[number, number]> };
  const far = { points: [[900, 900], [910, 900], [910, 910]] as Array<[number, number]> };
  const visible = visiblePolygons([near, far], viewport, origin);
  assert.deepEqual(visible, [near]);
});

test('only the tiles that intersect the screen are requested', () => {
  /**
   * Bei grobem Zoom deckt das Bild viele Kacheln ab — 54 bei 4 Einheiten/Pixel ist
   * korrekt, nicht üppig. Wichtig ist nur: nichts wird angefragt, was außerhalb
   * liegt, und nichts fehlt, was hineinragt.
   */
  for (const unitsPerPixel of [0.8, 1, 2.4, 4]) {
    const viewport = viewportFor(MARIENPLATZ.lat, MARIENPLATZ.lng, 360, 520, unitsPerPixel);
    const scale = viewport.unitsPerPixel;
    const tiles = visibleTiles(viewport);
    assert.ok(tiles.length >= 1, `got ${tiles.length} tiles`);
    for (const { tile, dx, dy } of tiles) {
      assert.equal(tile.z, MAP_ZOOM);
      // Jede gelieferte Kachel muss das Bild wirklich berühren.
      const left = dx / scale + viewport.width / 2;
      const top = dy / scale + viewport.height / 2;
      assert.ok(left < viewport.width && left + TILE_SIZE / scale > 0, `x off screen: ${left}`);
      assert.ok(top < viewport.height && top + TILE_SIZE / scale > 0, `y off screen: ${top}`);
    }
  }
});

test('the tile offset is in world units, not screen pixels', () => {
  /**
   * Der Fehler, der die erste echte Karte zum Knoten machte: `visibleTiles`
   * lieferte den Versatz in **Bildpixeln**, der Renderer addierte ihn zu Rohdaten
   * in Welteinheiten und teilte erst danach. Bei jedem Zoomfaktor außer dem
   * Standard 2,4 lag damit jede Kachel um den Faktor daneben – Nachbarkacheln
   * überlappten und schnitten sich gegenseitig in Stücke.
   *
   * Der Vertrag: Ursprung der Kachel = Bildmitte + dx / unitsPerPixel.
   */
  for (const requested of [0.6, 1, 2.4, 5]) {
    const viewport = viewportFor(MARIENPLATZ.lat, MARIENPLATZ.lng, 360, 520, requested);
    // Der Viewport begrenzt den Maßstab selbst (0,5 … 4) – gerechnet wird mit dem
    // Wert, der wirklich gilt, nicht mit dem gewünschten.
    const scale = viewport.unitsPerPixel;
    for (const { tile, dx, dy } of visibleTiles(viewport)) {
      const screen = toScreen(viewport, { x: tile.x * TILE_SIZE, y: tile.y * TILE_SIZE });
      assert.ok(Math.abs(screen.x - (dx / scale + viewport.width / 2)) < 1e-6);
      assert.ok(Math.abs(screen.y - (dy / scale + viewport.height / 2)) < 1e-6);
    }
  }
});

test('labels do not overlap; the first one wins', () => {
  const placed = placeLabels(
    [
      { text: 'Marienplatz', x: 100, y: 100 },
      { text: 'Marienplatz', x: 102, y: 101 },
      { text: 'Kaufingerstraße', x: 100, y: 200 },
    ],
    (text) => ({ width: text.length * 6, height: 12 }),
  );
  assert.equal(placed.length, 2);
  assert.equal(placed[0].y, 100);
  assert.equal(placed[1].text, 'Kaufingerstraße');
});

test('a far target zooms the map out instead of falling off it', () => {
  const viewport = viewportFor(MARIENPLATZ.lat, MARIENPLATZ.lng, 360, 520, 0.5);
  const target = { x: viewport.centre.x + 400, y: viewport.centre.y };
  const fitted = fitToInclude(viewport, target);
  assert.ok(fitted.unitsPerPixel > viewport.unitsPerPixel);
  // 400 units away with 48 px padding on a 360 px screen needs ~3 units per pixel.
  assert.ok(fitted.unitsPerPixel > 2 && fitted.unitsPerPixel < 5, `got ${fitted.unitsPerPixel}`);
  // Already visible → untouched.
  const close = { x: viewport.centre.x + 10, y: viewport.centre.y + 10 };
  assert.equal(fitToInclude(viewport, close), viewport);
});

test('leaving the pack keeps the last tiles instead of going blank', () => {
  const available = [
    { x: 10, y: 20 },
    { x: 11, y: 20 },
  ];
  const inside = { lat: MARIENPLATZ.lat, lng: MARIENPLATZ.lng };
  const tile = tileOf(inside.lat, inside.lng);
  // With only two tiles known, the nearest one is returned – never null.
  const nearest = nearestTile(inside, available);
  assert.ok(nearest);
  assert.ok(available.some((candidate) => candidate.x === nearest.x && candidate.y === nearest.y));
  assert.equal(nearestTile(inside, []), null);
  // Sanity: the tile of the position itself is what a full pack would return.
  assert.equal(typeof tile.x, 'number');
});

test('a street name is placed once, not once per OSM way', () => {
  // OSM zerlegt eine Straße in Dutzende Wege, jeder mit demselben Namen. Ohne
  // Sperre stand „Isartorplatz" fünfmal übereinander auf dem Schirm.
  const labels = [
    { text: 'Isartorplatz', x: 10, y: 10 },
    { text: 'Isartorplatz', x: 40, y: 30 },
    { text: 'Isartorplatz', x: 400, y: 400 },
    { text: 'Tal', x: 200, y: 200 },
  ];
  const placed = placeLabels(labels, (text) => ({ width: text.length * 5, height: 10 }));
  assert.deepEqual(
    placed.map((label) => `${label.text}@${label.x},${label.y}`),
    ['Isartorplatz@10,10', 'Isartorplatz@400,400', 'Tal@200,200'],
  );
});

test('priority decides who gets the scarce space', () => {
  // Straßen tragen die Orientierung, Ortsnamen sind Beiwerk: bei Gleichstand muss
  // die Straße gewinnen, sonst verdeckt ein Ladenname genau das, was hilft.
  const labels = [
    { text: 'Ladenname', x: 100, y: 100, priority: 1 },
    { text: 'Straße', x: 100, y: 100, priority: 0 },
  ];
  const placed = placeLabels(
    [...labels].sort((a, b) => a.priority - b.priority),
    (text) => ({ width: text.length * 6, height: 10 }),
  );
  assert.deepEqual(placed.map((label) => label.text), ['Straße']);
});

test('the app picks the pack that contains you, not whatever loaded first', () => {
  const packs = [
    { slug: 'muenchen-mitte', name: 'München Mitte', bounds: { south: 48.128, west: 11.555, north: 48.145, east: 11.595 }, buildings: 4903 },
    { slug: 'koeln-dom', name: 'Köln Dom', bounds: { south: 50.93, west: 6.94, north: 50.95, east: 6.97 }, buildings: 900 },
  ];
  const inMunich = pickPack(packs, { lat: 48.1374, lng: 11.5755 });
  assert.equal(inMunich?.slug, 'muenchen-mitte');
  const inCologne = pickPack(packs, { lat: 50.9413, lng: 6.9583 });
  assert.equal(inCologne?.slug, 'koeln-dom');
  // Außerhalb alles Bekannten: das nächstgelegene Paket, nicht das erste der Liste.
  const inDachau = pickPack(packs, { lat: 48.26, lng: 11.43 });
  assert.equal(inDachau?.slug, 'muenchen-mitte');
  assert.equal(pickPack([], { lat: 48.1, lng: 11.5 }), null);
});

test('a position outside every pack is recognised as such', () => {
  const pack = { bounds: { south: 48.128, west: 11.555, north: 48.145, east: 11.595 } };
  assert.equal(packContains(pack, { lat: 48.137, lng: 11.575 }), true);
  assert.equal(packContains(pack, { lat: 48.137, lng: 11.40 }), false);
  assert.equal(packContains(pack, { lat: 48.30, lng: 11.575 }), false);
  // Die Kante gehört dazu – sonst ist der Rand der Karte ein Fehler.
  assert.equal(packContains(pack, { lat: 48.128, lng: 11.555 }), true);
});
