/**
 * Render smoke test (no browser needed).
 *
 * Builds the whole landing page to static HTML for every route and both
 * languages, and fails when a translation key is missing or `undefined` leaks
 * into the markup. Run with `npm run smoke:render -w @wai/landing`.
 */
import { setTestPath } from './testEnv'; // must come first: installs browser shims
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { App } from '../App';

const routes = [
  '/',
  '/legal/terms',
  '/legal/privacy',
  '/legal/disclaimer',
  '/legal/imprint',
  '/legal/crypto-guide',
  '/legal/withdrawal',
  '/does-not-exist',
];

const locales = ['de', 'en'] as const;

let failures = 0;

for (const locale of locales) {
  for (const route of routes) {
    setTestPath(route, locale);
    const warnings: string[] = [];
    const originalWarn = console.warn;
    const originalError = console.error;
    console.warn = (...args: unknown[]) => warnings.push(args.join(' '));
    console.error = (...args: unknown[]) => warnings.push(args.join(' '));

    let html = '';
    try {
      html = renderToString(createElement(App));
    } catch (error) {
      console.warn = originalWarn;
      console.error = originalError;
      failures++;
      console.log(`✖ ${locale} ${route} threw: ${(error as Error).message}`);
      continue;
    } finally {
      console.warn = originalWarn;
      console.error = originalError;
    }

    const missing = [...html.matchAll(/\[i18n\] missing key: ([\w.]+)/g)].map((m) => m[1]);
    const undefinedCount = (html.match(/\bundefined\b/g) ?? []).length;
    const emptyLinks = (html.match(/href="undefined"/g) ?? []).length;
    const problems = [
      missing.length ? `missing i18n keys: ${[...new Set(missing)].join(', ')}` : '',
      undefinedCount ? `"undefined" in markup (${undefinedCount})` : '',
      emptyLinks ? 'undefined href' : '',
      warnings.length ? `warnings: ${warnings.slice(0, 2).join(' | ')}` : '',
    ].filter(Boolean);

    if (problems.length) {
      failures++;
      console.log(`✖ ${locale} ${route.padEnd(22)} ${problems.join(' · ')}`);
    } else {
      console.log(`✔ ${locale} ${route.padEnd(22)} ${String(html.length).padStart(6)} chars`);
    }
  }
}

if (failures) {
  console.log(`\n${failures} render check(s) failed.`);
  process.exit(1);
}
console.log('\nAll render checks passed.');
