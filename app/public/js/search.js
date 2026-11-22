// Search overlay (Home / Setlist) + recents as song ids.
import { state, pushRecentSong, clearRecents, saveSettings } from './store.js';
import { songList, songLines, songTitle, findSongByN } from './packs.js';

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function highlight(text, q) {
  const s = String(text ?? '');
  if (!q) return esc(s);
  const i = s.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return esc(s);
  return `${esc(s.slice(0, i))}<mark>${esc(s.slice(i, i + q.length))}</mark>${esc(s.slice(i + q.length))}`;
}

function songRow(song, i, opts = {}) {
  const n = Number(song?.n) || i + 1;
  const title = songTitle(song, i);
  const lineAttr = opts.lineIdx != null ? ` data-line="${opts.lineIdx}"` : '';
  const sub = opts.line
    ? `<span class="r-sub">${highlight(opts.line, opts.q || '')}</span>`
    : `<span class="r">${n} / ${songList(state.pack).length}</span>`;
  return `<button class="row" data-action="open-song" data-n="${n}" data-recent="1" data-edge${lineAttr}>
    <span class="row-t">${highlight(title, opts.q || '')}</span>${sub}
  </button>`;
}

/** Filter songs by title or any lyric line. */
export function searchResults(q) {
  const query = String(q || '').trim();
  const songs = songList(state.pack);
  if (!query) return [];
  const lo = query.toLowerCase();
  const out = [];
  songs.forEach((song, i) => {
    const title = songTitle(song, i);
    const n = Number(song?.n) || i + 1;
    if (title.toLowerCase().includes(lo)) {
      out.push({ n, song, i, title, line: null, lineIdx: null });
      return;
    }
    const lines = songLines(song);
    const lineIdx = lines.findIndex((l) => String(l).toLowerCase().includes(lo));
    if (lineIdx >= 0) {
      out.push({ n, song, i, title, line: lines[lineIdx], lineIdx });
    }
  });
  return out;
}

/** Recents = recently opened song ids that still exist in this pack. */
function recentSongs() {
  const songs = songList(state.pack);
  return state.recent
    .map((id) => {
      const hit = findSongByN(state.pack, id);
      return hit ? { song: hit.song, i: hit.index } : null;
    })
    .filter(Boolean);
}

export function renderResults() {
  const host = document.getElementById('res');
  if (!host) return;
  const q = state.search.q.trim();

  if (q) {
    const items = searchResults(q);
    if (!items.length) {
      host.innerHTML = `<div class="empty">No songs match. Try a shorter word.</div>`;
      return;
    }
    host.innerHTML = items
      .map((r) => songRow(r.song, r.i, { line: r.line, lineIdx: r.lineIdx, q }))
      .join('');
    return;
  }

  // Empty query: recents if any, else setlist suggestions (never a blank screen).
  const recents = recentSongs();
  if (recents.length) {
    host.innerHTML =
      `<div class="empty list-head" data-edge>Recent <button type="button" class="clear" data-action="clear-recents">Clear</button></div>` +
      recents.map(({ song, i }) => songRow(song, i, {})).join('');
    return;
  }

  const songs = songList(state.pack).slice(0, 5);
  host.innerHTML = songs.length
    ? songs.map((song, i) => songRow(song, i, {})).join('')
    : `<div class="empty">No songs in this pack yet.</div>`;
}

export function openSearch() {
  state.search.open = true;
  state.search.q = '';
  const ov = document.getElementById('ov');
  const input = document.getElementById('q');
  if (ov) ov.classList.add('on');
  renderResults();
  input?.focus();
  saveSettings();
}

export function closeSearch() {
  state.search.open = false;
  document.getElementById('ov')?.classList.remove('on');
}

export function setQuery(q) {
  state.search.q = q;
  renderResults();
}

/** Call when a search result row is opened (song id, not the typed query). */
export function rememberOpened(n) {
  pushRecentSong(Number(n));
}

export function wipeRecents() {
  clearRecents();
  renderResults();
}
