// Click-through + screenshots for the CLAUDE.md-spec Reff app.
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const BASE = 'http://localhost:8080';
const OUT = new URL('./shots/spec/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const errors = [];
const results = [];
const ok = (name, pass, detail = '') => {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name}${detail ? ' :: ' + detail : ''}`);
};

const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
});

const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));

// 1. Home
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForSelector('.ticket', { timeout: 5000 });
ok('home renders ticket', true);
const logo = await page.locator('.logo').textContent();
ok('logo is Reff', (logo || '').trim() === 'Reff', logo || '');
const cta = await page.locator('#cta span').textContent();
ok('CTA shows Download', (cta || '').includes('Download'), cta || '');
await page.screenshot({ path: OUT + '01-home.png' });

// 2. Download pack
await page.click('#cta');
await page.waitForFunction(() => {
  const s = document.querySelector('#cta span');
  return s && (s.textContent.includes('Start singing') || s.textContent.includes('Resume'));
}, { timeout: 15000 });
const cta2 = await page.locator('#cta span').textContent();
ok('download → Start singing', (cta2 || '').includes('Start singing'), cta2 || '');
const pill = await page.locator('.pill').textContent();
ok('status pill Offline ready', (pill || '').includes('Offline ready'), pill || '');
await page.screenshot({ path: OUT + '02-home-ready.png' });

// 3. Setlist via See full setlist
await page.click('[data-action="go-setlist"]');
await page.waitForSelector('.stitle', { timeout: 5000 });
const stitle = await page.locator('.stitle').textContent();
ok('setlist title', (stitle || '').includes('Jakarta JIS'), stitle || '');
const rowCount = await page.locator('.list .row').count();
ok('26 song rows', rowCount === 26, `${rowCount} rows`);
await page.screenshot({ path: OUT + '03-setlist.png' });

// 4. Open a song → lyrics
await page.click('.list .row >> nth=5');
await page.waitForSelector('.line', { timeout: 5000 });
const lineCount = await page.locator('.line').count();
ok('lyrics render lines', lineCount > 0, `${lineCount} lines`);
const onCount = await page.locator('.line.on').count();
ok('exactly one current line', onCount === 1, `${onCount} on`);
await page.screenshot({ path: OUT + '04-lyrics.png' });

// 5. Next line
await page.click('[data-action="line-next"]');
await page.waitForTimeout(300);
const onAfter = await page.locator('.line.on').getAttribute('data-i');
ok('next line advances', onAfter != null, `data-i=${onAfter}`);

// 6. Aa sheet
await page.click('#aa');
await page.waitForSelector('.sheet.on', { timeout: 2000 });
await page.screenshot({ path: OUT + '05-sheet.png' });
await page.click('[data-action="close-sheet"]');

// 7. Back to setlist, home
await page.click('[data-action="go-setlist"]');
await page.waitForSelector('.stitle');
await page.click('[data-action="go-home"]');
await page.waitForSelector('.ticket');
ok('back navigation works', true);

// 8. Search overlay
await page.click('[data-action="open-search"]');
await page.waitForSelector('.ov.on', { timeout: 2000 });
await page.fill('#q', 'welcome');
await page.waitForTimeout(200);
const resCount = await page.locator('#res .row').count();
ok('search finds results', resCount > 0, `${resCount} results`);
const markCount = await page.locator('#res mark').count();
ok('match highlighted', markCount > 0, `${markCount} marks`);
await page.screenshot({ path: OUT + '06-search.png' });
await page.click('[data-action="close-search"]');

// 9. Direct hash routes (GitHub Pages safe)
await page.goto(BASE + '#/pack/mcr-jakarta-jis', { waitUntil: 'networkidle' });
await page.waitForSelector('.stitle', { timeout: 5000 });
ok('deep link #/pack/:id', true);
await page.goto(BASE + '#/song/6', { waitUntil: 'networkidle' });
await page.waitForSelector('.line', { timeout: 5000 });
ok('deep link #/song/:id', true);

// 10. Unknown hash → home (no 404)
await page.goto(BASE + '#/nope/xyz', { waitUntil: 'networkidle' });
await page.waitForSelector('.ticket', { timeout: 5000 });
ok('unknown hash falls back home', true);

// 11. 320px no overflow
const nctx = await browser.newContext({ viewport: { width: 320, height: 640 }, isMobile: true, hasTouch: true });
const np = await nctx.newPage();
np.on('pageerror', (e) => errors.push('320: ' + String(e)));
for (const [name, hash] of [['home', '#/'], ['setlist', '#/pack/mcr-jakarta-jis'], ['lyrics', '#/song/1']]) {
  await np.goto(BASE + hash, { waitUntil: 'networkidle' });
  await np.waitForTimeout(400);
  const sw = await np.evaluate(() => document.scrollingElement.scrollWidth);
  ok(`no h-overflow 320px (${name})`, sw <= 320, `scrollWidth=${sw}`);
}
await np.screenshot({ path: OUT + '07-320-home.png' });

// 12. Tap targets >= 44 on mobile home+lyrics
await page.goto(BASE + '#/', { waitUntil: 'networkidle' });
await page.waitForSelector('.ticket');
const small = await page.evaluate(() => {
  const bad = [];
  for (const b of document.querySelectorAll('button, a')) {
    const r = b.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    if (r.height < 44 && !b.classList.contains('x')) bad.push(`${b.className || b.id}:${Math.round(r.width)}x${Math.round(r.height)}`);
  }
  return bad;
});
ok('tap targets >= 44px', small.length === 0, small.join(', '));

// 13. Idempotent: download twice via ensure (cache hit path) — reload and check pill still ready
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('.ticket');
const pill2 = await page.locator('.pill').textContent();
ok('idempotent reload keeps ready', (pill2 || '').includes('Offline ready'), pill2 || '');

// 14. Light theme toggle via Aa on lyrics
await page.goto(BASE + '#/song/1', { waitUntil: 'networkidle' });
await page.waitForSelector('.line');
await page.click('#aa');
await page.click('[data-action="theme-set"][data-theme="light"]');
const isLight = await page.evaluate(() => document.documentElement.classList.contains('light'));
ok('light theme applies', isLight);
await page.screenshot({ path: OUT + '08-lyrics-light.png' });
await page.click('[data-action="theme-set"][data-theme="dark"]');

// 15. console errors
ok('no console/page errors', errors.length === 0, errors.slice(0, 5).join(' | '));

await browser.close();
const fails = results.filter((r) => !r.pass);
console.log(`\n${results.length - fails.length}/${results.length} passed`);
process.exit(fails.length ? 1 : 0);
