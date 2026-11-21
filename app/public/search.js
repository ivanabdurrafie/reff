// Offline search: index built at pack download, queried with typo tolerance.
// Pure module: no DOM, usable from Node for tests.

export function tokenize(text) {
  return (
    (String(text || '').toLowerCase().match(/[a-z0-9']+/g) || [])
      .map((t) => t.replace(/^'+|'+$/g, ''))
      .filter(Boolean)
  );
}

export function buildIndex(songs) {
  return songs.map((s, i) => {
    const lines = String(s.lyrics || '').split(/\r?\n/);
    return {
      i,
      id: s.id,
      title: s.title,
      artist: s.artist || '',
      titleTokens: tokenize(s.title),
      artistTokens: tokenize(s.artist),
      lines,
      lineTokens: lines.map(tokenize),
    };
  });
}

// Bounded Levenshtein: returns max+1 as soon as the distance must exceed max.
function editDistance(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (cur[j] < rowMin) rowMin = cur[j];
    }
    if (rowMin > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

function tokenScore(q, t, relaxed) {
  if (!t) return 0;
  if (t === q) return 3;
  const maxD = relaxed ? 3 : q.length < 5 ? 1 : 2;
  if (q.length >= 3 && t.startsWith(q)) return 2;
  if (editDistance(q, t, maxD) <= maxD) return 1;
  return 0;
}

// Sum of each query token's best match: a full title phrase must outrank a single shared word.
function bestScore(queryTokens, tokens, relaxed) {
  let total = 0;
  for (const q of queryTokens) {
    let best = 0;
    for (const t of tokens) {
      const s = tokenScore(q, t, relaxed);
      if (s > best) {
        best = s;
        if (best === 3) break;
      }
    }
    total += best;
  }
  return total;
}

/**
 * @param {ReturnType<typeof buildIndex>} index
 * @param {string} query
 * @param {{ relaxed?: boolean }} [opts] relaxed = looser fuzzy pass for zero-result fallback
 * @returns {{ song: object, score: number, matchLine: number }[]} sorted best-first
 */
export function search(index, query, opts = {}) {
  const qTokens = tokenize(query);
  if (!qTokens.length) return [];
  const relaxed = !!opts.relaxed;
  const results = [];
  for (const entry of index) {
    let score = bestScore(qTokens, entry.titleTokens, relaxed) * 3;
    score += bestScore(qTokens, entry.artistTokens, relaxed) * 2;
    // Best single line only. Summing every matching line would let long lyrics outrank titles.
    let matchLine = -1;
    let matchLineScore = 0;
    for (let li = 0; li < entry.lineTokens.length; li++) {
      const ls = bestScore(qTokens, entry.lineTokens[li], relaxed);
      if (ls > matchLineScore) {
        matchLineScore = ls;
        matchLine = li;
      }
    }
    score += matchLineScore;
    if (score > 0) results.push({ song: entry, score, matchLine });
  }
  results.sort((a, b) => b.score - a.score || a.song.i - b.song.i);
  return results;
}
