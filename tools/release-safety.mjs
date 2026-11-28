// Publication safeguards. The fingerprint is of the PUBLIC Ed25519 key whose
// private counterpart was exposed; no private material is stored here.
import { createHash } from 'node:crypto';

const REVOKED = new Set([
  '0967a679c626acabef0d154efd523405b047925f81cfcea97cde153d11ba1022',
]);

export function validateIssuer(key) {
  if (typeof key !== 'string' || !/^[0-9a-f]{64}$/i.test(key)) {
    throw new Error('The app issuer public key must be exactly 32 bytes in hexadecimal.');
  }
  const digest = createHash('sha256').update(Buffer.from(key, 'hex')).digest('hex');
  if (REVOKED.has(digest)) {
    throw new Error('The app issuer key is compromised. Rotate it on a trusted device before publication or issuing licences.');
  }
}

export function validateIssuerPair(publicKey, embeddedKey) {
  validateIssuer(embeddedKey);
  validateIssuer(publicKey);
  if (publicKey.toLowerCase() !== embeddedKey.toLowerCase()) {
    throw new Error('The issuer private key does not match the reviewed app public key.');
  }
}

export function validateBuildOverride(env) {
  // Publication builds must use the reviewed, version-controlled key. Vite's
  // env files and process environment can silently override it at build time.
  if (Object.hasOwn(env, 'VITE_WAI_ISSUER_KEY')) {
    throw new Error('Release builds must not override VITE_WAI_ISSUER_KEY; update the reviewed public key in source instead.');
  }
}

export function validateSigning(mode) {
  if (mode !== 'release') {
    throw new Error('Publication requires release signing; preview/unknown signing is not distributable.');
  }
}
