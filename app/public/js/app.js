// App shell: single render loop, one delegated click handler, route wiring.
import {
  state,
  loadSettings,
  saveSettings,
  applyTheme,
  applyLyricSize,
  clamp,
} from './store.js';
import { parseHash, navigate, onRoute } from './router.js';
import {
  loadIndex,
  ensurePack,
  hasCachedPack,
  isDownloaded,
  songList,
  songTitle,
} from './packs.js';
import { renderHome } from './home.js';
import { renderSetlist, songRowHtml } from './setlist.js';
import {
  renderLyrics,
  markLyrics,
  stepLine,
  openSong,
  tapLine,
  syncAutoAdvance,
  pauseAutoTemporarily,
} from './lyrics.js';
import {
  openSearch,
  closeSearch,
  setQuery,
  renderResults,
  rememberOpened,
  wipeRecents,
} from './search.js';

const view = document.getElementById('view');
const toastEl = document.getElementById('toast');
const sheet = document.getElementById('sheet');
/** Next lyrics paint should jump instantly (search hit / explicit line). */
let pendingInstant = false;

// ---------- helpers ----------

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

let toastTimer = 0;
function toast(msg) {
  if (!toastEl) return;
  toastEl.textContent = msg;
  toastEl.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('on'), 2200);
}

/** Meta for the active pack (index entry), tolerant of a missing catalog. */
function activeMeta(id) {
  return state.index.find((m) => m.id === id) || state.index[0] || null;
}

/** Ensure pack JSON is in memory (download if needed). Idempotent. */
async function ensureActivePack(meta, { withProgress = false } = {}) {
  if (!meta) return false;
  if (state.pack && state.packId === meta.id && !withProgress) return true;

  if (withProgress) {
    state.download = { id: meta.id, version: meta.version, pct: 0, busy: true };
    render();
    try {
      state.pack = await ensurePack(meta, (pct) => {
        state.download.pct = pct;
        const f = document.querySelector('.cta .f');
        const lbl = document.querySelector('.cta span');
        if (f) f.style.width = `${pct}%`;
        if (lbl) lbl.textContent = `Downloading… ${pct}%`;
      });
      state.packId = meta.id;
      state.download = { id: null, version: null, pct: 0, busy: false };
      toast('Saved. Works without Wi‑Fi now.');
      render();
      return true;
    } catch (err) {
      state.download = { id: null, version: null, pct: 0, busy: false };
      toast(err?.message || 'Download failed');
      render();
      return false;
    }
  }

  // Non-progress path: cache → network
  try {
    const already = await isDownloaded(meta.id, meta.version);
    state.pack = await ensurePack(meta);
    state.packId = meta.id;
    if (!already) toast('Saved. Works without Wi‑Fi now.');
    return true;
  } catch {
    state.pack = null;
    return false;
  }
}

// ---------- render ----------

function render() {
  applyTheme();
  applyLyricSize();
  // Overlays are screen-local: close on every re-render (navigation, etc.)
  document.getElementById('sheet')?.classList.remove('on');
  document.getElementById('jump')?.classList.remove('on');
  closeSearch();

  if (state.route.name === 'setlist') {
    view.innerHTML = renderSetlist();
  } else if (state.route.name === 'lyrics') {
    view.innerHTML = renderLyrics();
    markLyrics({ instant: pendingInstant });
    pendingInstant = false;
    syncAutoAdvance();
  } else {
    view.innerHTML = renderHome();
    syncAutoAdvance(); // clears timer when leaving lyrics
  }
}

// ---------- CTA actions ----------

async function runCta(meta) {
  if (!meta || state.download.busy) return;
  const ready = !!state.pack && state.packId === meta.id;

  if (!ready) {
    await ensureActivePack(meta, { withProgress: true });
    return;
  }

  // Ready → open first / resume
  const songs = songList(state.pack);
  if (!songs.length) {
    toast('This pack has no songs yet.');
    return;
  }
  const lastN = state.lastSong?.packId === meta.id ? state.lastSong.n : null;
  const target =
    lastN != null && songs.some((s) => Number(s?.n) === lastN)
      ? lastN
      : Number(songs[0]?.n) || 1;
  openSong(target);
  navigate(`#/song/${target}`);
}

// ---------- delegated events ----------

document.addEventListener('click', async (e) => {
  const t = e.target.closest('[data-action]');
  if (!t) return;
  const action = t.dataset.action;
  const meta = activeMeta(state.packId || state.index[0]?.id);

  switch (action) {
    case 'cta':
      e.preventDefault();
      runCta(activeMeta(t.dataset.id));
      break;

    case 'cta-setlist':
      e.preventDefault();
      if (meta) runCta(meta);
      break;

    case 'go-home':
      navigate('#/');
      break;

    case 'go-setlist':
      navigate(`#/pack/${encodeURIComponent(t.dataset.id || state.packId || '')}`);
      break;

    case 'open-song': {
      const n = Number(t.dataset.n) || 1;
      const lineIdx = t.dataset.line != null && t.dataset.line !== '' ? Number(t.dataset.line) : null;
      closeSearch();
      document.getElementById('jump')?.classList.remove('on');
      if (t.dataset.recent === '1') rememberOpened(n);
      // Ensure pack before opening lyrics
      const m = activeMeta(state.packId);
      if (m && (!state.pack || state.packId !== m.id)) {
        await ensureActivePack(m);
      }
      pendingInstant = lineIdx != null;
      openSong(n, lineIdx);
      navigate(`#/song/${n}`);
      break;
    }

    case 'open-search': {
      e.preventDefault(); // find control is an <a href="#/">; don't navigate
      // Search needs the pack in memory; load from cache if already downloaded.
      const m = activeMeta(state.packId || state.index[0]?.id);
      if (m && (!state.pack || state.packId !== m.id)) {
        await ensureActivePack(m);
      }
      openSearch();
      break;
    }

    case 'close-search':
      closeSearch();
      break;

    case 'clear-search': {
      const input = document.getElementById('q');
      if (input) input.value = '';
      setQuery('');
      input?.focus();
      break;
    }

    case 'clear-recents':
      wipeRecents();
      break;

    case 'open-jump': {
      const j = document.getElementById('jump');
      const jq = document.getElementById('jq');
      const jl = document.getElementById('jump-list');
      if (j && jl) {
        renderJumpList('');
        j.classList.add('on');
        if (jq) jq.value = '';
        // No autofocus — keyboard opens only when the user taps the field.
        // Wait a frame so the sheet is laid out, then anchor via rects
        // (offsetTop is relative to .jump, not the scroller).
        requestAnimationFrame(() => {
          const cur = jl.querySelector('.row.cur');
          if (!cur || !jl.clientHeight) return;
          const listRect = jl.getBoundingClientRect();
          const rowRect = cur.getBoundingClientRect();
          const delta = rowRect.top - listRect.top - jl.clientHeight / 3;
          jl.scrollTop = Math.max(0, jl.scrollTop + delta);
        });
      }
      break;
    }

    case 'close-jump':
      document.getElementById('jump')?.classList.remove('on');
      break;

    case 'close-jump-drag':
      document.getElementById('jump')?.classList.remove('on');
      break;

    case 'line': {
      tapLine(t.dataset.i);
      pauseAutoTemporarily();
      break;
    }

    case 'line-prev':
      stepLine(-1);
      pauseAutoTemporarily();
      break;

    case 'line-next':
      stepLine(1);
      pauseAutoTemporarily();
      break;

    case 'open-sheet':
      sheet?.classList.add('on');
      break;

    case 'close-sheet':
      sheet?.classList.remove('on');
      break;

    case 'theme-set': {
      state.theme = t.dataset.theme === 'light' ? 'light' : 'dark';
      saveSettings();
      applyTheme();
      // update aria-pressed on seg buttons
      sheet?.querySelectorAll('[data-action="theme-set"]').forEach((b) => {
        b.setAttribute('aria-pressed', String(b.dataset.theme === state.theme));
      });
      break;
    }

    case 'auto-toggle': {
      state.auto = !state.auto;
      saveSettings();
      t.setAttribute('aria-pressed', String(state.auto));
      t.textContent = state.auto ? 'On' : 'Off';
      syncAutoAdvance();
      break;
    }

    default:
      break;
  }
});

// Grab handle: tap (data-action) or drag down to close the jump sheet
let grabY = null;
document.addEventListener('pointerdown', (e) => {
  if (e.target.closest?.('.grab')) grabY = e.clientY;
});
document.addEventListener('pointerup', (e) => {
  if (grabY != null && e.clientY - grabY > 24) {
    document.getElementById('jump')?.classList.remove('on');
  }
  grabY = null;
});

// Search input (live filter) + jump-to-song filter
document.addEventListener('input', (e) => {
  if (e.target.id === 'q') {
    setQuery(e.target.value);
  }
  if (e.target.id === 'jq') {
    renderJumpList(e.target.value);
  }
  if (e.target.id === 'sz') {
    state.lyricSize = clamp(Number(e.target.value) || 30, 24, 46);
    saveSettings();
    applyLyricSize();
    markLyrics();
  }
  if (e.target.id === 'sp') {
    // Higher slider = faster (user expectation). Maps 1–10 → ~2000–200ms/line.
    state.autoSpeed = clamp(Number(e.target.value) || 5, 1, 10);
    saveSettings();
    syncAutoAdvance();
  }
});

// Enter in search opens the first hit; Escape closes overlays
document.addEventListener('keydown', (e) => {
  if (e.target.id === 'q' && e.key === 'Enter') {
    e.preventDefault();
    const first = document.querySelector('#res .row[data-action="open-song"]');
    if (first) first.click();
    else closeSearch();
  }
  if (e.target.id === 'jq' && e.key === 'Enter') {
    e.preventDefault();
    const first = document.querySelector('#jump-list .row[data-action="open-song"]');
    if (first) first.click();
  }
  if (e.key === 'Escape') {
    closeSearch();
    document.getElementById('jump')?.classList.remove('on');
    sheet?.classList.remove('on');
  }
});

/** Jump-to-song sheet list (title filter only; Cancel keeps your place). */
function renderJumpList(filter) {
  const host = document.getElementById('jump-list');
  if (!host) return;
  const q = String(filter || '').trim().toLowerCase();
  const songs = songList(state.pack);
  const rows = songs
    .map((song, i) => {
      const title = songTitle(song, i);
      if (q && !title.toLowerCase().includes(q)) return '';
      const n = Number(song?.n) || i + 1;
      const cur = n === state.song;
      return songRowHtml(song, i, {
        current: cur,
        tag: cur ? 'Now' : '',
        extra: ' data-recent="1"',
      });
    })
    .filter(Boolean)
    .join('');
  host.innerHTML = rows || `<div class="empty">No songs match.</div>`;
}

// Pause auto-advance on touch/scroll in lyrics (SPEC)
document.addEventListener(
  'touchstart',
  (e) => {
    if (e.target.closest?.('#ly')) pauseAutoTemporarily();
  },
  { passive: true }
);
document.addEventListener(
  'wheel',
  (e) => {
    if (e.target.closest?.('#ly')) pauseAutoTemporarily();
  },
  { passive: true }
);

// Re-render on lyrics-internal route events (openSong / next song)
document.addEventListener('reff:route', () => {
  if (state.route.name === 'lyrics') {
    view.innerHTML = renderLyrics();
    markLyrics({ instant: pendingInstant });
    pendingInstant = false;
    syncAutoAdvance();
  }
});

// ---------- boot ----------

async function boot() {
  loadSettings();
  applyTheme();
  applyLyricSize();

  // Sheet controls reflect settings (idempotent init)
  const sz = document.getElementById('sz');
  if (sz) sz.value = String(state.lyricSize);
  const sp = document.getElementById('sp');
  if (sp) sp.value = String(state.autoSpeed);
  const autoBtn = document.getElementById('au');
  if (autoBtn) {
    autoBtn.setAttribute('aria-pressed', String(state.auto));
    autoBtn.textContent = state.auto ? 'On' : 'Off';
  }
  sheet?.querySelectorAll('[data-action="theme-set"]').forEach((b) => {
    b.setAttribute('aria-pressed', String(b.dataset.theme === state.theme));
  });

  try {
    state.index = await loadIndex();
  } catch {
    state.index = [];
  }

  // Prefetch first pack if any version is on device (exact, else stale fallback).
  // No cache at all → wait for the user-tapped Download (first-launch UX).
  const first = state.index[0];
  if (first && (await hasCachedPack(first.id))) {
    try {
      state.pack = await ensurePack(first);
      state.packId = first.id;
    } catch {
      /* offline without usable cache — home still renders from index */
    }
  }

  onRoute(async (route) => {
    state.route = route;

    if (route.name === 'setlist') {
      const meta = activeMeta(route.params.id);
      if (meta) {
        state.packId = meta.id;
        if (!state.pack || state.packId !== meta.id) {
          await ensureActivePack(meta);
        }
      }
      render();
      return;
    }

    if (route.name === 'lyrics') {
      const meta = activeMeta(state.packId);
      if (meta && (!state.pack || state.packId !== meta.id)) {
        await ensureActivePack(meta);
      }
      const n = Number(route.params.id) || 1;
      if (state.song !== n) {
        state.song = n;
        state.line = 0;
      }
      // clamp song into pack if pack has songs
      const songs = songList(state.pack);
      if (songs.length) {
        const valid = songs.some((s) => Number(s?.n) === state.song);
        if (!valid) state.song = Number(songs[0]?.n) || 1;
      }
      render();
      return;
    }

    // home
    render();
  });
}

boot();
