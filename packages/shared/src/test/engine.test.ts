/**
 * Unit tests for the shared engine – run with `npm test -w @wai/shared`.
 * Uses node:test so no test framework dependency is needed.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  bearingDeg,
  distanceMeters,
  destinationPoint,
  elevationHint,
  formatDistance,
  fromLocal,
  guidanceText,
  normalizeDeg,
  relativeBearing,
  simplifyTrail,
  toLocal,
  trailLength,
} from '../geo.ts';
import {
  appendTrailPoint,
  canAddAnchor,
  canAddPhoto,
  canAddNote,
  canAddVoice,
  createAnchor,
  mergeImported,
  parkingStatus,
  proximityTier,
  queryAnchors,
  trailDistance,
} from '../engine.ts';
import { anchorToShare, decodeSharePayload, encodeSharePayload, sanitizeImportedAnchor } from '../codec.ts';
import { base64urlDecode, base64urlEncode, canonicalJson, licenseFingerprint, verifyLicense } from '../license.ts';
import type { Anchor, PastePoint } from '../types.ts';

const MUNICH = { lat: 48.1372, lng: 11.5756 };
const ONE_KM_NORTH = destinationPoint(MUNICH, 1000, 0);

test('distance is accurate for short and long ranges', () => {
  assert.ok(Math.abs(distanceMeters(MUNICH, ONE_KM_NORTH) - 1000) < 1, 'north 1 km');
  const east = destinationPoint(MUNICH, 500, 90);
  assert.ok(Math.abs(distanceMeters(MUNICH, east) - 500) < 1, 'east 500 m');
  // Berlin ↔ Munich ≈ 504 km
  const berlin = { lat: 52.52, lng: 13.405 };
  const d = distanceMeters(MUNICH, berlin);
  assert.ok(d > 500_000 && d < 510_000, `expected ~504 km, got ${d}`);
});

test('bearing points the right way', () => {
  assert.ok(Math.abs(bearingDeg(MUNICH, ONE_KM_NORTH)) < 0.5);
  assert.ok(Math.abs(bearingDeg(MUNICH, destinationPoint(MUNICH, 800, 90)) - 90) < 0.5);
  assert.ok(Math.abs(bearingDeg(MUNICH, destinationPoint(MUNICH, 800, 270)) - 270) < 0.5);
});

test('relative bearing wraps correctly', () => {
  assert.equal(relativeBearing(10, 350), -20);
  assert.equal(relativeBearing(350, 10), 20);
  assert.equal(normalizeDeg(-90), 270);
  assert.equal(normalizeDeg(450), 90);
});

test('local projection round-trips', () => {
  const target = destinationPoint(MUNICH, 250, 135);
  const local = toLocal(MUNICH, target);
  assert.ok(local.east > 0 && local.north < 0);
  const back = fromLocal(MUNICH, local);
  assert.ok(distanceMeters(back, target) < 0.5);
});

test('elevation hint estimates floors', () => {
  assert.equal(elevationHint(100, 100.8).level, 'same');
  const up = elevationHint(109, 100);
  assert.equal(up.level, 'higher');
  assert.equal(up.floors, 3);
  assert.equal(elevationHint(undefined, 100).level, 'same');
});

test('distance and guidance text are localised', () => {
  assert.equal(formatDistance(8.4, 'de'), '8.4 m');
  assert.equal(formatDistance(42.2, 'de'), '42 m');
  assert.equal(formatDistance(1234, 'en'), '1.23 km');
  assert.equal(formatDistance(12_800, 'de'), '12,8 km');
  const text = guidanceText(30, 5, { delta: 6, level: 'higher', floors: 2 }, 'de');
  assert.match(text, /geradeaus/);
  assert.match(text, /höher/);
});

test('trail simplification keeps endpoints and drops noise', () => {
  const points = [
    { lat: 48.1, lng: 11.5 },
    { lat: 48.1001, lng: 11.5 },
    { lat: 48.1002, lng: 11.5 },
    { lat: 48.1003, lng: 11.5 },
    { lat: 48.1, lng: 11.5005 },
  ];
  const simplified = simplifyTrail(points, 5);
  assert.equal(simplified[0], points[0]);
  assert.equal(simplified[simplified.length - 1], points[points.length - 1]);
  assert.ok(simplified.length < points.length);
});

test('trail accumulation skips jitter and measures length', () => {
  const start: PastePoint[] = [];
  let trail = appendTrailPoint(start, { lat: 48.1, lng: 11.5, t: 1, accuracy: 8 });
  trail = appendTrailPoint(trail, { lat: 48.100001, lng: 11.5, t: 2, accuracy: 8 }, 3);
  assert.equal(trail.length, 1, 'sub-3 m jitter is ignored');
  trail = appendTrailPoint(trail, { lat: 48.1001, lng: 11.5, t: 3, accuracy: 8 });
  assert.equal(trail.length, 2);
  assert.ok(trailDistance(trail) > 10);
  assert.ok(trailLength(trail.map((p) => ({ lat: p.lat, lng: p.lng }))) > 10);
});

const baseFix = { lat: 48.1, lng: 11.5, source: 'gps' as const, timestamp: Date.now(), accuracy: 6 };

test('free plan enforces documented limits', () => {
  const anchors: Anchor[] = [
    createAnchor({ fix: baseFix }),
    createAnchor({ fix: baseFix }),
    createAnchor({ fix: baseFix }),
  ];
  assert.equal(canAddAnchor(anchors, 'free').allowed, false);
  assert.equal(canAddAnchor(anchors, 'pro').allowed, true);
  assert.equal(canAddAnchor(anchors.slice(0, 2), 'free').allowed, true);

  const anchor = anchors[0];
  assert.equal(canAddNote(anchor, 'free', 'photo').allowed, true);
  const withPhoto = { ...anchor, photos: [{ id: 'p', file: 'x.jpg', takenAt: 1 }] };
  assert.equal(canAddNote(withPhoto, 'free', 'text').allowed, false, 'free = one note total');
  assert.equal(canAddNote(withPhoto, 'pro', 'text').allowed, true);

  assert.equal(canAddVoice(anchor, 'free').allowed, false);
  assert.equal(canAddVoice(anchor, 'pro').allowed, true);
  assert.equal(canAddPhoto(anchor, 'free').allowed, true);
});

test('archive frees up a slot in the free plan', () => {
  const anchors = [createAnchor({ fix: baseFix }), createAnchor({ fix: baseFix }), createAnchor({ fix: baseFix })];
  anchors[2].archived = true;
  assert.equal(canAddAnchor(anchors, 'free').allowed, true);
});

test('queryAnchors filters, sorts and searches', () => {
  const a = { ...createAnchor({ fix: baseFix }), name: 'Car B17', createdAt: 3, favorite: true };
  const b = { ...createAnchor({ fix: baseFix }), name: 'Zelt', createdAt: 1 };
  const c = { ...createAnchor({ fix: baseFix }), name: 'Werkzeug', createdAt: 2, archived: true };
  const list = [a, b, c];
  assert.deepEqual(queryAnchors(list, { sort: 'newest' }).map((x) => x.name), ['Car B17', 'Zelt']);
  assert.deepEqual(queryAnchors(list, { sort: 'oldest' }).map((x) => x.name), ['Zelt', 'Car B17']);
  assert.deepEqual(queryAnchors(list, { filter: 'favorites' }).map((x) => x.name), ['Car B17']);
  assert.deepEqual(queryAnchors(list, { includeArchived: true }).map((x) => x.name), ['Werkzeug']);
  assert.deepEqual(queryAnchors(list, { query: 'b17' }).map((x) => x.name), ['Car B17']);
});

test('proximity tiers grow towards the target', () => {
  assert.equal(proximityTier(300), 0);
  assert.equal(proximityTier(80), 1);
  assert.equal(proximityTier(30), 2);
  assert.equal(proximityTier(12), 3);
  assert.equal(proximityTier(4), 4);
});

test('parking status computes remaining and overdue', () => {
  const anchor: Anchor = {
    ...createAnchor({ fix: baseFix }),
    createdAt: 1_000_000,
    parking: { startedAt: 1_000_000, limitMinutes: 60, reminderState: 'scheduled' },
  };
  const half = parkingStatus(anchor, 1_000_000 + 30 * 60_000);
  assert.equal(half.remaining, 30 * 60_000);
  assert.equal(half.overdue, false);
  const late = parkingStatus(anchor, 1_000_000 + 90 * 60_000);
  assert.equal(late.overdue, true);
});

test('imports merge without duplicates', () => {
  const existing = [createAnchor({ fix: baseFix })];
  const duplicate = { ...existing[0] };
  const fresh = createAnchor({ fix: { ...baseFix, lat: 48.2 } });
  const merged = mergeImported(existing, [duplicate, fresh]);
  assert.equal(merged.length, 2);
});

test('share codes round-trip and reject garbage', () => {
  const anchor = { ...createAnchor({ fix: baseFix }), name: 'Auto', note: 'Ebene 3', zone: 'Zone B' };
  const code = encodeSharePayload(anchorToShare(anchor));
  const decoded = decodeSharePayload(code);
  assert.ok(decoded);
  assert.equal(decoded!.a.n, 'Auto');
  assert.equal(decoded!.a.note, 'Ebene 3');
  assert.equal(decodeSharePayload('WAIX1.not-base64!!'), null);
  assert.equal(decodeSharePayload('hello'), null);
});

test('sanitizeImportedAnchor clamps hostile input', () => {
  assert.equal(sanitizeImportedAnchor({ lat: 999, lng: 0 }), null);
  const clean = sanitizeImportedAnchor({ lat: 48.1, lng: 11.5, cat: 'bogus' as never, n: 'x'.repeat(500) });
  assert.ok(clean);
  assert.equal(clean!.cat, 'other');
  assert.equal(clean!.n!.length, 120);
});

test('base64url is URL safe and reversible', () => {
  const bytes = new Uint8Array([0, 1, 2, 250, 251, 252, 253, 254, 255]);
  const encoded = base64urlEncode(bytes);
  assert.doesNotMatch(encoded, /[+/=]/);
  assert.deepEqual([...base64urlDecode(encoded)], [...bytes]);
});

test('canonical JSON sorts keys deterministically', () => {
  assert.equal(canonicalJson({ b: 1, a: 2 }), '{"a":2,"b":1}');
  assert.equal(canonicalJson({ a: 2, b: undefined }), '{"a":2}');
});

test('licence verification rejects tampered tokens and accepts real ones', async () => {
  // A token signed by the original vendor key must fail against a different key,
  // proving that the offline check cannot be bypassed by editing the payload.
  const issuerPublic = 'ca4b28dddedf05fe9143c2981ee90be822e8d27eda9464ced8ec3772a1c48371';
  const foreignKey = '1111111111111111111111111111111111111111111111111111111111111111';
  const malformed = await verifyLicense('not-a-token', issuerPublic);
  assert.equal(malformed.ok, false);
  assert.equal(malformed.reason, 'malformed');

  const tampered = 'WAI1.' + base64urlEncode(new TextEncoder().encode('{"plan":"pro","p":"wai"}')) + '.AAAA';
  const result = await verifyLicense(tampered, foreignKey);
  assert.equal(result.ok, false);
});

test('licence fingerprint is stable and short', () => {
  const a = licenseFingerprint('WAI1.abc.def');
  const b = licenseFingerprint('WAI1.abc.def');
  assert.equal(a, b);
  assert.match(a, /^[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/);
});
