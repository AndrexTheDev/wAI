/**
 * End-to-end licence tests: sign with a generated key, verify with the matching
 * public key, and prove that tampering or a foreign key is rejected.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as ed from '@noble/ed25519';
import { sha512 } from '@noble/hashes/sha2.js';
import {
  base64urlDecode,
  base64urlEncode,
  canonicalJson,
  hexToBytes,
  bytesToHex,
  issueLicense,
  verifyLicense,
  type LicensePayload,
} from '../license.ts';
import { ISSUER_PUBLIC_KEY as DEFAULT_ISSUER_PUBLIC_KEY } from '../license-key.ts';

ed.hashes.sha512 = sha512;

const utf8 = (text: string) => new TextEncoder().encode(text);

async function keypair() {
  const secret = ed.utils.randomSecretKey();
  const publicKey = await ed.getPublicKeyAsync(secret);
  return { secret, publicKey: bytesToHex(publicKey) };
}

const payload: LicensePayload = {
  p: 'wai',
  plan: 'pro',
  id: 'WAI-TEST1',
  iat: 1_700_000_000,
  via: 'crypto-sol',
  sub: 'buyer@example.com',
  seats: 1,
};

test('a freshly signed licence verifies', async () => {
  const { secret, publicKey } = await keypair();
  const token = await issueLicense(payload, secret);
  const result = await verifyLicense(token, publicKey, 1_700_000_100);
  assert.equal(result.ok, true);
  assert.equal(result.payload?.id, 'WAI-TEST1');
  assert.equal(result.payload?.plan, 'pro');
});

test('a licence fails under a different public key', async () => {
  const signer = await keypair();
  const stranger = await keypair();
  const token = await issueLicense(payload, signer.secret);
  const result = await verifyLicense(token, stranger.publicKey);
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'bad-signature');
});

test('tampering with the payload invalidates the signature', async () => {
  const { secret, publicKey } = await keypair();
  const token = await issueLicense(payload, secret);
  const [, body, sig] = token.split('.');
  const decoded = JSON.parse(new TextDecoder().decode(base64urlDecode(body))) as LicensePayload;
  const forged = base64urlEncode(utf8(canonicalJson({ ...decoded, seats: 999 })));
  const result = await verifyLicense(`WAI1.${forged}.${sig}`, publicKey);
  assert.equal(result.ok, false);
});

test('expired licences are rejected but still parse', async () => {
  const { secret, publicKey } = await keypair();
  const token = await issueLicense({ ...payload, exp: 1_700_000_050 }, secret);
  const result = await verifyLicense(token, publicKey, 1_800_000_000);
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'expired');
  assert.equal(result.payload?.id, 'WAI-TEST1');
});

test('tokens for other products are rejected', async () => {
  const { secret, publicKey } = await keypair();
  const token = await issueLicense({ ...payload, p: 'other' as 'wai' }, secret);
  const result = await verifyLicense(token, publicKey);
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'wrong-product');
});

test('garbage input never throws', async () => {
  for (const input of ['', 'WAI1', 'WAI1.', 'WAI1..', 'v2.abc.def', 'WAI1.!!!.???']) {
    const result = await verifyLicense(input, DEFAULT_ISSUER_PUBLIC_KEY);
    assert.equal(result.ok, false, `input ${JSON.stringify(input)} must be rejected`);
  }
});

test('the shipped issuer key is a valid 32-byte Ed25519 key', () => {
  assert.match(DEFAULT_ISSUER_PUBLIC_KEY, /^[0-9a-f]{64}$/);
  assert.equal(hexToBytes(DEFAULT_ISSUER_PUBLIC_KEY).length, 32);
});

test('whitespace and line breaks in pasted keys are tolerated', async () => {
  const { secret, publicKey } = await keypair();
  const token = await issueLicense(payload, secret);
  const messy = `  ${token.slice(0, 30)}\n${token.slice(30)}  `;
  const result = await verifyLicense(messy, publicKey);
  assert.equal(result.ok, true);
});
