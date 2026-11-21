// R-35 click-through: drives system Edge headless through every interactive element.
import { chromium } from 'playwright-core';

const BASE = 'http://localhost:8080';
const OUT = new URL('./shots/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
import { mkdirSync } from 'node:fs';
mkdirSync(OUT, { recursive: true });

const errors = [];
const results = [];
const ok = (name, pass, detail = '') => {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name}${detail ? ' :: ' + detail : ''}`);
};

const browser = await chromium.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
});

const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));

// 1. Home loads, pack card renders
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForSelector('.pack-poster', { timeout: 5000 });
ok('home renders pack card', true);
await page.screenshot({ path: OUT + '01-home-dark.png' });

// 2. Download pack -> Ready badge + snackbar
await page.click('button[data-action="download"]');
await page.waitForSelector('.badge-ready', { timeout: 8000 });
const snack = await page.locator('#snackbar').textContent();
ok('download completes, Ready badge', (snack || '').includes('Ready for offline'), snack || '');
await page.screenshot({ path: OUT + '02-home-ready.png' });

// 3. Open pack -> song list
await page.click('button[data-action="open"]');
await page.waitForSelector('.song-row');
const rows = await page.locator('.song-row').count();
ok('song list opens with rows', rows === 34, `${rows} rows`);
await page.screenshot({ path: OUT + '03-songs.png' });

// 4. Viewer: lyrics + auto-scroll controls
await page.click('.song-row >> nth=0');
await page.waitForSelector('.lyric-line');
const lineCount = await page.locator('.lyric-line').count();
ok('viewer renders lyric lines', lineCount > 0, `${lineCount} lines`);
const focusCount = await page.locator('.lyric-line.is-focus').count();
ok('focused line marked', focusCount === 1, `${focusCount} focused`);

await page.click('#scroll-toggle');
await page.waitForFunction(() => document.getElementById('scroll-toggle').textContent === 'Pause');
ok('auto-scroll start -> Pause visible', true);
await page.click('#scroll-toggle');
await page.waitForFunction(() => document.getElementById('scroll-toggle').textContent === 'Resume');
ok('pause -> Resume visible', true);
await page.click('#scroll-stop');
await page.waitForFunction(() => document.getElementById('scroll-toggle').textContent === 'Start');
ok('stop -> back to start label', true);

// speed steppers
const s0 = await page.inputValue('#scroll-speed');
await page.click('#speed-up');
const s1 = await page.inputValue('#scroll-speed');
await page.click('#speed-down');
const s2 = await page.inputValue('#scroll-speed');
ok('speed + / - steppers', s1 === '35' && s2 === s0, `${s0} -> ${s1} -> ${s2}`);

// font scale
const fs0 = await page.evaluate(() => getComputedStyle(document.documentElement).fontSize);
await page.click('#font-up');
const fs1 = await page.evaluate(() => getComputedStyle(document.documentElement).fontSize);
await page.click('#font-down');
ok('A+ / A- font scale', fs0 !== fs1, `${fs0} -> ${fs1}`);
await page.screenshot({ path: OUT + '04-viewer.png' });

// prev/next navigation
await page.click('[data-goto]');
await page.waitForSelector('.viewer-title');
ok('Next song navigates', true);

// 5. Chrome-free reader contract: tab bar hidden in viewer, back link is the exit
const tabHidden = await page.evaluate(() => getComputedStyle(document.querySelector('.tabbar')).display === 'none');
ok('viewer is chrome-free (tab bar hidden)', tabHidden);
await page.click('.btn-back');
await page.waitForSelector('.song-row');
const tabBack = await page.evaluate(() => getComputedStyle(document.querySelector('.tabbar')).display !== 'none');
ok('tab bar returns outside the viewer', tabBack);
await page.goto(BASE + '#/', { waitUntil: 'networkidle' });
await page.waitForSelector('.pack-poster');
await page.click('#tab-search');
await page.waitForSelector('#search-form');
ok('search tab opens', true);
await page.fill('#search-input', 'welcome');
await page.click('#search-form button[type="submit"]');
await page.waitForSelector('.result-row', { timeout: 5000 });
const resCount = await page.locator('.result-row').count();
ok('search returns results', resCount > 0, `${resCount} results`);
await page.screenshot({ path: OUT + '05-search.png' });

// recent chip: re-open search so saved queries render, then click one
await page.goto(BASE + '#/', { waitUntil: 'networkidle' });
await page.click('#tab-search');
await page.waitForSelector('.chip', { timeout: 3000 });
await page.click('.chip >> nth=0');
await page.waitForSelector('.result-row', { timeout: 5000 });
ok('recent chip re-runs search', true);

// 6. Keyboard: tab reaches controls, focus visible indicator exists
await page.goto(BASE + '#/search', { waitUntil: 'networkidle' });
await page.keyboard.press('Tab');
const active1 = await page.evaluate(() => document.activeElement?.className || document.activeElement?.tagName);
ok('Tab moves focus off body', active1 !== 'BODY', String(active1));

// 7. Mobile 320px: no horizontal overflow on every screen
const mctx = await browser.newContext({ viewport: { width: 320, height: 640 }, isMobile: true, hasTouch: true });
const mp = await mctx.newPage();
mp.on('console', (m) => { if (m.type() === 'error') errors.push('mobile: ' + m.text()); });
mp.on('pageerror', (e) => errors.push('mobile: ' + String(e)));
for (const [name, hash] of [['home', '#/'], ['search', '#/search']]) {
  await mp.goto(BASE + hash, { waitUntil: 'networkidle' });
  await mp.waitForTimeout(300);
  const sw = await mp.evaluate(() => document.scrollingElement.scrollWidth);
  ok(`no horizontal overflow at 320px (${name})`, sw <= 320, `scrollWidth=${sw}`);
}
await mp.goto(BASE, { waitUntil: 'networkidle' });
await mp.waitForSelector('.pack-poster');
// pack already downloaded in IDB? different context => fresh IDB. Download on mobile too.
if (await mp.locator('button[data-action="download"]').count()) {
  await mp.click('button[data-action="download"]');
  await mp.waitForSelector('.badge-ready', { timeout: 8000 });
}
await mp.click('button[data-action="open"]');
await mp.waitForSelector('.song-row');
let sw = await mp.evaluate(() => document.scrollingElement.scrollWidth);
ok('no horizontal overflow at 320px (songs)', sw <= 320, `scrollWidth=${sw}`);
await mp.screenshot({ path: OUT + '06-mobile-songs.png', fullPage: false });
await mp.click('.song-row >> nth=0');
await mp.waitForSelector('.lyric-line');
sw = await mp.evaluate(() => document.scrollingElement.scrollWidth);
ok('no horizontal overflow at 320px (viewer)', sw <= 320, `scrollWidth=${sw}`);
await mp.screenshot({ path: OUT + '07-mobile-viewer.png' });
// tap target sizes: every button >= 44px tall
const small = await mp.evaluate(() => {
  const bad = [];
  for (const b of document.querySelectorAll('button, a.tab, .chip')) {
    const r = b.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue; // hidden
    if (r.height < 44 || r.width < 44) bad.push(`${b.id || b.className || b.tagName}:${Math.round(r.width)}x${Math.round(r.height)}`);
  }
  return bad;
});
ok('tap targets >= 44px (mobile)', small.length === 0, small.join(', '));

// 8. Light scheme renders (R-34 both themes)
const lctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: 'light' });
const lp = await lctx.newPage();
lp.on('pageerror', (e) => errors.push('light: ' + String(e)));
await lp.goto(BASE, { waitUntil: 'networkidle' });
await lp.waitForSelector('.pack-poster');
const bg = await lp.evaluate(() => getComputedStyle(document.body).backgroundColor);
ok('light scheme applies', bg === 'rgb(247, 245, 243)', bg);
await lp.screenshot({ path: OUT + '08-home-light.png' });

// 9. Delete flow: two-tap confirm (fresh context => download first)
await lp.click('button[data-action="download"]');
await lp.waitForSelector('.badge-ready', { timeout: 8000 });
await lp.click('button[data-action="delete"]');
const confirmLabel = await lp.locator('button[data-action="delete"]').textContent();
await lp.click('button[data-action="delete"]');
await lp.waitForSelector('.badge, button[data-action="download"]', { timeout: 3000 });
ok('delete two-tap confirm works', (confirmLabel || '').includes('Confirm'), confirmLabel || '');

// 10. console errors
ok('no console/page errors', errors.length === 0, errors.slice(0, 5).join(' | '));

await browser.close();

const fails = results.filter((r) => !r.pass);
console.log(`\n${results.length - fails.length}/${results.length} passed`);
process.exit(fails.length ? 1 : 0);
