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
import { LegalPage } from '../pages/LegalPage';
import { LocaleProvider } from '../lib/locale';
import { RouterProvider } from '../lib/router';
import { SharePreview } from '../pages/SharePreviewPage';
import { encodeSharePayload, loadLegalDocument } from '@wai/shared';

const routes = [
  '/',
  '/a/',
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

    // Legal documents are code-split, so the first render is a skeleton. Render
    // the real document explicitly to prove every chunk exists and renders in
    // both languages (this is what the skeleton is waiting for).
    const legalSlug = route.startsWith('/legal/') ? route.split('/')[2] : null;
    if (legalSlug) {
      const doc = await loadLegalDocument(legalSlug);
      if (!doc) {
        failures++;
        console.log(`✖ ${locale} ${route.padEnd(22)} legal document did not load`);
        continue;
      }
      const html = renderToString(
        createElement(LocaleProvider, null, createElement(RouterProvider, null, createElement(LegalPage, { doc }))),
      );
      const problems = [
        html.length < 4000 ? `suspiciously short (${html.length} chars)` : '',
        /\bundefined\b/.test(html) ? '"undefined" in markup' : '',
        !html.includes(doc[locale].title.replace(/&/g, '&amp;')) ? 'title missing' : '',
      ].filter(Boolean);
      if (problems.length) {
        failures++;
        console.log(`✖ ${locale} ${route.padEnd(22)} ${problems.join(' · ')}`);
      } else {
        console.log(`✔ ${locale} ${route.padEnd(22)} ${String(html.length).padStart(6)} chars · ${doc[locale].sections.length} sections`);
      }
      continue;
    }
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

// Shared-anchor preview (/a/#WAIX1.…) – three states, both languages.
{
  const code = encodeSharePayload({
    v: 1,
    a: { lat: 48.13715, lng: 11.57549, n: 'Tiefgarage Marienplatz', cat: 'car', alt: 519, note: 'Reihe C, rechts neben dem blauen Pfeiler', zone: 'B2' },
  } as never);
  for (const locale of locales) {
    const cases: Array<{ label: string; code: string | null; expect: string[] }> = [
      {
        label: 'valid',
        code,
        expect: ['Tiefgarage Marienplatz', locale === 'de' ? '48,13715' : '48.13715', 'wai://anchor/', 'intent://anchor/', 'B2'],
      },
      { label: 'broken', code: 'WAIX1.kaputt', expect: ['invalid'] },
      { label: 'empty', code: null, expect: ['noCode'] },
    ];
    for (const item of cases) {
      setTestPath('/a/', locale);
      const html = renderToString(
        createElement(LocaleProvider, null, createElement(RouterProvider, null, createElement(SharePreview, { code: item.code }))),
      );
      const missing = item.expect.filter((needle) => {
        if (needle === 'invalid') return !html.includes(locale === 'de' ? 'beschädigt' : 'damaged');
        if (needle === 'noCode') return !html.includes(locale === 'de' ? 'Kein Anker-Code' : 'No anchor code');
        return !html.includes(needle);
      });
      const problems = [
        ...missing.map((needle) => `missing "${needle}"`),
        /\bundefined\b/.test(html) ? '"undefined" in markup' : '',
        html.length < (item.label === 'valid' ? 1500 : 400) ? `suspiciously short (${html.length} chars)` : '',
        // The code must never appear in a form that a server could log.
        html.includes('?code=') ? 'code leaked into a query string' : '',
      ].filter(Boolean);
      if (problems.length) {
        failures++;
        console.log(`✖ ${locale} /a/ (${item.label}) ${problems.join(' · ')}`);
      } else {
        console.log(`✔ ${locale} /a/ (${item.label}) ${String(html.length).padStart(6)} chars`);
      }
    }
  }
}

if (failures) {
  console.log(`\n${failures} render check(s) failed.`);
  process.exit(1);
}
console.log('\nAll render checks passed.');
