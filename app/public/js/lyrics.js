// Lyrics screen — plain lines (blank = stanza gap), no section labels.
// Consecutive duplicate lines collapse to one row with ×n.
import { state, saveSettings, clamp } from './store.js';
import { songList, songLines, songTitle, findSongByN } from './packs.js';
import { iconBack, iconForward, iconSearch, iconDown } from './icons.js';

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Non-empty lines, consecutive duplicates collapsed.
 * Returns [{ text, i, end, count }] where i..end is the raw index span.
 */
export function visibleLines(pack, n) {
  const found = findSongByN(pack, n);
  if (!found) return [];
  const raw = songLines(found.song);
  const out = [];
  for (let i = 0; i < raw.length; i++) {
    const text = raw[i];
    if (!String(text).trim()) continue;
    const last = out[out.length - 1];
    if (last && last.text === text) {
      last.end = i;
      last.count += 1;
      continue;
    }
    out.push({ text, i, end: i, count: 1 });
  }
  return out;
}

export function renderLyrics() {
  const pack = state.pack;
  const songs = songList(pack);
  if (!songs.length) {
    return `<div class="scr"><a class="back" href="#/" data-action="go-home">${iconBack}<span>Home</span></a>
      <div class="empty">This pack has no songs yet.</div></div>`;
  }

  const found = findSongByN(pack, state.song) || findSongByN(pack, songs[0]?.n ?? 1);
  if (!found) {
    return `<div class="scr"><a class="back" href="#/" data-action="go-home">${iconBack}<span>Home</span></a>
      <div class="empty">Song not found.</div></div>`;
  }

  const { song, index } = found;
  const total = songs.length;
  const title = songTitle(song, index);

  const raw = songLines(found.song);
  const hasText = raw.some((l) => String(l).trim());
  let body;
  if (!hasText) {
    body = `<div class="empty">Lyrics missing for this song.</div>`;
  } else {
    const parts = [];
    let i = 0;
    while (i < raw.length) {
      const text = raw[i];
      if (!String(text).trim()) {
        parts.push('<div class="gap" aria-hidden="true"></div>');
        i += 1;
        continue;
      }
      let j = i;
      while (j + 1 < raw.length && raw[j + 1] === text) j += 1;
      const count = j - i + 1;
      const times = count > 1 ? `<span class="times" aria-hidden="true">×${count}</span>` : '';
      const countAttr = count > 1 ? ` data-end="${j}" data-count="${count}"` : '';
      parts.push(
        `<button class="line" data-action="line" data-i="${i}"${countAttr} data-contrast="7">
          <i class="ball" aria-hidden="true"></i>${esc(text)}${times}
        </button>`
      );
      i = j + 1;
    }
    body = parts.join('');
  }

  const posLabel = `${index + 1} / ${total}`;

  return `<div class="prog" id="prog" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"></div>
  <header class="hdr bar" data-row>
    <a class="back" href="#/pack/${encodeURIComponent(state.packId || '')}" data-action="go-setlist" data-id="${esc(state.packId || '')}" aria-label="Back to setlist">${iconBack}<span class="back-label">Setlist</span></a>
    <button class="mid tap" data-action="open-jump" data-center aria-label="Jump to song">
      <b>${esc(title)}</b><small id="pos">${esc(posLabel)}</small>
    </button>
    <div class="bar-end">
      <button class="icon-btn" data-action="open-jump" aria-label="Jump to song">${iconSearch}</button>
      <button id="aa" class="aa-btn" data-action="open-sheet" aria-label="Display settings">Aa</button>
    </div>
  </header>
  <div class="ly" id="ly">${body}</div>
  <div class="ctrl" data-row>
    <button class="btn prev" data-action="line-prev" aria-label="Previous line">${iconBack}</button>
    <button class="btn go next" data-action="line-next" id="next">Next line</button>
  </div>`;
}

function prefersReduced() {
  return matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Scroll current line to ~33% of the scroller. Instant when jumping (search/open). */
function anchorCurrent(ly, instant) {
  const on = ly.querySelector('.line.on');
  if (!on) return;
  const lyRect = ly.getBoundingClientRect();
  const onRect = on.getBoundingClientRect();
  const target = ly.scrollTop + (onRect.top - lyRect.top) - ly.clientHeight * 0.33;
  const behavior = instant || prefersReduced() ? 'auto' : 'smooth';
  ly.scrollTo({ top: Math.max(0, target), behavior });
}

/** After paint: dim past/upcoming, focus current, anchor scroll, progress. Idempotent. */
export function markLyrics(opts = {}) {
  const instant = !!opts.instant;
  const ly = document.getElementById('ly');
  const prog = document.getElementById('prog');
  const pos = document.getElementById('pos');
  if (!ly) return;

  const pack = state.pack;
  const vis = visibleLines(pack, state.song);
  const cur = state.line;

  ly.querySelectorAll('.line').forEach((el) => {
    const start = Number(el.dataset.i);
    const end = el.dataset.end != null ? Number(el.dataset.end) : start;
    const isOn = cur >= start && cur <= end;
    el.classList.toggle('on', isOn);
    el.classList.toggle('past', !isOn && start < cur);
    // Contrast hook: only the current line must hold 7:1; dimmed lines are hierarchy.
    if (isOn) el.setAttribute('data-contrast', '7');
    else el.removeAttribute('data-contrast');
  });

  requestAnimationFrame(() => {
    requestAnimationFrame(() => anchorCurrent(ly, instant));
  });
  if (document.fonts?.ready) {
    document.fonts.ready.then(() => {
      if (document.getElementById('ly') === ly) anchorCurrent(ly, true);
    });
  }

  const k = vis.findIndex((x) => cur >= x.i && cur <= x.end);
  const pct = vis.length ? Math.round(((k + 1) / vis.length) * 100) : 0;
  if (prog) {
    prog.style.width = `${pct}%`;
    prog.setAttribute('aria-valuenow', String(pct));
  }

  const found = findSongByN(pack, state.song);
  const songs = songList(pack);
  const idx = found ? found.index : 0;
  if (pos) {
    pos.textContent = `${idx + 1} / ${songs.length}`;
  }

  const nextBtn = document.getElementById('next');
  if (nextBtn) {
    const last = k >= vis.length - 1;
    nextBtn.textContent = last ? 'Next song' : 'Next line';
    nextBtn.setAttribute('aria-label', last ? 'Go to next song' : 'Next lyric line');
  }

  // Long title: keep the chevron, drop the "Setlist" word so groups never collide.
  const midB = document.querySelector('.mid b');
  const backLabel = document.querySelector('.bar.hdr .back-label');
  if (midB && backLabel) {
    backLabel.hidden = midB.scrollWidth > midB.clientWidth + 1;
  }
}

/** Step by collapsed groups; wraps to next song at the end. */
export function stepLine(delta) {
  const vis = visibleLines(state.pack, state.song);
  if (!vis.length) return;
  let k = vis.findIndex((x) => state.line >= x.i && state.line <= x.end);
  if (k < 0) k = 0;
  const n = k + delta;
  if (n < 0) return;
  if (n >= vis.length) {
    goNextSong();
    return;
  }
  state.line = vis[n].i;
  markLyrics();
}

export function goNextSong() {
  const songs = songList(state.pack);
  if (!songs.length) return;
  const found = findSongByN(state.pack, state.song);
  const idx = found ? (found.index + 1) % songs.length : 0;
  const song = songs[idx];
  state.song = Number(song?.n) || idx + 1;
  state.line = 0;
  saveSettings();
  document.dispatchEvent(new CustomEvent('reff:route'));
}

export function openSong(n, lineIdx = null) {
  state.song = Number(n) || 1;
  state.line = lineIdx != null && Number.isFinite(Number(lineIdx)) ? Number(lineIdx) : 0;
  const found = findSongByN(state.pack, state.song);
  if (found) {
    state.lastSong = { packId: state.packId, n: Number(found.song?.n) || found.index + 1 };
    saveSettings();
  }
  document.dispatchEvent(new CustomEvent('reff:route'));
}

export function tapLine(rawIndex) {
  state.line = Number(rawIndex);
  markLyrics({ instant: true });
}

/** Auto-advance: interval while enabled; pauses on touch/scroll inside .ly. */
let autoTimer = 0;

export function syncAutoAdvance() {
  clearInterval(autoTimer);
  autoTimer = 0;
  if (!state.auto) return;
  if (state.route.name !== 'lyrics') return;
  autoTimer = setInterval(() => {
    if (state.route.name !== 'lyrics') return;
    stepLine(1);
  }, Math.round(2000 / clamp(state.autoSpeed || 5, 1, 10)));
}

export function pauseAutoTemporarily() {
  if (!autoTimer) return;
  clearInterval(autoTimer);
  autoTimer = 0;
  setTimeout(() => {
    if (state.auto && state.route.name === 'lyrics' && !autoTimer) syncAutoAdvance();
  }, 4000);
}
