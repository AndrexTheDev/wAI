#!/usr/bin/env node
// Run before tagging or building a GitHub release, never for ordinary previews.
// This checks known technical risks, not legal approval or certificate identity.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';
import { ISSUER_PUBLIC_KEY } from '../packages/shared/src/license-key.ts';
import { validateIssuer, validateBuildOverride, validateSigning } from './release-safety.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
if (args.some((arg) => arg !== '--require-signing')) {
  console.error('Usage: node tools/check-release-safety.mjs [--require-signing]');
  process.exit(2);
}
try {
  validateIssuer(ISSUER_PUBLIC_KEY);
  // Same mode and envDir as npm run cap:sync -> Vite production app build.
  // Never print a parser error that might include contents of an env file.
  let viteEnv;
  try {
    viteEnv = loadEnv('production', path.join(root, 'packages/app'), 'VITE_WAI_ISSUER_KEY');
  } catch {
    throw new Error('Could not read app build environment; inspect it privately.');
  }
  validateBuildOverride(viteEnv);
  if (args.includes('--require-signing')) validateSigning(process.env.WAI_SIGNING_MODE);
  console.log('✔ Known compromised issuer and release configuration checks passed.');
  console.log('  Certificate identity, legal approval and device tests still require manual verification.');
} catch (error) {
  console.error(`✖ Release blocked: ${error.message}`);
  console.error('  See docs/LAUNCH_CHECKLIST.md. No secret values were printed.');
  process.exitCode = 1;
}
