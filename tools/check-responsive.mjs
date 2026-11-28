#!/usr/bin/env node
/**
 * Passt die Website auf jeden Bildschirm – ohne seitliches Wegziehen?
 *
 *   node tools/check-responsive.mjs [--url http://127.0.0.1:5210] [--chromium /pfad]
 *
 * Warum das existiert
 * -------------------
 * Die Landingpage hatte auf einem 412-px-Telefon 3 px Überlauf. Niemand hat es
 * gesehen, weil man es nicht sieht: `body { overflow-x: hidden }` schluckt die
 * Scrollleiste, aber die Seite lässt sich weiterhin seitlich ziehen und rechts
 * blitzt ein leerer Streifen auf. Gefunden wurde es nur, weil ein Prüfskript
 * zufällig `scrollWidth > clientWidth` gemessen hat.
 *
 * Die Ursachen waren allesamt Kacheln, die ein paar Pixel über den Rand
 * hinausragen: ein gedrehter Kartenstapel, ein verschobener Lichtkegel, eine
 * Kopfzeile, deren Inhalt breiter ist als der Bildschirm. Jede einzelne davon
 * ist im Quellcode nicht zu sehen – erst im Browser bei der richtigen Breite.
 *
 * Deshalb misst dieses Skript jede Route bei jeder Breite und nennt das Element,
 * das übersteht. Es ist bewusst *nicht* Teil von `npm run verify`: es braucht
 * einen laufenden Server und einen Browser-Download. Es läuft in CI.
 */
import path from 'node:path';

const args = process.argv.slice(2);
const getArg = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};

const url = getArg('url', 'http://127.0.0.1:5210').replace(/\/$/, '');
const executablePath = getArg('chromium', process.env.WAI_CHROMIUM || undefined);

/**
 * Die Breiten sind nicht willkürlich: es sind die Kanten der Media Queries im
 * Stylesheet plus/minus eins sowie die verbreitetsten Gerätebreiten (320 =
 * kleinstes iPhone SE, 360 = häufigstes Android, 412 = Pixel, 768/1024 =
 * Tablets quer, 1180 = die Inhaltsbreite der Seite).
 */
const WIDTHS = [320, 360, 390, 412, 480, 600, 601, 768, 940, 941, 1024, 1179, 1180, 1280, 1440];
const ROUTES = ['/', '/legal/imprint', '/legal/privacy', '/legal/disclaimer', '/app/'];

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  console.error('\n✖ Playwright fehlt:  npm i -D playwright  &&  npx playwright install chromium\n');
  process.exit(2);
}

let browser;
try {
  browser = await chromium.launch({
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
    ...(executablePath ? { executablePath } : {}),
  });
} catch (error) {
  console.error(`\n✖ Kein steuerbarer Chromium: ${String(error).split('\n')[0]}`);
  console.error('  In einer Umgebung ohne `npx playwright install`: --chromium /pfad/zum/chrome');
  console.error('  und eventuell LD_LIBRARY_PATH auf dessen lib-Ordner setzen.\n');
  process.exit(2);
}

/**
 * Wer steht über den Rand? Nur Elemente, die es auch zeigen können – was in
 * einem `overflow: hidden`-Vorfahren liegt, ist absichtlich abgeschnitten
 * (Laufband, Deko-Gitter, Kartenstapel). Sonst meldet das Skript 105 Treffer
 * und keinen davon ist ein Fehler.
 */
const OVERSIZE_PROBE = () => {
  const viewport = document.documentElement.clientWidth;
  const offenders = [];
  for (const element of document.querySelectorAll('body *')) {
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 || rect.right <= viewport + 0.5) continue;
    let clipped = false;
    for (let node = element.parentElement; node; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.overflowX !== 'visible' || (style.contain ?? '').includes('paint')) {
        clipped = true;
        break;
      }
    }
    if (clipped) continue;
    const name = (element.className ?? '').toString().trim().split(/\s+/).slice(0, 2).join('.');
    offenders.push(`${element.tagName.toLowerCase()}${name ? `.${name}` : ''} (${Math.round(rect.right - viewport)} px)`);
  }
  return offenders.slice(0, 3);
};

const problems = [];
let checks = 0;
const started = Date.now();

for (const width of WIDTHS) {
  const context = await browser.newContext({
    viewport: { width, height: 800 },
    locale: 'de-DE',
    isMobile: width <= 480,
    hasTouch: width <= 480,
  });
  const page = await context.newPage();
  for (const route of ROUTES) {
    let response;
    try {
      response = await page.goto(url + route, { waitUntil: 'networkidle', timeout: 30_000 });
    } catch (error) {
      problems.push({ width, route, detail: `nicht erreichbar (${String(error).split('\n')[0]})` });
      continue;
    }
    if (!response || response.status() >= 400) {
      problems.push({ width, route, detail: `HTTP ${response?.status() ?? '—'}` });
      continue;
    }
    // Die Einblend-Animationen müssen durch sein, sonst wird gemessen, während
    // Elemente noch unterwegs sind – das ergab beim Bau dieses Skripts
    // sporadische Fehlalarme.
    await page.waitForTimeout(450);
    const measurement = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      scroll: document.scrollingElement.scrollWidth,
    }));
    checks += 1;
    if (measurement.scroll > measurement.viewport) {
      const offenders = await page.evaluate(OVERSIZE_PROBE);
      problems.push({
        width,
        route,
        detail: `${measurement.scroll - measurement.viewport} px zu breit${offenders.length ? `: ${offenders.join(', ')}` : ''}`,
      });
    }
  }
  await context.close();
}

await browser.close();

console.log(`\n▶ Responsiv: ${checks} Messungen bei ${WIDTHS.length} Breiten (${Math.round((Date.now() - started) / 1000)} s)`);
if (problems.length === 0) {
  console.log(`✔ Keine Route ist breiter als ihr Bildschirm (${ROUTES.length} Routen, ${WIDTHS[0]}–${WIDTHS.at(-1)} px)`);
  process.exit(0);
}

console.error(`\n✖ ${problems.length} Überlauf/Überläufe:`);
for (const problem of problems) {
  console.error(`  ${String(problem.width).padStart(4)} px  ${problem.route.padEnd(20)} ${problem.detail}`);
}
console.error('\nEin Überlauf heißt: die Seite lässt sich seitlich ziehen, rechts blitzt ein leerer Streifen auf.');
console.error('Meist ist es eine absolut positionierte Deko oder ein Flex-/Grid-Kind ohne min-width: 0.\n');
process.exit(1);
