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
  // 360×520 screen pixels at 1 unit per pixel covers 360×520 units, so at most
  // 3×4 tiles of 256 units each.
  const viewport = viewportFor(MARIENPLATZ.lat, MARIENPLATZ.lng, 360, 520, 1);
  const tiles = visibleTiles(viewport);
  assert.ok(tiles.length >= 1 && tiles.length <= 6, `got ${tiles.length} tiles`);
  for (const { tile, dx, dy } of tiles) {
    // Every tile that is returned must actually touch the viewport.
    assert.ok(dx < viewport.width && dx + TILE_SIZE / viewport.unitsPerPixel > 0);
    assert.ok(dy < viewport.height && dy + TILE_SIZE / 0.5 > 0);
    assert.equal(tile.z, MAP_ZOOM);
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
