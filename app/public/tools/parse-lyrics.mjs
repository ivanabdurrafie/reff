#!/usr/bin/env node
// Usage: node tools/parse-lyrics.mjs song.txt > song.json
// Turns plain lyrics (labelled or not) into sections. Repeated unlabelled
// stanzas are inferred to be the Reff (chorus); everything else keeps name:null.
import fs from 'node:fs';
const text = fs.readFileSync(process.argv[2], 'utf8').replace(/\r/g, '').trim();
const LABEL = /^[\[(]?\s*(intro|verse|pre[-\s]?(?:chorus|reff)|chorus|reff|refrain|hook|bridge|outro|interlude|part)\s*(\d*)\s*[\])]?\s*:?$/i;
const norm = s => s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/g, ' ').trim();
const canon = raw => {
  const m = raw.match(LABEL), k = m[1].toLowerCase(), n = m[2] ? ' ' + m[2] : '';
  if (/^pre/.test(k)) return 'Pre-reff';
  if (/chorus|reff|refrain|hook/.test(k)) return 'Reff';
  return k[0].toUpperCase() + k.slice(1) + n;
};
// overlap coefficient: shared lines / lines in the smaller stanza (catches a Reff with an extra ad-lib line)
const jacc = (a, b) => { const A = new Set(a.map(norm)), B = new Set(b.map(norm));
  const i = [...A].filter(x => B.has(x)).length; return Math.min(A.size, B.size) < 2 ? 0 : i / Math.min(A.size, B.size); };

let secs = text.split(/\n\s*\n+/)
  .map(b => b.split('\n').map(l => l.trim()).filter(Boolean)).filter(b => b.length)
  .map(lines => {
    if (LABEL.test(lines[0]) && lines.length > 1) { const name = canon(lines.shift()); return { name, explicit: true, lines }; }
    return { name: null, explicit: false, lines };
  });

// pass 1: exact repeats of unlabelled stanzas -> Reff
const count = {}; secs.forEach(s => { const k = norm(s.lines.join(' ')); count[k] = (count[k] || 0) + 1; });
secs.forEach(s => { if (!s.explicit && count[norm(s.lines.join(' '))] >= 2) { s.name = 'Reff'; s.inferred = true; } });
// pass 2: near-repeats (>=80% of the smaller stanza's lines shared) of a known Reff -> Reff
const reffs = () => secs.filter(s => s.name === 'Reff');
secs.forEach(s => { if (!s.name && reffs().some(r => jacc(r.lines, s.lines) >= 0.8)) { s.name = 'Reff'; s.inferred = true; } });

const out = secs.map(({ name, inferred, lines }) => ({ name, reff: name === 'Reff', ...(inferred ? { inferred: true } : {}), lines }));
console.log(JSON.stringify({ sections: out }, null, 2));
