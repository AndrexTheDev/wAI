import { decodeSharePayload, extractShareCode, sanitizeImportedAnchor, type Anchor } from '@wai/shared';

/**
 * Turns a share code — bare, pasted inside a sentence, or embedded in a link —
 * into an anchor ready to be stored. Shared by the import field in the share
 * sheet and by the deep-link intake, so both paths sanitise identically.
 *
 * Returns null for anything that is not a valid code; the coordinates of the
 * payload are validated by sanitizeImportedAnchor (range checks, finite numbers).
 */
export function anchorFromShareCode(input: string): Anchor | null {
  const code = extractShareCode(input);
  if (!code) return null;

  const payload = decodeSharePayload(code);
  if (!payload) return null;

  const data = sanitizeImportedAnchor(payload.a);
  if (!data) return null;

  const now = Date.now();
  return {
    id: `a_${now.toString(16)}${Math.random().toString(16).slice(2, 6)}`,
    name: data.n ?? '',
    category: data.cat ?? 'other',
    lat: data.lat,
    lng: data.lng,
    altitude: data.alt,
    source: 'import',
    createdAt: data.t ?? now,
    updatedAt: now,
    note: data.note,
    zone: data.zone,
    photos: [],
    voices: [],
    favorite: false,
    archived: false,
    trail: [],
  };
}
