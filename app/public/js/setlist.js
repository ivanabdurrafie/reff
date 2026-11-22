// Setlist — template function returns an HTML string.
import { state } from './store.js';
import { songList, songTitle } from './packs.js';
import { iconBack, iconSearch } from './icons.js';

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Shared setlist song row — used by Setlist and the jump-to-song sheet. */
export function songRowHtml(song, i, opts = {}) {
  const n = Number(song?.n) || i + 1;
  const cur = !!opts.current;
  const missing = !!opts.missing;
  const tag = opts.tag != null ? opts.tag : cur ? 'Resume' : '';
  const right = missing
    ? '<span class="r miss" data-small>lyrics missing</span>'
    : tag
      ? `<span class="tag-now">${esc(tag)}</span>`
      : '';
  const extra = opts.extra || '';
  return `<button class="row${cur ? ' cur' : ''}" data-action="open-song" data-n="${n}"${extra}>
    <span class="n">${String(n).padStart(2, '0')}</span>
    <span class="row-t">${esc(songTitle(song, i))}</span>
    ${right}
  </button>`;
}

export function renderSetlist() {
  const pack = state.pack;
  const songs = songList(pack);
  const meta = state.index.find((m) => m.id === state.packId) || {};
  const ready = !!pack;
  const lastN = state.lastSong?.packId === state.packId ? state.lastSong.n : null;
  const cta = lastN != null ? `Resume song ${lastN}` : 'Start singing';

  // Title = artist, subtitle = venue only (never repeat venue in both).
  const title = pack?.artist || meta.artist || 'Setlist';
  const venue = pack?.venue || meta.venue || '';
  const sub = [venue, ready ? `${songs.length} songs` : null, ready ? 'All saved offline' : null]
    .filter(Boolean)
    .join(' · ');

  const rows = songs
    .map((song, i) => {
      const n = Number(song?.n) || i + 1;
      const cur = lastN === n;
      const lines = Array.isArray(song?.lines) ? song.lines : [];
      const missing = !lines.some((l) => String(l).trim());
      return songRowHtml(song, i, { current: cur, missing, tag: cur ? 'Resume' : '' });
    })
    .join('');

  return `<div class="scr">
    <div class="top-row" data-row>
      <a class="back" href="#/" data-action="go-home">${iconBack}<span>Home</span></a>
      <button class="icon-btn" data-action="open-search" aria-label="Search">${iconSearch}</button>
    </div>
    <div class="stitle" data-edge>${esc(title)}</div>
    ${sub ? `<div class="ssub" data-edge data-small>${esc(sub)}</div>` : ''}
    <button class="cta" data-action="cta-setlist" style="margin-bottom:18px">
      <span>${esc(cta)}</span>
    </button>
    <div class="list" data-edge>${rows || '<div class="empty">This pack has no songs yet.</div>'}</div>
  </div>`;
}
