// Dev-only visual QA. Setup once:  npm i -D playwright && npx playwright install chromium
// Run:  node tools/ui-check.mjs http://localhost:3000   (ROUTES="#/,#/pack/black-parade,#/song/9" to override)
import { chromium } from 'playwright';
import fs from 'node:fs';
const base = process.argv[2] || 'http://localhost:3000';
const routes = (process.env.ROUTES || '#/,#/setlist,#/song/9').split(',');
fs.mkdirSync('ui-shots', { recursive: true });

const measure = () => {
  const out = [], vw = innerWidth, R = e => e.getBoundingClientRect();
  const name = e => e.dataset?.name || e.id || (e.className && String(e.className)) || e.tagName;
  const add = (rule, msg, e) => out.push({ rule, msg, el: e ? name(e) : '' });
  const shown = e => { const b = R(e); return b.width > 0 && b.height > 0; };
  if (document.documentElement.scrollWidth > vw) add('overflow', 'horizontal scroll');
  document.querySelectorAll('button,a,input,[role=button]').forEach(e => { if (!shown(e)) return; const b = R(e);
    if (b.width < 44 || b.height < 44) add('tap-target', `${Math.round(b.width)}x${Math.round(b.height)} is under 44x44`, e); });
  document.querySelectorAll('[data-center]').forEach(e => { const b = R(e), d = Math.abs((b.left + b.right) / 2 - vw / 2);
    if (d > 1) add('center', `off screen-centre by ${d.toFixed(1)}px`, e); });
  document.querySelectorAll('[data-row]').forEach(row => { const ys = [...row.children].filter(shown).map(c => { const b = R(c); return (b.top + b.bottom) / 2; });
    const d = Math.max(...ys) - Math.min(...ys); if (d > 1) add('row-centre', `children centres differ by ${d.toFixed(1)}px`, row); });
  const edges = [...document.querySelectorAll('[data-edge]')].filter(shown);
  if (edges.length) { const x0 = R(edges[0]).left; edges.forEach(e => { const x = R(e).left; if (Math.abs(x - x0) > 1) add('left-edge', `left ${x.toFixed(1)} vs ${x0.toFixed(1)}`, e); }); }
  document.querySelectorAll('button svg').forEach(s => { const b = R(s), p = R(s.closest('button'));
    const dx = (b.left + b.right - p.left - p.right) / 2, dy = (b.top + b.bottom - p.top - p.bottom) / 2;
    if (Math.abs(dx) > 1 || Math.abs(dy) > 1) add('icon-centre', `icon off-centre by ${dx.toFixed(1)}, ${dy.toFixed(1)}`, s.closest('button')); });
  document.querySelectorAll('button').forEach(b => { if (/[‹›⌕▾✓♪]/.test(b.textContent) && shown(b)) add('glyph-icon', 'text glyph used as icon; use SVG', b); });
  document.querySelectorAll('body *').forEach(e => { if (!shown(e) || ![...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) return;
    const cs = getComputedStyle(e), fs = parseFloat(cs.fontSize);
    if (/bodoni|didot/i.test(cs.fontFamily) && fs < 24) add('serif-small', `serif at ${fs}px (min 24)`, e);
    if (fs < 15 && !e.hasAttribute('data-small')) add('text-small', `${fs}px text`, e); });
  const num = c => c.match(/[\d.]+/g).map(Number);
  const lum = ([r, g, b]) => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
  const bgOf = e => { for (; e; e = e.parentElement) { const c = num(getComputedStyle(e).backgroundColor); if (c.length === 3 || c[3] > .99) return c.slice(0, 3); } return [255, 255, 255]; };
  document.querySelectorAll('[data-contrast]').forEach(e => { const cs = getComputedStyle(e), c = num(cs.color), bg = bgOf(e);
    let op = 1; for (let p = e; p; p = p.parentElement) op *= parseFloat(getComputedStyle(p).opacity);
    const a = (c[3] ?? 1) * op, fg = [0, 1, 2].map(i => c[i] * a + bg[i] * (1 - a));
    const [l1, l2] = [lum(fg), lum(bg)].sort((x, y) => y - x), ratio = (l1 + .05) / (l2 + .05), need = +e.dataset.contrast || 4.5;
    if (ratio < need) add('contrast', `${ratio.toFixed(2)}:1 (needs ${need}:1)`, e); });
  return out;
};

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage();
let total = 0;
for (const r of routes) {
  await page.goto(base + '/' + r); await page.waitForTimeout(400);
  const file = `ui-shots/${r.replace(/[^\w]+/g, '_') || 'home'}.png`;
  await page.screenshot({ path: file });
  const res = await page.evaluate(measure); total += res.length;
  console.log(`\n${r}  ->  ${file}  (${res.length} finding${res.length === 1 ? '' : 's'})`);
  res.forEach(f => console.log(`  [${f.rule}] ${f.msg}  <${f.el}>`));
}
await browser.close();
console.log(total ? `\n${total} finding(s). Fix them, then OPEN ui-shots/*.png and look.` : '\nNo automated findings. Now OPEN ui-shots/*.png and look.');
process.exit(total ? 1 : 0);
