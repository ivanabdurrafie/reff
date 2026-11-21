#!/usr/bin/env node
// Search tests against the built demo pack. Run: node tools/test-search.mjs
import { readFile } from 'node:fs/promises';
import { buildIndex, search, tokenize } from '../public/search.js';

let failures = 0;
function check(name, cond, detail = '') {
  if (cond) {
    console.log(`ok   ${name}`);
  } else {
    failures++;
    console.error(`FAIL ${name}${detail ? ` : ${detail}` : ''}`);
  }
}

const packPath = new URL('../public/packs/demo-mcr-black-parade-2026.json', import.meta.url);
const pack = JSON.parse(await readFile(packPath, 'utf8'));
const index = buildIndex(pack.songs);

check('pack has songs', pack.songs.length === 34, `got ${pack.songs.length}`);
check('index built', index.length === pack.songs.length);

// exact title words
let hits = search(index, 'welcome to the black parade');
check('exact title finds Welcome to the Black Parade',
  hits[0]?.song.id === 'welcome-to-the-black-parade',
  `top=${hits[0]?.song.id}`);

// typo tolerance (F17)
hits = search(index, 'welcom to the black parad');
check('typo query still finds the song',
  hits[0]?.song.id === 'welcome-to-the-black-parade',
  `top=${hits[0]?.song.id}`);

// partial words
hits = search(index, 'house of wolves');
check('partial phrase finds House of Wolves',
  hits[0]?.song.id === 'house-of-wolves',
  `top=${hits[0]?.song.id}`);

// artist search (F16)
hits = search(index, 'my chemical romance');
check('artist query returns results', hits.length > 0);

// empty query
check('empty query returns none', search(index, '   ').length === 0);

// nonsense
hits = search(index, 'zzzqqqxyz');
check('nonsense returns none', hits.length === 0);

// relaxed fallback (F37): strict misses (dist 3 > strict budget), relaxed catches
const strict = search(index, 'enaers');
const relaxed = search(index, 'enaers', { relaxed: true });
check('relaxed mode finds near-match when strict fails',
  strict.length === 0 && relaxed.length > 0,
  `strict=${strict.length} relaxed=${relaxed.length}`);
if (relaxed.length) {
  check('relaxed top hit is Teenagers',
    relaxed[0]?.song.id === 'teenagers',
    `top=${relaxed[0]?.song.id}`);
}

// token sanity
check('tokenize lowercases and strips punctuation',
  JSON.stringify(tokenize("Give 'Em Hell, Kid!")) === JSON.stringify(['give', 'em', 'hell', 'kid']));

// placeholder-only songs must not crash the search
hits = search(index, 'lyrics not included');
check('placeholder lyric text searchable without crash', Array.isArray(hits));

if (failures) {
  console.error(`\n${failures} test(s) failed`);
  process.exit(1);
}
console.log('\nall tests passed');
