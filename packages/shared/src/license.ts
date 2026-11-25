/**
 * wAI offline license system.
 *
 * Design goals
 * ------------
 * 1. Works with airplane mode on: no server is contacted when unlocking Pro.
 * 2. Non-custodial crypto: the buyer pays the developer wallet directly, sends the
 *    tx reference through the paywall, and receives a signed license token that the
 *    app verifies locally with an embedded Ed25519 public key.
 * 3. Cross-device friendly: the license token is short text/QR that can be pasted or
 *    scanned on a second device.
 *
 * Token format (v1):
 *   WAI1.<base64url(payloadJSON)>.<base64url(ed25519Signature)>
 *
 * The payload is canonicalised JSON with sorted keys so the signature is stable.
 */
import * as ed from '@noble/ed25519';
import { sha256, sha512 } from '@noble/hashes/sha2.js';
import { ISSUER_PUBLIC_KEY } from './license-key';

// Wire the synchronous hash implementations (needed for sign/verify in browsers
// and WebViews where WebCrypto Ed25519 is not available).
ed.hashes.sha512 = sha512;

/** Default issuer public key. Production builds must replace this with the key
 *  produced by `npm run license:keygen` (see docs/LICENSING.md). */
export const DEFAULT_ISSUER_PUBLIC_KEY = ISSUER_PUBLIC_KEY;

export interface LicensePayload {
  /** Product namespace, always "wai". */
  p: 'wai';
  /** Plan unlocked. Only "pro" is currently issued. */
  plan: 'pro' | 'pro-plus';
  /** License id, short random hex. */
  id: string;
  /** Issue time, unix seconds. */
  iat: number;
  /** Optional buyer label / tx reference for support. */
  sub?: string;
  /** Optional expiry (unix seconds). Lifetime licenses omit it. */
  exp?: number;
  /** Free-form channel: "crypto-sol" | "crypto-btc" | "crypto-eth" | "manual". */
  via?: string;
  /** Number of devices the token may be used on (informational, offline). */
  seats?: number;
}

export interface LicenseVerification {
  ok: boolean;
  reason?:
    | 'malformed'
    | 'bad-signature'
    | 'wrong-product'
    | 'expired'
    | 'not-pro'
    | 'unsupported-version';
  payload?: LicensePayload;
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

export function base64urlEncode(bytes: Uint8Array): string {
  let out = '';
  let i = 0;
  for (; i + 2 < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + B64[(n >> 6) & 63] + B64[n & 63];
  }
  if (i < bytes.length) {
    const rem = bytes.length - i;
    const n = (bytes[i] << 16) | (rem > 1 ? bytes[i + 1] << 8 : 0);
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63];
    if (rem > 1) out += B64[(n >> 6) & 63];
  }
  return out;
}

export function base64urlDecode(input: string): Uint8Array {
  const clean = input.replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  const lookup = new Int16Array(128).fill(-1);
  for (let i = 0; i < B64.length; i++) lookup[B64.charCodeAt(i)] = i;
  const out: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const ch of clean) {
    const code = ch.charCodeAt(0);
    const v = code < 128 ? lookup[code] : -1;
    if (v < 0) throw new Error('invalid base64url');
    buffer = (buffer << 6) | v;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out.push((buffer >> bits) & 0xff);
    }
  }
  return Uint8Array.from(out);
}

export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/^0x/, '');
  if (clean.length % 2 !== 0) throw new Error('odd hex length');
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return out;
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Deterministic JSON with sorted keys – the signed canonical form. */
export function canonicalJson(value: unknown): string {
  const walk = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === 'object') {
      const obj = v as Record<string, unknown>;
      const out: Record<string, unknown> = {};
      for (const key of Object.keys(obj).sort()) {
        if (obj[key] !== undefined) out[key] = walk(obj[key]);
      }
      return out;
    }
    return v;
  };
  return JSON.stringify(walk(value));
}

function utf8(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

/** Issue (sign) a license token. Only the vendor key holder calls this. */
export async function issueLicense(
  payload: LicensePayload,
  privateKey: Uint8Array | string,
): Promise<string> {
  const key = typeof privateKey === 'string' ? hexToBytes(privateKey) : privateKey;
  const body = base64urlEncode(utf8(canonicalJson(payload)));
  const signature = await ed.signAsync(utf8(body), key);
  return `WAI1.${body}.${base64urlEncode(signature)}`;
}

/** Verify a license token entirely offline. */
export async function verifyLicense(
  token: string,
  issuerPublicKey: string = DEFAULT_ISSUER_PUBLIC_KEY,
  now: number = Math.floor(Date.now() / 1000),
): Promise<LicenseVerification> {
  const trimmed = token.trim().replace(/\s+/g, '');
  const parts = trimmed.split('.');
  if (parts.length !== 3 || parts[0] !== 'WAI1') return { ok: false, reason: 'malformed' };
  const [, body, sigB64] = parts;
  let payload: LicensePayload;
  let signature: Uint8Array;
  let publicKey: Uint8Array;
  try {
    payload = JSON.parse(new TextDecoder().decode(base64urlDecode(body))) as LicensePayload;
    signature = base64urlDecode(sigB64);
    publicKey = hexToBytes(issuerPublicKey);
  } catch {
    return { ok: false, reason: 'malformed' };
  }
  if (canonicalJson(payload) !== new TextDecoder().decode(base64urlDecode(body))) {
    return { ok: false, reason: 'malformed' };
  }
  if (payload.p !== 'wai') return { ok: false, reason: 'wrong-product' };
  let valid = false;
  try {
    valid = await ed.verifyAsync(signature, utf8(body), publicKey);
  } catch {
    valid = false;
  }
  if (!valid) return { ok: false, reason: 'bad-signature' };
  if (typeof payload.exp === 'number' && payload.exp < now) {
    return { ok: false, reason: 'expired', payload };
  }
  if (payload.plan !== 'pro' && payload.plan !== 'pro-plus') {
    return { ok: false, reason: 'not-pro', payload };
  }
  return { ok: true, payload };
}

/** Short, human transcribable fingerprint of a license – used in support mails. */
export function licenseFingerprint(token: string): string {
  const digest = sha256(utf8(token.trim()));
  return bytesToHex(digest).slice(0, 12).toUpperCase().match(/.{1,4}/g)!.join('-');
}

/**
 * Random order reference the buyer attaches to the crypto transfer memo /
 * support mail. Uses crypto.getRandomValues (available in WebView + Node 19+).
 */
export function newOrderReference(prefix = 'WAI'): string {
  const bytes = new Uint8Array(5);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let out = '';
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return `${prefix}-${out.slice(0, 5)}`;
}

/** Network fee / confirmation guidance shown in the paywall. */
export const CRYPTO_FLOW_STEPS = [
  'choose-asset',
  'copy-address',
  'send-exact-amount',
  'copy-tx-reference',
  'submit-proof',
  'receive-license',
  'activate',
] as const;
