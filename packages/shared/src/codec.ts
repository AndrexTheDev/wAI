/**
 * Compact, offline-safe share codes for anchors.
 *
 * Format:  WAIX1.<base64url(deflate-free JSON)>
 *
 * We deliberately avoid compression: bytes are decoded in the Android WebView,
 * short anchors (~200 bytes) fit comfortably in messenger messages, and no
 * dependency is needed. For photo-carrying "media packs" the app writes a JSON
 * file instead of a URL, so size is not an issue.
 */
import type { Anchor, AnchorCategory, SharePayload } from './types';
import { base64urlDecode, base64urlEncode } from './license';

export const SHARE_PREFIX = 'WAIX1';

const utf8 = (text: string) => new TextEncoder().encode(text);
const fromUtf8 = (bytes: Uint8Array) => new TextDecoder().decode(bytes);

export function encodeSharePayload(payload: SharePayload): string {
  return `${SHARE_PREFIX}.${base64urlEncode(utf8(JSON.stringify(payload)))}`;
}

export function decodeSharePayload(code: string): SharePayload | null {
  const trimmed = code.trim();
  if (!trimmed.startsWith(`${SHARE_PREFIX}.`)) return null;
  try {
    const json = fromUtf8(base64urlDecode(trimmed.slice(SHARE_PREFIX.length + 1)));
    const parsed = JSON.parse(json) as SharePayload;
    if (parsed.v !== 1 || !parsed.a) return null;
    return parsed;
  } catch {
    return null;
  }
}

const CATEGORIES: AnchorCategory[] = [
  'car',
  'tent',
  'meeting',
  'tool',
  'entrance',
  'nature',
  'other',
];

export interface SharedAnchorData {
  n?: string;
  cat?: AnchorCategory;
  lat: number;
  lng: number;
  alt?: number;
  t?: number;
  note?: string;
  zone?: string;
}

/**
 * Minimal shareable representation. Photos and voice notes are references only;
 * in Pro the app bundles them next to this code as a .waipack file.
 */
export function anchorToShare(anchor: Anchor, includeNote = true): SharePayload {
  return {
    v: 1,
    a: {
      n: anchor.name || undefined,
      cat: anchor.category,
      lat: Number(anchor.lat.toFixed(7)),
      lng: Number(anchor.lng.toFixed(7)),
      alt: typeof anchor.altitude === 'number' ? Math.round(anchor.altitude * 10) / 10 : undefined,
      t: anchor.createdAt,
      note: includeNote && anchor.note ? anchor.note : undefined,
      zone: includeNote && anchor.zone ? anchor.zone : undefined,
    },
  };
}

/** Validate and normalise an imported payload before it reaches the store. */
export function sanitizeImportedAnchor(data: SharedAnchorData): SharedAnchorData | null {
  if (!Number.isFinite(data.lat) || !Number.isFinite(data.lng)) return null;
  if (Math.abs(data.lat) > 90 || Math.abs(data.lng) > 180) return null;
  const category: AnchorCategory =
    data.cat && CATEGORIES.includes(data.cat) ? data.cat : 'other';
  return {
    n: typeof data.n === 'string' ? data.n.slice(0, 120) : undefined,
    cat: category,
    lat: data.lat,
    lng: data.lng,
    alt: Number.isFinite(data.alt ?? NaN) ? data.alt : undefined,
    t: Number.isFinite(data.t ?? NaN) ? data.t : undefined,
    note: typeof data.note === 'string' ? data.note.slice(0, 2000) : undefined,
    zone: typeof data.zone === 'string' ? data.zone.slice(0, 200) : undefined,
  };
}
