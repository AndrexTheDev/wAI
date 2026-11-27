/**
 * Offline geospatial helpers for wAI.
 *
 * Everything here is pure math on the WGS84 ellipsoid approximation. No network,
 * no tile servers, no external API: the app must work in a basement car park or
 * in a forest without any connectivity.
 */

import { floorForm } from './i18n';

export const EARTH_RADIUS_M = 6371008.8;

export interface LatLng {
  lat: number;
  lng: number;
}

export interface LocalPoint {
  /** East offset in metres (positive = east). */
  east: number;
  /** North offset in metres (positive = north). */
  north: number;
}

const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Normalise an angle in degrees to [0, 360). */
export function normalizeDeg(deg: number): number {
  const r = deg % 360;
  return r < 0 ? r + 360 : r;
}

/** Smallest signed difference b - a in degrees, in (-180, 180]. */
export function angleDelta(a: number, b: number): number {
  let d = normalizeDeg(b - a);
  if (d > 180) d -= 360;
  return d;
}

/** Great-circle distance in metres (haversine, sub-metre accurate at app scale). */
export function distanceMeters(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(clamp(Math.sqrt(h), 0, 1));
}

/** Initial bearing from a to b, degrees clockwise from true north in [0,360). */
export function bearingDeg(a: LatLng, b: LatLng): number {
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLng = toRad(b.lng - a.lng);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return normalizeDeg(toDeg(Math.atan2(y, x)));
}

/**
 * Metres per degree of latitude/longitude at a given latitude.
 * Longitude shrinks with cos(lat) – critical for correct bearing/distance display
 * in the compass view when we only have an offset vector.
 */
export function metersPerDegree(lat: number): { lat: number; lng: number } {
  const latRad = toRad(lat);
  return {
    lat: 111132.92 - 559.82 * Math.cos(2 * latRad) + 1.175 * Math.cos(4 * latRad),
    lng: 111412.84 * Math.cos(latRad) - 93.5 * Math.cos(3 * latRad),
  };
}

/** Convert absolute coordinates to a local east/north offset around an origin. */
export function toLocal(origin: LatLng, point: LatLng): LocalPoint {
  const mpd = metersPerDegree(origin.lat);
  return {
    east: (point.lng - origin.lng) * mpd.lng,
    north: (point.lat - origin.lat) * mpd.lat,
  };
}

/** Convert a local east/north offset back into absolute coordinates. */
export function fromLocal(origin: LatLng, local: LocalPoint): LatLng {
  const mpd = metersPerDegree(origin.lat);
  return {
    lat: origin.lat + local.north / mpd.lat,
    lng: origin.lng + local.east / mpd.lng,
  };
}

/** Move from a point by distance and bearing (destination point formula). */
export function destinationPoint(origin: LatLng, distance: number, bearing: number): LatLng {
  const d = distance / EARTH_RADIUS_M;
  const brg = toRad(bearing);
  const lat1 = toRad(origin.lat);
  const lng1 = toRad(origin.lng);
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(brg),
  );
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(brg) * Math.sin(d) * Math.cos(lat1),
      Math.cos(d) - Math.sin(lat1) * Math.sin(lat2),
    );
  return { lat: toDeg(lat2), lng: ((toDeg(lng2) + 540) % 360) - 180 };
}

/**
 * Relative direction of a target as seen by the user: heading towards the target
 * minus the phone heading, normalised to (-180, 180].
 */
export function relativeBearing(userHeading: number, targetBearing: number): number {
  return angleDelta(userHeading, targetBearing);
}

/**
 * Distance unit system. Metric is the default; imperial is opt-in in settings
 * and must actually change the output (it used to be an inert switch).
 */
export type DistanceUnits = 'metric' | 'imperial';

const METRES_PER_FOOT = 0.3048;
const METRES_PER_MILE = 1609.344;

/** Human friendly distance text, localised and unit-aware. */
export function formatDistance(
  meters: number,
  locale: 'de' | 'en',
  units: DistanceUnits = 'metric',
): string {
  if (!Number.isFinite(meters)) return '–';
  const decimal = locale === 'de' ? ',' : '.';

  if (units === 'imperial') {
    const feet = meters / METRES_PER_FOOT;
    if (feet < 1000) {
      const rounded = feet < 10 ? Math.round(feet * 10) / 10 : Math.round(feet);
      return `${String(rounded).replace('.', decimal)} ft`;
    }
    const miles = meters / METRES_PER_MILE;
    const rounded = miles < 10 ? Math.round(miles * 100) / 100 : Math.round(miles * 10) / 10;
    return `${rounded.toFixed(miles < 10 ? 2 : 1).replace('.', decimal)} mi`;
  }

  if (meters < 1000) {
    const rounded = meters < 10 ? Math.round(meters * 10) / 10 : Math.round(meters);
    return `${rounded} m`;
  }
  const km = meters / 1000;
  const rounded = km < 10 ? Math.round(km * 100) / 100 : Math.round(km * 10) / 10;
  return `${rounded.toFixed(km < 10 ? 2 : 1).replace('.', decimal)} km`;
}

/** Vertical distance in the user's unit system, e.g. for the elevation beam. */
export function formatHeight(meters: number, locale: 'de' | 'en', units: DistanceUnits = 'metric'): string {
  if (!Number.isFinite(meters)) return '–';
  if (units === 'imperial') {
    return `${Math.round(meters / METRES_PER_FOOT)} ft`;
  }
  return `${Math.round(meters)} m`;
}

/** Format a compass bearing as cardinal + degree text, localised. */
const CARDINALS_DE = ['N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW'];
const CARDINALS_EN = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

export function formatBearing(deg: number, locale: 'de' | 'en'): string {
  const norm = normalizeDeg(deg);
  const table = locale === 'de' ? CARDINALS_DE : CARDINALS_EN;
  const idx = Math.round(norm / 45) % 8;
  return `${table[idx]} ${Math.round(norm)}°`;
}

/**
 * Where was the photo taken from, as a sentence?
 *
 * Ein Referenzfoto hilft nur, wenn man weiß, aus welcher Richtung es aufgenommen
 * wurde: „aufgenommen aus Südwest – dreh dich nach links" beantwortet die Frage,
 * die man im Parkhaus tatsächlich hat. Die Richtung wurde bisher gespeichert
 * (`PhotoRef.heading`) und nie angezeigt.
 *
 * Ohne Kompasskurs des Geräts (oder ohne gespeicherte Richtung) bleibt nur die
 * Aufnahmerichtung als Himmelsrichtung – geraten wird nichts.
 */
export function photoHeadingHint(
  photoHeading: number | undefined,
  currentHeading: number | null,
  locale: 'de' | 'en',
): { text: string; turn: 'left' | 'right' | 'none' } | null {
  if (typeof photoHeading !== 'number' || !Number.isFinite(photoHeading)) return null;
  const from = formatBearing(photoHeading, locale);
  if (typeof currentHeading !== 'number' || !Number.isFinite(currentHeading)) {
    return { text: locale === 'de' ? `Aufgenommen aus ${from}` : `Taken facing ${from}`, turn: 'none' };
  }
  const delta = angleDelta(currentHeading, photoHeading);
  const degrees = Math.round(Math.abs(delta));
  // Unter 25° ist „dreh dich" keine Hilfe mehr, sondern Rauschen.
  if (degrees < 25) {
    return { text: locale === 'de' ? `Aufgenommen aus ${from} – du schaust hin` : `Taken facing ${from} – you are facing it`, turn: 'none' };
  }
  const turn = delta > 0 ? 'right' : 'left';
  const text =
    locale === 'de'
      ? `Aufgenommen aus ${from} – dreh dich ${degrees}° nach ${turn === 'right' ? 'rechts' : 'links'}`
      : `Taken facing ${from} – turn ${degrees}° ${turn}`;
  return { text, turn };
}

/**
 * Rough vertical guidance when barometric / GPS altitude is available.
 * Returns a human readable layer hint plus the numeric delta.
 */
export interface ElevationHint {
  delta: number;
  level: 'same' | 'higher' | 'lower';
  /** Estimated floors, 3 m per storey – car parks and buildings. */
  floors: number;
  /** True when the difference is too large to be a building – do not quote floors. */
  implausible?: boolean;
}

export function elevationHint(targetAltitude?: number, currentAltitude?: number): ElevationHint {
  if (
    typeof targetAltitude !== 'number' ||
    typeof currentAltitude !== 'number' ||
    !Number.isFinite(targetAltitude) ||
    !Number.isFinite(currentAltitude)
  ) {
    return { delta: 0, level: 'same', floors: 0 };
  }
  const delta = targetAltitude - currentAltitude;
  const tolerance = 1.5;
  if (Math.abs(delta) <= tolerance) return { delta, level: 'same', floors: 0 };

  /**
   * Ein Höhenunterschied ist nur dann eine Aussage über Etagen, wenn er plausibel
   * zu einem Gebäude passt. Ein Demo-Anker bei 640 m und ein Kompass bei 411 m
   * ergaben „ca. 76 Etage(n)" — technisch korrekt gerechnet und trotzdem Unsinn:
   * bei über 60 m Differenz ist die Ursache eine andere (falscher Ort, falsche
   * Höhenreferenz), und die App sollte das zugeben statt eine Zahl zu erfinden.
   */
  const FLOOR_HEIGHT_M = 3;
  const PLAUSIBLE_BUILDING_M = 60;
  const magnitude = Math.abs(delta);
  if (magnitude > PLAUSIBLE_BUILDING_M) {
    return { delta, level: delta > 0 ? 'higher' : 'lower', floors: 0, implausible: true };
  }
  return {
    delta,
    level: delta > 0 ? 'higher' : 'lower',
    floors: Math.max(1, Math.round(magnitude / FLOOR_HEIGHT_M)),
  };
}

/**
 * Douglas–Peucker simplification of a GPS breadcrumb trail.
 * Keeps the shape of the path while dropping redundant points, which matters for
 * battery, storage and rendering performance offline.
 */
export function simplifyTrail<T extends LatLng>(points: T[], epsilonMeters = 4): T[] {
  if (points.length <= 2) return [...points];
  const keep = new Array<boolean>(points.length).fill(false);
  keep[0] = true;
  keep[points.length - 1] = true;

  const stack: Array<[number, number]> = [[0, points.length - 1]];
  while (stack.length) {
    const [first, last] = stack.pop()!;
    let maxDist = 0;
    let index = -1;
    for (let i = first + 1; i < last; i++) {
      const d = perpendicularDistance(points[i], points[first], points[last]);
      if (d > maxDist) {
        maxDist = d;
        index = i;
      }
    }
    if (maxDist > epsilonMeters && index !== -1) {
      keep[index] = true;
      stack.push([first, index], [index, last]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

function perpendicularDistance(p: LatLng, a: LatLng, b: LatLng): number {
  const origin = a;
  const pp = toLocal(origin, p);
  const bb = toLocal(origin, b);
  const dx = bb.east;
  const dy = bb.north;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(pp.east, pp.north);
  const t = clamp((pp.east * dx + pp.north * dy) / lenSq, 0, 1);
  return Math.hypot(pp.east - t * dx, pp.north - t * dy);
}

/** Total walked length of a trail in metres. */
export function trailLength(points: LatLng[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += distanceMeters(points[i - 1], points[i]);
  return total;
}

/**
 * Step-by-step verbal guidance for the last metres, entirely offline.
 * Used for screen-reader output and the "Näher dran" proximity feedback.
 */
export function guidanceText(
  distance: number,
  relative: number,
  elevation: ElevationHint,
  locale: 'de' | 'en',
): string {
  const abs = Math.abs(relative);
  const dir =
    abs < 20
      ? locale === 'de'
        ? 'geradeaus'
        : 'straight ahead'
      : abs < 65
        ? locale === 'de'
          ? relative > 0
            ? 'leicht rechts'
            : 'leicht links'
          : relative > 0
            ? 'slightly right'
            : 'slightly left'
        : abs < 125
          ? locale === 'de'
            ? relative > 0
              ? 'rechts'
              : 'links'
            : relative > 0
              ? 'right'
              : 'left'
          : locale === 'de'
            ? 'hinter dir'
            : 'behind you';

  const elevationText =
    elevation.level === 'same'
      ? ''
      : // Bei unplausiblem Unterschied keine Etagen erfinden (siehe elevationHint).
        elevation.implausible
        ? ''
        : (() => {
            // „3 Etagen höher", nicht „3 Etage(n) höher" – die Form entscheidet die
            // Zahl, nicht der Platzhalter.
            const floors = elevation.floors || 1;
            const word = floorForm(floors, locale);
            const direction =
              locale === 'de'
                ? elevation.level === 'higher'
                  ? 'höher'
                  : 'tiefer'
                : elevation.level === 'higher'
                  ? 'up'
                  : 'down';
            return ` · ${floors} ${word} ${direction}`;
          })();

  return `${formatDistance(distance, locale)} ${dir}${elevationText}`;
}
