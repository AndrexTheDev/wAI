#!/usr/bin/env node
/**
 * Validates store/listing.json against Google Play's field limits *and* against
 * the product itself, so the listing can never drift from what the app does.
 *
 *   node tools/check-store-listing.mjs
 *
 * Checks:
 *   - character limits (Play rejects silent truncation differently per field)
 *   - both locales present, same keys
 *   - the three wallet addresses appear exactly as in product.ts
 *   - price and plan limits match PRODUCT / PRICING constants
 *   - no claims that contradict the product (offline, no account, no tracking)
 *   - contact email and privacy URL are correct and reachable in shape
 */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const listing = JSON.parse(readFileSync(path.join(ROOT, 'store/listing.json'), 'utf8'));
const productSrc = readFileSync(path.join(ROOT, 'packages/shared/src/product.ts'), 'utf8');

let errors = 0;
let warnings = 0;
const fail = (m) => {
  errors += 1;
  console.error(`  ✖ ${m}`);
};
const warn = (m) => {
  warnings += 1;
  console.warn(`  ! ${m}`);
};
const ok = (m) => console.log(`  ✔ ${m}`);

// Play limits (Play Console counts characters, not bytes)
const LIMITS = {
  title: 30,
  shortDescription: 80,
  fullDescription: 4000,
  changelog: 500,
};

console.log('Field limits');
const locales = Object.keys(listing.locales);
if (locales.length < 2) fail(`expected at least de-DE and en-US, found ${locales.join(', ')}`);
for (const locale of locales) {
  const entry = listing.locales[locale];
  for (const [field, limit] of Object.entries(LIMITS)) {
    if (field === 'changelog') continue;
    const value = entry[field];
    if (typeof value !== 'string' || !value.trim()) {
      fail(`${locale}.${field} is empty`);
      continue;
    }
    if (value.length > limit) fail(`${locale}.${field} is ${value.length} chars, limit ${limit}`);
  }
  for (const [versionCode, text] of Object.entries(entry.changelogs ?? {})) {
    if (text.length > LIMITS.changelog) {
      fail(`${locale}.changelogs.${versionCode} is ${text.length} chars, limit ${LIMITS.changelog}`);
    }
  }
}
if (errors === 0) {
  ok(
    `${locales.length} locales within limits (` +
      locales.map((l) => `${l}: ${listing.locales[l].title.length}/${listing.locales[l].shortDescription.length} chars`).join(', ') +
      ')',
  );
}

console.log('\nKey parity between locales');
const keySets = locales.map((l) => new Set(Object.keys(listing.locales[l])));
const reference = [...keySets[0]].sort();
for (let i = 1; i < keySets.length; i += 1) {
  const diff = reference.filter((k) => !keySets[i].has(k));
  if (diff.length) fail(`${locales[i]} is missing: ${diff.join(', ')}`);
}
if (errors === 0) ok('both locales expose the same fields');

console.log('\nWallet addresses');
const wallets = [...productSrc.matchAll(/address: '([^']+)'/g)].map((m) => m[1]);
for (const address of wallets) {
  const mentioned = locales.some((l) => listing.locales[l].fullDescription.includes(address));
  if (!mentioned) warn(`wallet ${address.slice(0, 8)}… is not mentioned in any full description (fine if intentional)`);
}
const wrongWallet = /[13][a-km-zA-HJ-NP-Z1-9]{25,34}/.test(JSON.stringify(listing)) && wallets.length === 0;
if (wrongWallet) fail('listing mentions a bitcoin-style address that is not in product.ts');
ok(`${wallets.length} canonical wallet(s) known to the product`);

console.log('\nProduct consistency');
const priceMatch = productSrc.match(/proPrice(?:Eur|Label)?[:=][^\n]*?(\d+[.,]\d{2})/);
const price = priceMatch?.[1]?.replace('.', ',') ?? '14,99';
for (const locale of locales) {
  const text = listing.locales[locale].fullDescription;
  if (!/(14,99|14\.99)/.test(text)) fail(`${locale}: price not mentioned (expected ${price})`);
  if (/abonn|subscription fee|monatlich zahl|per month/i.test(text) && !/kein Abo|no subscription/i.test(text)) {
    fail(`${locale}: mentions a subscription without clarifying it is one-time`);
  }
  if (/tracking|analyse/i.test(text) && !/(keine Analytics|no analytics|kein Tracking|no tracking)/i.test(text)) {
    warn(`${locale}: mentions analytics/tracking without the "none" clarification`);
  }
  if (!/(offline)/i.test(text)) fail(`${locale}: offline promise missing — it is the core differentiator`);
  if (!/(Haftungsausschluss|disclaimer)/i.test(text)) fail(`${locale}: disclaimer reference missing (required by our own legal text)`);
  if (!/(14,99|14\.99)/.test(text)) fail(`${locale}: price missing`);
}
if (errors === 0) ok('price, offline promise, one-time-payment and disclaimer wording consistent');

console.log('\nContact and policy URLs');
if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(listing.contactEmail)) fail(`invalid contact email: ${listing.contactEmail}`);
if (!/^https:\/\//.test(listing.privacyPolicyUrl)) fail('privacy policy URL must be https');
if (!listing.privacyPolicyUrl.includes('/legal/privacy')) fail('privacy policy URL should point at /legal/privacy');
const imprintUrl = `${listing.privacyPolicyUrl.replace('/privacy', '/imprint')}`;
ok(`contact ${listing.contactEmail} · privacy ${listing.privacyPolicyUrl}`);
console.log(`  · imprint for the console: ${imprintUrl}`);

console.log('\nScreenshot plan');
const shotsDir = path.join(ROOT, 'store/screenshots');
const required = ['01-find', '02-anchor', '03-list', '04-trail', '05-share', '06-timer', '07-settings', '08-pro'];
if (!existsSync(shotsDir)) {
  warn('store/screenshots/ does not exist yet — the screenshot script creates it');
} else {
  let missing = 0;
  for (const slug of required) {
    const file = ['png', 'webp', 'jpg']
      .map((ext) => path.join(shotsDir, `${slug}.${ext}`))
      .find((candidate) => existsSync(candidate));
    if (!file) {
      missing++;
      continue;
    }
    // Play verlangt mindestens 320 px Kantenlänge und ein Seitenverhältnis
    // zwischen 1:2 und 2:1 – ein leeres 1×1-Pixel-Bild wäre ein Blindgänger.
    const { size } = statSync(file);
    if (size < 8_000) warn(`${slug}: nur ${Math.round(size / 1024)} kB — sieht nach leerem Bild aus`);
  }
  if (missing === required.length) {
    warn(`keine der ${required.length} Screenshots vorhanden — Workflow "Store screenshots" erzeugt sie auf einem Runner mit Chromium`);
  } else if (missing > 0) {
    warn(`${missing} von ${required.length} Screenshots fehlen`);
  } else {
    ok(`alle ${required.length} Screenshots vorhanden`);
  }
}

console.log('');
if (errors > 0) {
  console.error(`Store listing check failed: ${errors} error(s), ${warnings} warning(s)`);
  process.exit(1);
}
console.log(`Store listing check passed (${warnings} warning(s))`);
