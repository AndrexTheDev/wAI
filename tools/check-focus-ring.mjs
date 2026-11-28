#!/usr/bin/env node
/**
 * Keyboard focus regression check, not a full WCAG audit.
 * Builds a deterministic local fixture and walks Home, Editor and Pro with Tab.
 * Requires visible 2px outlines and checks their computed colour against a
 * composited ancestor background. Does not measure painted pixels, clipping,
 * gradients or occlusion; inspect those manually on actual devices as well.
 *
 * node tools/check-focus-ring.mjs [--url http://127.0.0.1:5174]
 *   [--theme dark|light|night] [--out docs/FOCUS_RINGS.md]
 *   [--css path/to/test-override.css]
 */
import { chromium } from 'playwright';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
function arg(name, fallback) {
  const index = args.indexOf(`--${name}`);
  if (index === -1) return fallback;
  if (!args[index + 1] || args[index + 1].startsWith('--')) throw new Error(`--${name} requires a value`);
  return args[index + 1];
}
const url = arg('url', 'http://127.0.0.1:5174');
const requestedTheme = arg('theme', null);
const themes = requestedTheme ? [requestedTheme] : ['dark', 'light', 'night'];
if (themes.some((t) => !['dark', 'light', 'night'].includes(t))) throw new Error('Unknown theme');
const outFile = arg('out', null);
const css = arg('css', null);
const override = css ? readFileSync(css, 'utf8') : null;
const executablePath = arg('chromium', process.env.WAI_CHROMIUM || undefined);
const MIN = 3;

// This function runs inside the browser. Colour calculations are a model of
// ancestor background-color layers, not a measurement of actual painted pixels.
function measure() {
  const el = document.activeElement;
  if (!el || el === document.body || el === document.documentElement) return null;
  window.__focusIds ??= new WeakMap();
  window.__focusNextId ??= 0;
  if (!window.__focusIds.has(el)) window.__focusIds.set(el, ++window.__focusNextId);
  const focused = getComputedStyle(el);
  // Search is the only component whose focus-within ring intentionally belongs
  // to the parent. Do not let an unrelated ancestor ring hide a missing ring.
  const parent = el.matches('.search input') ? el.closest('.search') : null;
  const ringNode = parent && parseFloat(focused.outlineWidth) < 1 ? parent : el;
  const cs = getComputedStyle(ringNode);
  const parse = (value) => {
    const match = value.match(/^rgba?\(([^)]+)\)$/i);
    if (!match) return null;
    const v = match[1].split(/[,\s/]+/).filter(Boolean).map(Number);
    return v.length >= 3 && v.every(Number.isFinite) ? { rgb: v.slice(0, 3), alpha: v[3] ?? 1 } : null;
  };
  const over = (top, bottom) => top.rgb.map((c, i) => c * top.alpha + bottom[i] * (1 - top.alpha));
  const lum = (rgb) => rgb.map((v) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }).reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
  const ratio = (a, b) => {
    const [high, low] = [lum(a), lum(b)].sort((x, y) => y - x);
    return (high + 0.05) / (low + 0.05);
  };
  const background = (node) => {
    const stack = [];
    for (let n = node; n; n = n.parentElement) {
      const color = parse(getComputedStyle(n).backgroundColor);
      if (color && color.alpha > 0) stack.push(color);
      if (color && color.alpha >= 1) break;
    }
    return stack.reverse().reduce((base, layer) => over(layer, base), [255, 255, 255]);
  };
  const width = parseFloat(cs.outlineWidth) || 0;
  const style = cs.outlineStyle;
  const color = parse(cs.outlineColor);
  const offset = parseFloat(cs.outlineOffset) || 0;
  const bg = background(offset < 0 ? ringNode : ringNode.parentElement);
  const contrast = width > 0 && style !== 'none' && style !== 'hidden' && color && color.alpha > 0
    ? ratio(over(color, bg), bg) : 0;
  const eligible = el.matches(':focus-visible') || (parent === ringNode && parent.matches(':focus-within'));
  const reason = !eligible ? 'kein Tastaturfokus' : width < 2 ? 'Ring schmaler als 2px' :
    !['solid', 'dashed', 'dotted', 'double'].includes(style) ? 'kein sichtbarer outline-Stil' :
    contrast < 3 ? 'Kontrast unter 3:1' : '';
  return {
    id: window.__focusIds.get(el), tag: el.tagName.toLowerCase(),
    cls: typeof el.className === 'string' ? el.className.trim() : '',
    label: (el.getAttribute('aria-label') || el.getAttribute('placeholder') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60),
    width, style, contrast, reason,
    inSheet: !!el.closest('.sheet'),
    isSearch: el.matches('.search input'),
    isCategory: el.matches('.category-btn'),
    isField: el.matches('.field__input'),
    isTextarea: el.matches('.field__textarea'),
    isConsent: el.matches('.consent-card__box'),
    isChip: el.matches('.chip:not(.is-active)'),
  };
}

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'], ...(executablePath ? { executablePath } : {}) });
const report = [];
const setupErrors = [];
try {
  for (const theme of themes) {
    const context = await browser.newContext({ viewport: { width: 412, height: 900 }, locale: 'de-DE', isMobile: false, hasTouch: false });
    try {
      const page = await context.newPage();
      await page.goto(url, { waitUntil: 'networkidle', timeout: 60_000 });
      await page.evaluate((t) => {
        localStorage.clear();
        localStorage.setItem('wai.v1.settings', JSON.stringify({ locale: 'de', theme: t, proximity: false, units: 'metric', onboardingDone: true }));
        const now = Date.now();
        localStorage.setItem('wai.v1.anchors', JSON.stringify([{
          id: 'focus-fixture', name: 'Fokus-Testauto', category: 'car', lat: 48.1362, lng: 11.5832,
          altitude: 411, floorLabel: '', createdAt: now, updatedAt: now,
          photos: [], voices: [], trail: [], favorite: false, archived: false,
        }]));
      }, theme);
      await page.reload({ waitUntil: 'networkidle' });
      if (override) await page.addStyleTag({ content: override });
      await page.locator('.anchor-card__tap').waitFor({ state: 'visible', timeout: 10_000 });
      if (await page.locator('html').getAttribute('data-theme') !== theme) throw new Error(`theme ${theme} not applied`);

      async function walk(view, scope, required) {
        const rows = [];
        const seen = new Set();
        let cycled = false;
        // Browser chrome may briefly take focus when Tab wraps; keep going.
        for (let i = 0; i < 120; i++) {
          await page.keyboard.press('Tab');
          // Measure after keyboard focus has settled, including component transitions.
          await page.waitForTimeout(160);
          const row = await page.evaluate(measure);
          if (!row) continue;
          if (scope === 'sheet' && !row.inSheet) throw new Error(`${view}: focus escaped the dialog`);
          if (seen.has(row.id)) { cycled = true; break; }
          seen.add(row.id);
          rows.push(row);
          // Typing changes the editor state and rerenders the sheet. Focus must
          // remain on the field, not jump back to the start of the dialog.
          if (view === 'Editor' && row.isField && !rows.slice(0, -1).some((r) => r.isField)) {
            await page.keyboard.type('x');
            await page.waitForTimeout(160);
            const afterTyping = await page.evaluate(measure);
            if (!afterTyping || afterTyping.id !== row.id) throw new Error(`${view}: focus moved after editing a field`);
          }
        }
        if (!cycled) throw new Error(`${view}: keyboard cycle not completed after 120 tabs`);
        if (process.env.WAI_FOCUS_DEBUG) console.log(view, rows.map(r => r.cls || r.tag));
        for (const key of required) if (!rows.some((r) => r[key])) throw new Error(`${view}: required focus target ${key} was not reached`);
        report.push({ theme, view, rows });
      }

      await walk('Start', 'page', ['isSearch', 'isChip']);
      await page.locator('.anchor-card__tap').first().click();
      await page.locator('.sheet .field__textarea').waitFor({ state: 'visible', timeout: 10_000 });
      await walk('Editor', 'sheet', ['isField', 'isTextarea', 'isCategory', 'isChip']);
      await page.keyboard.press('Escape');
      await page.locator('.sheet').waitFor({ state: 'hidden', timeout: 10_000 });
      // Escape must use the latest close callback, including the changed draft.
      const savedLabel = await page.locator('.anchor-card__tap').first().getAttribute('aria-label');
      if (!savedLabel?.includes('x')) throw new Error('Editor: Escape did not save the edited draft');
      await page.locator('.topbar__actions button').nth(1).click();
      await page.locator('.sheet .consent-card__box').waitFor({ state: 'visible', timeout: 10_000 });
      await walk('Pro', 'sheet', ['isConsent']);
    } catch (error) {
      setupErrors.push(`${theme}: ${error.message}`);
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}

const findings = report.flatMap(({ theme, view, rows }) => rows.filter((r) => r.reason).map((r) => ({ theme, view, ...r })));
const lines = [
  '# Fokusringe', '',
  'Automatisierte Stichprobe bei 412 × 900 CSS-px: Startseite mit Testanker, Editor und Pro-Sheet.',
  `Themes: ${themes.join(', ')}. Ziel: CSS-Outline von mindestens 2 px und berechneter Kontrast ≥ ${MIN}:1.`, '',
  'Die Stationen werden per Tab erreicht; der Test fordert ausdrücklich Suchfeld, Chip,',
  'Editor-Feld, Textfeld, Kategorie und Einwilligungs-Checkbox. Wenn eine Ansicht oder',
  'ein Pflichtziel fehlt, schlägt der Lauf fehl.', '',
  'Grenzen: Die Berechnung verwendet CSS-Outline und übereinandergelegte Hintergrundfarben',
  'der Vorfahren; sie misst keine Pixel, Verläufe, Überlagerung oder abgeschnittene Ringe.',
  'Sie ist kein vollständiger WCAG-Nachweis. Visuelle und Geräteprüfung bleiben nötig.', '',
  '| Theme | Ansicht | Tab-Stationen | Befunde |', '|---|---|---:|---:|',
];
for (const { theme, view, rows } of report) lines.push(`| ${theme} | ${view} | ${rows.length} | ${rows.filter((r) => r.reason).length} |`);
if (findings.length) {
  lines.push('', '## Befunde', '', '| Theme | Ansicht | Element | Grund | Verhältnis |', '|---|---|---|---|---:|');
  for (const r of findings) lines.push(`| ${r.theme} | ${r.view} | \`${(r.cls || r.tag).replaceAll('|', '\\|')}\` | ${r.reason} | ${r.contrast.toFixed(2)}:1 |`);
}
if (setupErrors.length) lines.push('', '## Fehlende Abdeckung', '', ...setupErrors.map((e) => `- ${e}`));
const markdown = `${lines.join('\n')}\n`;
if (outFile) { mkdirSync(path.dirname(path.resolve(outFile)), { recursive: true }); writeFileSync(outFile, markdown); }
console.log(markdown);
for (const r of findings) console.error(`✖ ${r.theme}/${r.view}: ${r.cls || r.tag} — ${r.reason} (${r.contrast.toFixed(2)}:1)`);
if (setupErrors.length || findings.length) process.exitCode = 1;
else console.log('✔ Alle gemessenen Stationen bestehen; Grenzen siehe Bericht.');
