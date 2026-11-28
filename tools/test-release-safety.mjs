import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { loadEnv } from 'vite';
import { validateIssuer, validateIssuerPair, validateBuildOverride, validateSigning } from './release-safety.mjs';

// These are public values only; the sample is never used to sign anything.
const exposedPublicKey = 'ca4b28dddedf05fe9143c2981ee90be822e8d27eda9464ced8ec3772a1c48371';
const otherPublicKey = '01'.repeat(32);

test('compromised public key is rejected independent of hex case', () => {
  assert.throws(() => validateIssuer(exposedPublicKey), /compromised/);
  assert.throws(() => validateIssuer(exposedPublicKey.toUpperCase()), /compromised/);
  assert.doesNotThrow(() => validateIssuer(otherPublicKey));
  for (const value of ['', '0x' + otherPublicKey, 'zz'.repeat(32), null]) {
    assert.throws(() => validateIssuer(value), /32 bytes/);
  }
});

test('issuing requires a safe key matching the embedded public key', () => {
  assert.throws(() => validateIssuerPair(exposedPublicKey, exposedPublicKey), /compromised/);
  assert.throws(() => validateIssuerPair('02'.repeat(32), otherPublicKey), /does not match/);
  assert.doesNotThrow(() => validateIssuerPair(otherPublicKey.toUpperCase(), otherPublicKey));
});

test('only release signing permits publication', () => {
  for (const value of [undefined, '', 'preview', 'local', 'Release']) assert.throws(() => validateSigning(value));
  assert.doesNotThrow(() => validateSigning('release'));
});

test('Vite env files and process environment cannot override the reviewed issuer', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'wai-release-test-'));
  const previous = process.env.VITE_WAI_ISSUER_KEY;
  try {
    delete process.env.VITE_WAI_ISSUER_KEY;
    assert.doesNotThrow(() => validateBuildOverride(loadEnv('production', dir, 'VITE_WAI_ISSUER_KEY')));
    writeFileSync(path.join(dir, '.env.production.local'), `VITE_WAI_ISSUER_KEY=${otherPublicKey}\n`);
    assert.throws(() => validateBuildOverride(loadEnv('production', dir, 'VITE_WAI_ISSUER_KEY')), /must not override/);
    rmSync(path.join(dir, '.env.production.local'));
    process.env.VITE_WAI_ISSUER_KEY = '';
    assert.throws(() => validateBuildOverride(loadEnv('production', dir, 'VITE_WAI_ISSUER_KEY')), /must not override/);
  } finally {
    if (previous === undefined) delete process.env.VITE_WAI_ISSUER_KEY;
    else process.env.VITE_WAI_ISSUER_KEY = previous;
    rmSync(dir, { recursive: true, force: true });
  }
});

test('ci:android starts a non-publishing workflow', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'wai-fake-gh-'));
  try {
    const fake = path.join(dir, 'gh');
    const argsFile = path.join(dir, 'args');
    writeFileSync(fake, '#!/bin/sh\nprintf "%s\\n" "$@" > "$WAI_TEST_GH_ARGS"\n');
    chmodSync(fake, 0o755);
    const run = spawnSync(process.execPath, ['tools/wai.mjs', 'ci:android'], {
      env: { ...process.env, PATH: `${dir}${path.delimiter}${process.env.PATH}`, WAI_TEST_GH_ARGS: argsFile },
      encoding: 'utf8',
    });
    assert.equal(run.status, 0, run.stderr);
    const args = readFileSync(argsFile, 'utf8').trim().split('\n');
    assert.deepEqual(args.slice(0, 3), ['workflow', 'run', 'android.yml']);
    assert.ok(args.includes('release=false'));
    assert.ok(!args.includes('release=true'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('CLI blocks publication with the currently exposed issuer', () => {
  // Run the real gate only while the source still has the known compromised key;
  // after rotation the reusable validation tests above remain relevant.
  const source = execFileSync(process.execPath, ['--input-type=module', '-e', "import {ISSUER_PUBLIC_KEY} from './packages/shared/src/license-key.ts'; process.stdout.write(ISSUER_PUBLIC_KEY)"], { encoding: 'utf8' });
  if (source.toLowerCase() !== exposedPublicKey) return;
  const run = spawnSync(process.execPath, ['tools/check-release-safety.mjs', '--require-signing'], {
    env: { ...process.env, WAI_SIGNING_MODE: 'release' }, encoding: 'utf8',
  });
  assert.equal(run.status, 1);
  assert.match(run.stderr, /compromised/);
  const issue = spawnSync(process.execPath, ['tools/license-cli.mjs', 'issue'], { encoding: 'utf8' });
  assert.equal(issue.status, 1);
  assert.match(issue.stderr, /compromised/);
  assert.doesNotMatch(issue.stdout, /WAI1\./);
});
