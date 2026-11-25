#!/usr/bin/env node
/**
 * wAI licence CLI – the vendor-side tool that signs Pro licences.
 *
 *   node tools/license-cli.mjs keygen
 *       Creates tools/keys/issuer.private.json + issuer.public.json and prints
 *       the public key that must be embedded in packages/shared/src/license.ts
 *       (DEFAULT_ISSUER_PUBLIC_KEY) and packages/app/.env (VITE_WAI_ISSUER_KEY).
 *
 *   node tools/license-cli.mjs issue --sub buyer@example.com --via crypto-sol --id WAI-XXXXX
 *       Prints a signed WAI1.… token plus a QR-ready data URL command.
 *
 *   node tools/license-cli.mjs verify WAI1.…
 *       Verifies a token against the issuer public key.
 *
 *   node tools/license-cli.mjs mail --sub buyer@example.com --tx 5xY...
 *       Drafts the licence delivery email (DE + EN) to the buyer.
 *
 * Keys are stored outside git (see .gitignore) – never commit the private key.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import process from 'node:process';
import * as ed from '@noble/ed25519';
import { sha512 } from '@noble/hashes/sha2.js';

ed.hashes.sha512 = sha512;

const ROOT = path.resolve(import.meta.dirname, '..');
const KEY_DIR = path.join(ROOT, 'tools', 'keys');
const PRIVATE_KEY_FILE = path.join(KEY_DIR, 'issuer.private.json');
const PUBLIC_KEY_FILE = path.join(KEY_DIR, 'issuer.public.json');

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const b64url = (bytes) => {
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
};
const b64urlDecode = (input) => {
  const clean = input.replace(/=+$/, '');
  const lookup = new Int16Array(128).fill(-1);
  for (let i = 0; i < B64.length; i++) lookup[B64.charCodeAt(i)] = i;
  const out = [];
  let buffer = 0;
  let bits = 0;
  for (const ch of clean) {
    const v = lookup[ch.charCodeAt(0)];
    if (v < 0) throw new Error('invalid base64url');
    buffer = (buffer << 6) | v;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out.push((buffer >> bits) & 0xff);
    }
  }
  return Uint8Array.from(out);
};
const hex = (bytes) => Buffer.from(bytes).toString('hex');
const unhex = (str) => Uint8Array.from(Buffer.from(str.replace(/^0x/, ''), 'hex'));
const utf8 = (text) => new TextEncoder().encode(text);

const canonicalJson = (value) => {
  const walk = (v) => {
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === 'object') {
      const out = {};
      for (const key of Object.keys(v).sort()) if (v[key] !== undefined) out[key] = walk(v[key]);
      return out;
    }
    return v;
  };
  return JSON.stringify(walk(value));
};

async function keygen() {
  await mkdir(KEY_DIR, { recursive: true });
  if (existsSync(PRIVATE_KEY_FILE) && !process.argv.includes('--force')) {
    console.error(`✖ Private key already exists at ${PRIVATE_KEY_FILE}. Use --force to overwrite.`);
    process.exit(1);
  }
  const secret = randomBytes(32);
  const publicKey = await ed.getPublicKeyAsync(secret);
  const record = {
    created: new Date().toISOString(),
    algorithm: 'ed25519',
    secretKeyHex: hex(secret),
    publicKeyHex: hex(publicKey),
    note: 'KEEP PRIVATE. Never commit. Back up offline. Used to sign wAI Pro licences.',
  };
  await writeFile(PRIVATE_KEY_FILE, JSON.stringify(record, null, 2), { mode: 0o600 });
  await writeFile(
    PUBLIC_KEY_FILE,
    JSON.stringify(
      { created: record.created, algorithm: 'ed25519', publicKeyHex: record.publicKeyHex },
      null,
      2,
    ),
  );
  console.log('✔ Ed25519 issuer key pair created\n');
  console.log(`  private: ${PRIVATE_KEY_FILE}   (chmod 600, git-ignored)`);
  console.log(`  public : ${PUBLIC_KEY_FILE}\n`);
  console.log('  Embed the public key in the apps:');
  console.log(`    packages/shared/src/license.ts  -> DEFAULT_ISSUER_PUBLIC_KEY`);
  console.log(`    packages/app/.env               -> VITE_WAI_ISSUER_KEY`);
  console.log(`    packages/landing/.env           -> VITE_WAI_ISSUER_KEY\n`);
  console.log(`  PUBLIC KEY: ${record.publicKeyHex}`);
  console.log('\n  Backup the private key offline now (e.g. encrypted USB + password manager).');
  console.log('  If you lose it you cannot issue new licences for existing installs.');
}

function parseFlags(argv) {
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    }
  }
  return flags;
}

async function loadPrivateKey() {
  if (!existsSync(PRIVATE_KEY_FILE)) {
    console.error('✖ No issuer key found. Run: node tools/license-cli.mjs keygen');
    process.exit(1);
  }
  const record = JSON.parse(await readFile(PRIVATE_KEY_FILE, 'utf8'));
  return unhex(record.secretKeyHex);
}

function makeId() {
  const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const bytes = randomBytes(5);
  let out = '';
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return `WAI-${out}`;
}

async function issue() {
  const flags = parseFlags(process.argv.slice(3));
  const privateKey = await loadPrivateKey();
  const payload = {
    p: 'wai',
    plan: flags.plan === 'plus' ? 'pro-plus' : 'pro',
    id: typeof flags.id === 'string' ? flags.id : makeId(),
    iat: Math.floor(Date.now() / 1000),
    sub: typeof flags.sub === 'string' ? flags.sub : undefined,
    via: typeof flags.via === 'string' ? flags.via : 'manual',
    seats: flags.seats ? Number(flags.seats) : 1,
    exp: flags.days ? Math.floor(Date.now() / 1000) + Number(flags.days) * 86400 : undefined,
  };
  const body = b64url(utf8(canonicalJson(payload)));
  const signature = await ed.signAsync(utf8(body), privateKey);
  const token = `WAI1.${body}.${b64url(signature)}`;
  console.log(`\nLicence: ${payload.id}`);
  console.log(`Plan   : ${payload.plan}${payload.exp ? ` (expires ${new Date(payload.exp * 1000).toISOString()})` : ' (lifetime)'}`);
  console.log(`Buyer  : ${payload.sub ?? '–'}`);
  console.log(`Via    : ${payload.via}\n`);
  console.log(token);
  console.log('\nQR (terminal):');
  try {
    const QRCode = (await import('qrcode')).default;
    console.log(await QRCode.toString(token, { type: 'terminal', small: true }));
  } catch {
    console.log('  (install qrcode to render the token as a terminal QR code)');
  }
  const outFile = path.join(ROOT, 'tools', 'keys', `license-${payload.id}.txt`);
  await writeFile(outFile, `${token}\n`, { mode: 0o600 });
  console.log(`Saved to ${outFile}`);
}

async function verify() {
  const token = process.argv[3];
  if (!token) {
    console.error('Usage: node tools/license-cli.mjs verify WAI1.…');
    process.exit(1);
  }
  const record = JSON.parse(await readFile(PUBLIC_KEY_FILE, 'utf8').catch(() => '{}'));
  const publicKey = process.env.WAI_ISSUER_KEY || record.publicKeyHex;
  if (!publicKey) {
    const fallback = await readFile(path.join(ROOT, 'packages/shared/src/license.ts'), 'utf8');
    const match = fallback.match(/DEFAULT_ISSUER_PUBLIC_KEY\s*=\s*\n?\s*'([0-9a-fA-F]+)'/);
    if (!match) {
      console.error('✖ No public key available.');
      process.exit(1);
    }
    return verifyWith(token, match[1]);
  }
  return verifyWith(token, publicKey);
}

async function verifyWith(token, publicKeyHex) {
  const parts = token.trim().split('.');
  if (parts.length !== 3 || parts[0] !== 'WAI1') {
    console.error('✖ Malformed token.');
    process.exit(2);
  }
  const [, body, sig] = parts;
  const ok = await ed.verifyAsync(b64urlDecode(sig), utf8(body), unhex(publicKeyHex));
  const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(body)));
  if (!ok) {
    console.error('✖ Signature invalid.');
    process.exit(2);
  }
  console.log('✔ Signature valid');
  console.log(payload);
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    console.error('✖ Licence expired.');
    process.exit(3);
  }
}

async function mail() {
  const flags = parseFlags(process.argv.slice(3));
  const sub = typeof flags.sub === 'string' ? flags.sub : 'kunde@example.com';
  const tx = typeof flags.tx === 'string' ? flags.tx : '(TXID)';
  const id = typeof flags.id === 'string' ? flags.id : '(LIZENZ-ID)';
  const text = `Hallo,

vielen Dank für deine Unterstützung und deinen Kauf von wAI Pro.

Bestellreferenz: ${id}
Transaktion: ${tx}

Dein Lizenzschlüssel (bitte vollständig kopieren):

(LIZENZSCHLÜSSEL HIER EINFÜGEN – mit "node tools/license-cli.mjs issue --sub ${sub} --via crypto" erzeugen)

So aktivierst du Pro:
1. Öffne wAI auf deinem Android-Gerät.
2. Tippe auf "Pro" und dann auf "Lizenz aktivieren".
3. Füge den Schlüssel ein oder scanne den QR-Code aus der zweiten E-Mail.
4. Die Prüfung läuft komplett offline – danach ist Pro dauerhaft aktiv.

Bei Fragen antworte einfach auf diese E-Mail.

Viele Grüße
AndrexTheDev
hippie.highho@gmail.com

--- English version ---

Hello,

thank you for supporting the project and for purchasing wAI Pro.

Order reference: ${id}
Transaction: ${tx}

Your licence key (please copy it completely):

(INSERT LICENCE KEY HERE – generate with "node tools/license-cli.mjs issue --sub ${sub} --via crypto")

How to activate Pro:
1. Open wAI on your Android device.
2. Tap "Pro" and then "Activate licence".
3. Paste the key or scan the QR code from the second email.
4. Verification runs fully offline – Pro is then permanently active.

Just reply to this email if you have any questions.

Best regards
AndrexTheDev
hippie.highho@gmail.com
`;
  const outFile = path.join(ROOT, 'tools', 'keys', `mail-${sub.replace(/[^a-z0-9]/gi, '_')}.txt`);
  await mkdir(path.dirname(outFile), { recursive: true });
  await writeFile(outFile, text);
  console.log(text);
  console.log(`\nSaved to ${outFile}`);
}

const command = process.argv[2];
const commands = { keygen, issue, verify, mail };
if (!commands[command]) {
  console.log(`wAI licence CLI

  keygen                    create a new Ed25519 issuer key pair
  issue [--sub email] [--via crypto-sol] [--id WAI-XXXXX] [--days 365]
                            sign a new Pro licence token
  verify WAI1.…             verify a licence token offline
  mail --sub email --tx ID  draft the bilingual delivery email
`);
  process.exit(command ? 1 : 0);
}
await commands[command]();
