/**
 * Framework-agnostic anchor engine.
 *
 * The React UI in the Android app and the browser demo both drive their state
 * through these pure helpers, so business rules (free limits, validation,
 * proximity thresholds, trail accumulation) are implemented exactly once and
 * are unit-testable without a DOM.
 */
import { FREE_LIMITS, PRO_FEATURES } from './product';
import {
  bearingDeg,
  distanceMeters,
  elevationHint,
  guidanceText,
  normalizeDeg,
  relativeBearing,
  simplifyTrail,
  type ElevationHint,
  type LatLng,
} from './geo';
import type { Anchor, AnchorCategory, GeoFix, ParkingReminderState, PastePoint } from './types';

export interface PlanLimits {
  activeAnchors: number;
  notesPerAnchor: number;
  photosPerAnchor: number;
  voicePerAnchor: number;
  multiView: boolean;
  breadcrumbTrail: boolean;
  proximityFeedback: boolean;
  parkTimer: boolean;
  mediaShare: boolean;
  archive: boolean;
  favorites: boolean;
}

export function limitsFor(plan: 'free' | 'pro'): PlanLimits {
  if (plan === 'pro') return { ...PRO_FEATURES };
  return { ...FREE_LIMITS };
}

export const countActive = (anchors: readonly Anchor[]): number =>
  anchors.filter((a) => !a.archived).length;

export interface CreateAnchorInput {
  fix: GeoFix;
  name?: string;
  category?: AnchorCategory;
  note?: string;
  zone?: string;
  floorLabel?: string;
  altitude?: number;
}

export const newId = (): string => {
  const bytes = new Uint8Array(8);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  return `a_${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}`;
};

export function createAnchor({ fix, ...rest }: CreateAnchorInput): Anchor {
  const now = Date.now();
  return {
    id: newId(),
    name: rest.name?.trim() || '',
    category: rest.category ?? 'other',
    lat: fix.lat,
    lng: fix.lng,
    altitude: Number.isFinite(fix.altitude ?? NaN) ? fix.altitude : rest.altitude,
    accuracy: fix.accuracy,
    source: fix.source,
    createdAt: now,
    updatedAt: now,
    note: rest.note,
    zone: rest.zone,
    floorLabel: rest.floorLabel,
    photos: [],
    voices: [],
    favorite: false,
    archived: false,
    trail: [],
  };
}

export interface LimitCheck {
  allowed: boolean;
  reason?:
    | 'active-anchor-limit'
    | 'note-limit'
    | 'photo-limit'
    | 'voice-limit'
    | 'pro-only';
  /** Feature name for the upgrade prompt. */
  feature?: keyof PlanLimits;
}

export function canAddAnchor(anchors: readonly Anchor[], plan: 'free' | 'pro'): LimitCheck {
  const limits = limitsFor(plan);
  if (countActive(anchors) >= limits.activeAnchors) {
    return { allowed: false, reason: 'active-anchor-limit', feature: 'activeAnchors' };
  }
  return { allowed: true };
}

export function canAddPhoto(anchor: Anchor, plan: 'free' | 'pro'): LimitCheck {
  const limits = limitsFor(plan);
  if (anchor.photos.length >= limits.photosPerAnchor) {
    return { allowed: false, reason: 'photo-limit', feature: 'photosPerAnchor' };
  }
  return { allowed: true };
}

export function canAddVoice(anchor: Anchor, plan: 'free' | 'pro'): LimitCheck {
  const limits = limitsFor(plan);
  if (limits.voicePerAnchor <= 0) return { allowed: false, reason: 'pro-only', feature: 'voicePerAnchor' };
  if (anchor.voices.length >= limits.voicePerAnchor) {
    return { allowed: false, reason: 'voice-limit', feature: 'voicePerAnchor' };
  }
  return { allowed: true };
}

/**
 * Free plan: one note *in total* per anchor – either a photo or a text note.
 * Pro: unlimited. This mirrors the marketing promise exactly.
 */
export function canAddNote(anchor: Anchor, plan: 'free' | 'pro', kind: 'photo' | 'text'): LimitCheck {
  if (plan === 'pro') return { allowed: true };
  const hasAny = anchor.photos.length > 0 || Boolean(anchor.note?.trim());
  if (hasAny) {
    return { allowed: false, reason: 'note-limit', feature: 'notesPerAnchor' };
  }
  if (kind === 'photo' && anchor.photos.length >= FREE_LIMITS.photosPerAnchor) {
    return { allowed: false, reason: 'photo-limit', feature: 'photosPerAnchor' };
  }
  return { allowed: true };
}

export type SortMode = 'newest' | 'oldest' | 'nearest' | 'name';
export type FilterMode = 'all' | 'favorites';

export interface QueryOptions {
  query?: string;
  filter?: FilterMode;
  sort?: SortMode;
  includeArchived?: boolean;
  origin?: LatLng;
  category?: AnchorCategory | 'all';
}

const collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true });

export function queryAnchors(
  anchors: readonly Anchor[],
  { query = '', filter = 'all', sort = 'newest', includeArchived = false, origin, category = 'all' }: QueryOptions = {},
): Anchor[] {
  const needle = query.trim().toLowerCase();
  const filtered = anchors.filter((a) => {
    if (!includeArchived && a.archived) return false;
    if (includeArchived && !a.archived) return false;
    if (filter === 'favorites' && !a.favorite) return false;
    if (category !== 'all' && a.category !== category) return false;
    if (!needle) return true;
    return (
      a.name.toLowerCase().includes(needle) ||
      (a.note ?? '').toLowerCase().includes(needle) ||
      (a.zone ?? '').toLowerCase().includes(needle)
    );
  });

  const withDistance = filtered.map((a) => ({
    a,
    distance: origin ? distanceMeters(origin, a) : Number.POSITIVE_INFINITY,
  }));

  switch (sort) {
    case 'oldest':
      withDistance.sort((x, y) => x.a.createdAt - y.a.createdAt);
      break;
    case 'name':
      withDistance.sort((x, y) => collator.compare(x.a.name || '~', y.a.name || '~'));
      break;
    case 'nearest':
      withDistance.sort((x, y) => x.distance - y.distance);
      break;
    default:
      withDistance.sort((x, y) => y.a.createdAt - x.a.createdAt);
  }
  return withDistance.map((x) => x.a);
}

export interface Guidance {
  distance: number;
  bearing: number;
  relative: number;
  elevation: ElevationHint;
  text: string;
  /** 0 = far away, 1 = at the target. Used for proximity feedback intensity. */
  closeness: number;
  arrived: boolean;
}

/**
 * Compute everything the guidance screen needs in one pass.
 * `radius` scales the proximity ramp (GPS accuracy aware).
 */
export function guidanceFor(
  origin: LatLng,
  anchor: Anchor,
  heading: number,
  locale: 'de' | 'en',
  currentAltitude?: number,
  arrivedRadius = 8,
): Guidance {
  const distance = distanceMeters(origin, anchor);
  const bearing = bearingDeg(origin, anchor);
  const relative = relativeBearing(heading, bearing);
  const elevation = elevationHint(anchor.altitude, currentAltitude);
  const text = guidanceText(distance, relative, elevation, locale);
  const ramp = 120;
  const closeness = Math.max(0, Math.min(1, 1 - distance / ramp));
  return {
    distance,
    bearing,
    relative,
    elevation,
    text,
    closeness,
    arrived: distance <= arrivedRadius,
  };
}

/**
 * Feedback tier for the "getting closer" signal. Haptic pattern length and beep
 * frequency are derived from this in the device layer.
 */
export type ProximityTier = 0 | 1 | 2 | 3 | 4;

export function proximityTier(distance: number, arrivedRadius = 8): ProximityTier {
  if (distance <= arrivedRadius) return 4;
  if (distance <= 15) return 3;
  if (distance <= 40) return 2;
  if (distance <= 100) return 1;
  return 0;
}

/** Interval in ms between haptic/beep pulses for a tier (lower = more urgent). */
export function proximityInterval(tier: ProximityTier): number {
  return [1400, 900, 550, 300, 140][tier] ?? 1400;
}

/**
 * Append a new GPS sample to a trail. Points closer than `minDistance` are
 * skipped to avoid noise, and the trail is simplified when it gets long.
 */
export function appendTrailPoint(
  trail: readonly PastePoint[] | undefined,
  point: PastePoint,
  minDistance = 3,
  maxPoints = 500,
): PastePoint[] {
  const list = trail ? [...trail] : [];
  const last = list[list.length - 1];
  if (last && distanceMeters(last, point) < minDistance) return list;
  list.push(point);
  if (list.length <= maxPoints) return list;
  return simplifyTrail(list, 2).slice(-maxPoints);
}

/** Total length of a trail in metres. */
export function trailDistance(trail: readonly PastePoint[] | undefined): number {
  if (!trail || trail.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < trail.length; i++) total += distanceMeters(trail[i - 1], trail[i]);
  return total;
}

/**
 * Dead-reckoning fallback used when GPS is unavailable (underground, indoors).
 * Integrates step length and the compass heading since the last fix. Accuracy
 * grows with distance travelled – surfaced honestly in the UI.
 */
export class DeadReckoner {
  private lat: number;
  private lng: number;
  private heading = 0;
  private traveled = 0;
  private steps = 0;
  private readonly stepLength: number;

  constructor(origin: LatLng, stepLength = 0.72) {
    this.lat = origin.lat;
    this.lng = origin.lng;
    this.stepLength = stepLength;
  }

  setHeading(headingDeg: number): void {
    this.heading = normalizeDeg(headingDeg);
  }

  /** Feed a detected step. Returns the new estimated position. */
  step(count = 1): LatLng {
    const metersPerDegLat = 111132.92;
    const metersPerDegLng = 111320 * Math.cos((this.lat * Math.PI) / 180);
    const distance = this.stepLength * count;
    const rad = (this.heading * Math.PI) / 180;
    this.lat += (Math.cos(rad) * distance) / metersPerDegLat;
    this.lng += (Math.sin(rad) * distance) / metersPerDegLng;
    this.traveled += distance;
    this.steps += count;
    return this.position();
  }

  position(): LatLng {
    return { lat: this.lat, lng: this.lng };
  }

  /** Reset to a real fix (called whenever the OS delivers a GPS position). */
  reset(origin: LatLng): void {
    this.lat = origin.lat;
    this.lng = origin.lng;
    this.traveled = 0;
  }

  /** Growing uncertainty: ~15 % of travelled distance, min 8 m. */
  get accuracy(): number {
    return Math.max(8, this.traveled * 0.15);
  }

  get stepsTaken(): number {
    return this.steps;
  }
}

/** Park timer state derived from the anchor. */
export function parkingStatus(anchor: Anchor, now = Date.now()) {
  const startedAt = anchor.parking?.startedAt ?? anchor.createdAt;
  const elapsed = Math.max(0, now - startedAt);
  const limitMs = anchor.parking?.limitMinutes ? anchor.parking.limitMinutes * 60000 : undefined;
  const remaining = limitMs === undefined ? undefined : limitMs - elapsed;
  return {
    elapsed,
    remaining,
    overdue: remaining !== undefined && remaining < 0,
    startedAt,
  };
}

/**
 * Welche Erinnerung ist inzwischen vorbei, ohne dass die App es mitbekommen hat?
 *
 * Der Zustand `fired` existierte im Typ, wurde aber nie gesetzt — eine
 * Behauptung ohne Deckung. Wird die App nach dem Ablauf geöffnet, holen wir das
 * hier ehrlich nach: die Erinnerung *ist* rausgegangen (das System hat sie
 * gestellt), also darf die App nicht weiter „geplant“ behaupten.
 */
export function reminderTransition(
  anchor: Anchor,
  now = Date.now(),
): { state: ParkingReminderState; notify: boolean } | null {
  const parking = anchor.parking;
  if (!parking || parking.reminderState !== 'scheduled' || !parking.remindAt) return null;
  // Zehn Minuten Karenz: kurz nach dem Termin nicht sofort als „verschickt“ werten,
  // damit ein Tipp auf die Benachrichtigung den Zustand nicht überholt.
  if (now < parking.remindAt + 10 * 60000) return null;
  return { state: 'fired', notify: false };
}

/** Clamp a coordinate pair to valid ranges, returning null if unusable. */
export function validLatLng(lat: unknown, lng: unknown): LatLng | null {
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

/** Merge imported anchors, de-duplicating by content hash, newest first. */
export function mergeImported(existing: readonly Anchor[], incoming: readonly Anchor[]): Anchor[] {
  const seen = new Set(existing.map((a) => `${a.lat.toFixed(5)}|${a.lng.toFixed(5)}|${a.createdAt}`));
  const additions = incoming.filter((a) => {
    const key = `${a.lat.toFixed(5)}|${a.lng.toFixed(5)}|${a.createdAt}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return [...additions, ...existing].sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Step-based dead reckoning for the case this app exists for: you walk into a
 * car park, GPS dies, and you still want a direction.
 *
 * Deliberately not a simulation: it only engages once a *real* fix is older than
 * `staleAfterMs`, it counts actual detected steps (0.7 m each), and it reports a
 * growing uncertainty. The UI must label the result as an estimate — pretending
 * to precision underground is exactly what the marketing promises not to do.
 */
export interface WalkerState {
  /** Estimated position while GPS is silent. */
  lat: number;
  lng: number;
  /** Metres walked since the last real fix. */
  traveled: number;
  steps: number;
  /** Estimated uncertainty of the current position, in metres. */
  accuracy: number;
  /** True while the estimate is in charge (fix stale). */
  estimating: boolean;
  /** Timestamp of the last real fix used. */
  basedOn: number;
}

const STEP_LENGTH_M = 0.72;

export function createWalker(fix: LatLng & { timestamp: number }): WalkerState {
  return {
    lat: fix.lat,
    lng: fix.lng,
    traveled: 0,
    steps: 0,
    accuracy: 8,
    estimating: false,
    basedOn: fix.timestamp,
  };
}

/**
 * Advance the estimate. `stepDelta` is the number of steps since the previous
 * call (can be 0), `heading` the current compass bearing.
 */
export function advanceWalker(
  state: WalkerState,
  heading: number | null,
  stepDelta: number,
  now: number,
  staleAfterMs = 8000,
): WalkerState {
  const estimating = now - state.basedOn > staleAfterMs;
  if (!estimating || !stepDelta || stepDelta <= 0) {
    return { ...state, estimating };
  }
  const meters = Math.min(stepDelta, 20) * STEP_LENGTH_M;
  const bearing = heading ?? 0;
  const rad = (normalizeDeg(bearing) * Math.PI) / 180;
  const metersPerDegLat = 111132.92;
  const metersPerDegLng = 111320 * Math.cos((state.lat * Math.PI) / 180);
  const lat = state.lat + (Math.cos(rad) * meters) / metersPerDegLat;
  const lng = state.lng + (Math.sin(rad) * meters) / Math.max(1e-6, metersPerDegLng);
  const traveled = state.traveled + meters;
  return {
    lat,
    lng,
    traveled,
    steps: state.steps + stepDelta,
    // 15 % of the walked distance plus the original fix uncertainty: honest,
    // and it grows visibly the longer the estimate runs.
    accuracy: Math.round(Math.max(8, traveled * 0.15 + 5)),
    estimating: true,
    basedOn: state.basedOn,
  };
}

/** Re-anchor the estimate whenever the OS delivers a real position again. */
export function rebaseWalker(fix: LatLng & { timestamp: number }, now = Date.now()): WalkerState {
  return { ...createWalker({ ...fix, timestamp: now }), estimating: false };
}
