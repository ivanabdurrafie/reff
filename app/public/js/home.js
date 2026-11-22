// Home ("Tonight") — template function returns an HTML string.
import { state } from './store.js';
import { songList, songTitle, fmtSize } from './packs.js';
import { iconSearch } from './icons.js';

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function pill(ready) {
  return ready
    ? '<span class="pill" data-small><i class="dot" aria-hidden="true"></i>Offline ready</span>'
    : '<span class="pill warn" data-small><i class="dot" aria-hidden="true"></i>Not saved</span>';
}

function ctaLabel(meta, ready) {
  if (state.download.busy && state.download.id === meta.id) {
    return `Downloading… ${state.download.pct}%`;
  }
  if (!ready) return `Download · ${fmtSize(meta.size)}`;
  if (state.lastSong && state.lastSong.packId === meta.id && state.lastSong.n) {
    return `Resume song ${state.lastSong.n}`;
  }
  return 'Start singing';
}

function whenLine(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(`${dateStr}T12:00:00`);
    const today = new Date();
    const same =
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate();
    const formatted = d.toLocaleDateString(undefined, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
    return same ? `Tonight, ${formatted}` : formatted;
  } catch {
    return String(dateStr);
  }
}

function row(pack, song, i, opts = {}) {
  const n = Number(song?.n) || i + 1;
  const cur = opts.current ? ' cur' : '';
  const missing = opts.missing ? '<span class="r miss" data-small>lyrics missing</span>' : '';
  const tag = opts.current ? '<span class="tag-now">Resume</span>' : '';
  return `<button class="row${cur}" data-action="open-song" data-n="${n}">
    <span class="n">${String(n).padStart(2, '0')}</span>
    <span class="row-t">${esc(songTitle(song, i))}</span>
    ${missing || tag}
  </button>`;
}

export function renderHome() {
  const meta = state.index[0];
  if (!meta) {
    return `<div class="scr"><div class="top" data-row><span class="logo">Reff</span></div>
      <div class="empty">No packs yet.</div></div>`;
  }

  const ready = !!state.pack && state.packId === meta.id;
  const songs = ready ? songList(state.pack) : [];
  const busy = state.download.busy && state.download.id === meta.id;
  const pct = busy ? state.download.pct : 0;

  const lastN = state.lastSong?.packId === meta.id ? state.lastSong.n : null;
  const mid = ready && lastN != null;

  let h = `<div class="scr">
    <div class="top" data-row>
      <span class="logo">Reff</span>
      <div class="top-end">
        ${pill(ready)}
      </div>
    </div>`;

  if (!ready && !busy) {
    h += `<div class="hint" data-edge data-small><b>Download before the show.</b> Everything works offline after that.
      To install: tap Share, then Add to Home Screen.</div>`;
  }

  h += `<div class="ticket" data-edge>
    <div class="tm">
      ${meta.date ? `<div class="when" data-small>${esc(whenLine(meta.date))}</div>` : ''}
      <div class="artist">${esc(meta.artist || meta.title || 'Pack')}</div>
      ${meta.title &&
      meta.title !== meta.artist &&
      !String(meta.title).startsWith(String(meta.artist || ''))
        ? `<div class="pack">${esc(meta.title)}</div>`
        : ''}
      ${meta.venue ? `<div class="venue" data-small>${esc(meta.venue)}</div>` : ''}
      <button class="cta" id="cta" ${busy ? 'disabled aria-busy="true"' : ''}
        data-action="cta" data-id="${esc(meta.id)}">
        <i class="f" style="width:${pct}%" aria-hidden="true"></i>
        <span>${esc(ctaLabel(meta, ready))}</span>
      </button>
    </div>
    <div class="stub" aria-hidden="true"></div>
    <div class="ts" data-small>
      <div>Songs<b>${Number(meta.songs) || (ready ? songs.length : 0)}</b></div>
      <div>Size<b>${esc(fmtSize(meta.size))}</b></div>
      <div>Version<b>${esc(meta.version || '—')}</b></div>
    </div>
  </div>`;

  if (ready && songs.length) {
    if (mid) {
      const i = songs.findIndex((s) => Number(s?.n) === lastN);
      const idx = i >= 0 ? i : 0;
      h += `<h2>Continue</h2><div class="list" data-edge>${row(state.pack, songs[idx], idx, {
        current: true,
        ready: true,
        missing: !songs[idx]?.lines?.length,
      })}</div>`;
    }

    const start = mid
      ? Math.min((songs.findIndex((s) => Number(s?.n) === lastN) + 1) % songs.length, Math.max(0, songs.length - 3))
      : 0;
    const next = [];
    for (let k = 0; k < Math.min(3, songs.length); k++) {
      const idx = (start + k) % songs.length;
      next.push(row(state.pack, songs[idx], idx, { ready: true, missing: !songs[idx]?.lines?.length }));
    }
    h += `<h2>Next up</h2><div class="list" data-edge>${next.join('')}</div>
      <button class="link" data-action="go-setlist" data-id="${esc(meta.id)}">See full setlist</button>`;
  }

  h += `<a class="find" href="#/" role="button" data-action="open-search" data-edge>
    <span class="find-ico" aria-hidden="true">${iconSearch}</span>Find a song or lyric</a>
  </div>`;
  return h;
}
