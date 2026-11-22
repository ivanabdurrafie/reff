// Capture current UI state: desktop + mobile, all screens.
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const BASE = 'http://localhost:8080';
const OUT = new URL('./shots/cur/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
});
const errors = [];

// Desktop
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForSelector('.pack', { timeout: 5000 }).catch(() => {});
await page.screenshot({ path: OUT + 'd1-home.png' });

// Download if needed
if (await page.locator('button[data-action="download"]').count()) {
  await page.click('button[data-action="download"]');
  await page.waitForSelector('.badge-ready', { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(500);
  await page.screenshot({ path: OUT + 'd2-home-ready.png' });
}

await page.click('button[data-action="open"]');
await page.waitForSelector('.song-row');
await page.screenshot({ path: OUT + 'd3-songs.png' });

await page.click('.song-row >> nth=0');
await page.waitForSelector('.lyric-line');
await page.waitForTimeout(400);
await page.screenshot({ path: OUT + 'd4-viewer.png' });

// Auto-scroll running state
await page.click('#scroll-toggle');
await page.waitForTimeout(600);
await page.screenshot({ path: OUT + 'd5-viewer-running.png' });

await page.goto(BASE + '#/search', { waitUntil: 'networkidle' });
await page.fill('#search-input', 'welcome');
await page.click('#search-form button[type="submit"]');
await page.waitForSelector('.result-row', { timeout: 5000 }).catch(() => {});
await page.screenshot({ path: OUT + 'd6-search.png' });

// Light scheme
const lctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: 'light' });
const lp = await lctx.newPage();
lp.on('pageerror', (e) => errors.push('light: ' + String(e)));
await lp.goto(BASE, { waitUntil: 'networkidle' });
await lp.waitForSelector('.pack', { timeout: 5000 }).catch(() => {});
await lp.screenshot({ path: OUT + 'd7-home-light.png' });

// Mobile (iPhone-ish)
const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
const mp = await mctx.newPage();
mp.on('console', (m) => { if (m.type() === 'error') errors.push('mobile: ' + m.text()); });
mp.on('pageerror', (e) => errors.push('mobile: ' + String(e)));

await mp.goto(BASE, { waitUntil: 'networkidle' });
await mp.waitForSelector('.pack', { timeout: 5000 }).catch(() => {});
if (await mp.locator('button[data-action="download"]').count()) {
  await mp.click('button[data-action="download"]');
  await mp.waitForSelector('.badge-ready', { timeout: 8000 }).catch(() => {});
  await mp.waitForTimeout(500);
}
await mp.screenshot({ path: OUT + 'm1-home.png' });

await mp.click('button[data-action="open"]');
await mp.waitForSelector('.song-row');
await mp.screenshot({ path: OUT + 'm2-songs.png' });

await mp.click('.song-row >> nth=0');
await mp.waitForSelector('.lyric-line');
await mp.waitForTimeout(400);
await mp.screenshot({ path: OUT + 'm3-viewer.png' });

await mp.click('#scroll-toggle');
await mp.waitForTimeout(600);
await mp.screenshot({ path: OUT + 'm4-viewer-running.png' });

await mp.goto(BASE + '#/search', { waitUntil: 'networkidle' });
await mp.fill('#search-input', 'welcome');
await mp.tap('#search-form button[type="submit"]');
await mp.waitForSelector('.result-row', { timeout: 5000 }).catch(() => {});
await mp.screenshot({ path: OUT + 'm5-search.png' });

// 320px narrow check
const nctx = await browser.newContext({ viewport: { width: 320, height: 640 }, isMobile: true, hasTouch: true });
const np = await nctx.newPage();
await np.goto(BASE, { waitUntil: 'networkidle' });
await np.waitForTimeout(300);
const sw = await np.evaluate(() => document.scrollingElement.scrollWidth);
console.log(`320px home scrollWidth=${sw} ${sw <= 320 ? 'OK' : 'OVERFLOW'}`);
await np.screenshot({ path: OUT + 'n1-home-320.png' });

console.log('errors:', errors.length ? errors.slice(0, 8) : 'none');
await browser.close();
