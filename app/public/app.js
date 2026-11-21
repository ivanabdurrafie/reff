// Reff app shell: hash router, pack home, song list, search.
import { loadRegistry, listDownloaded, downloadPack, store } from './packs.js';
import { search } from './search.js';
import { renderLyrics, createAutoScroll, applyFontScale, getFontScale, setFontScale } from './viewer.js';

const main = document.getElementById('main');
const snackbarEl = document.getElementById('snackbar');
const offlineBanner = document.getElementById('offline-banner');

let registry = [];
let downloaded = new Map();
let autoscroll = null;
let cleanupViewer = null;

// One icon set, one stroke width, 24 viewBox: the back affordance. The
// destination stays the label, so the control reads on its own.
const CHEVRON = `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m15 18-6-6 6-6"/></svg>`;

applyFontScale();

// ---------- helpers ----------

function esc(s) {
  const div = document.createElement('div');
  div.textContent = String(s ?? '');
  return div.innerHTML;
}

let snackTimer = 0;
function snack(message) {
  snackbarEl.textContent = message;
  snackbarEl.hidden = false;
  clearTimeout(snackTimer);
  snackTimer = setTimeout(() => {
    snackbarEl.hidden = true;
  }, 4000);
}

function fmtSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function badgeFor(entry) {
  const rec = downloaded.get(entry.id);
  if (rec) {
    return `<span class="badge badge-ready" data-badge="${esc(entry.id)}">Ready for offline</span>`;
  }
  return `<span class="badge" data-badge="${esc(entry.id)}">Not downloaded</span>`;
}

function setBadge(id, cls, text) {
  const el = document.querySelector(`[data-badge="${CSS.escape(id)}"]`);
  if (!el) return;
  el.className = `badge ${cls}`;
  el.textContent = text;
}

async function refreshDownloaded() {
  downloaded = await listDownloaded();
}

// R-27: a storage read that fails says what broke and offers the way back,
// instead of leaving a skeleton on screen or the previous screen in place.
function renderError(host, message, retry) {
  host.innerHTML = `
    <div class="empty-state" role="alert">
      <p>${esc(message)}</p>
      <button class="btn button button-fill btn-primary" type="button" data-retry>Try again</button>
    </div>`;
  host.querySelector('[data-retry]')?.addEventListener('click', retry);
}

// ---------- offline banner ----------

function syncOffline() {
  offlineBanner.hidden = navigator.onLine;
}
addEventListener('online', syncOffline);
addEventListener('offline', syncOffline);
syncOffline();

// ---------- views ----------

async function renderHome() {
  main.innerHTML = `
    <div class="masthead">
      <h1 class="wordmark">Reff</h1>
      <p class="lede">Download on Wi-Fi before the show. Everything works offline after that.</p>
    </div>
    <div id="pack-list">
      <span class="visually-hidden" role="status">Loading packs</span>
      <ol class="skeleton" aria-hidden="true"><li></li><li></li><li></li></ol>
    </div>`;
  registry = await loadRegistry();
  const host = document.getElementById('pack-list');
  try {
    await refreshDownloaded();
  } catch {
    renderError(host, 'This device could not read the packs it has stored.', () => renderHome());
    return;
  }

  if (!registry.length) {
    host.innerHTML = `
      <div class="empty-state">
        <p>${
          navigator.onLine
            ? 'The catalog has no packs right now. Packs you download will show up here.'
            : 'You are offline and no packs are on this device. Connect once to browse packs.'
        }</p>
      </div>`;
    return;
  }

  host.innerHTML = registry
    .map((entry) => {
      const ready = downloaded.has(entry.id);
      const display = entry.artist || entry.name;
      const sub = entry.artist ? entry.name : '';
      return `
      <article class="pack" data-pack="${esc(entry.id)}">
        <div class="ticket-main">
          <h2 class="pack-artist">${esc(display)}</h2>
          ${sub ? `<p class="pack-name">${esc(sub)}</p>` : ''}
          <div class="pack-actions">
            ${badgeFor(entry)}
            ${
              ready
                ? `<button class="btn button button-fill btn-primary" data-action="open" data-id="${esc(entry.id)}">Open</button>
                   <button class="btn button btn-danger" data-action="delete" data-id="${esc(entry.id)}">Delete</button>`
                : `<button class="btn button button-fill btn-primary" data-action="download" data-id="${esc(entry.id)}">Download</button>`
            }
          </div>
          <div class="progress" data-progress="${esc(entry.id)}" hidden><div></div></div>
        </div>
        <div class="ticket-stub">
          <p class="stub-label">Admit one</p>
          <dl class="pack-facts">
            <div class="fact"><dt>Songs</dt><dd>${esc(entry.songCount)}</dd></div>
            <div class="fact"><dt>Size</dt><dd>${esc(fmtSize(entry.size))}</dd></div>
            <div class="fact"><dt>Version</dt><dd>v${esc(entry.version)}</dd></div>
          </dl>
        </div>
      </article>`;
    })
    .join('');

  host.addEventListener('click', onPackAction);
}

async function onPackAction(e) {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const { action, id } = btn.dataset;
  const entry = registry.find((p) => p.id === id);
  if (!entry) return;

  if (action === 'open') {
    location.hash = `#/pack/${encodeURIComponent(id)}`;
    return;
  }

  if (action === 'download') {
    btn.disabled = true;
    setBadge(id, 'badge badge-downloading', 'Downloading 0%');
    const progress = document.querySelector(`[data-progress="${CSS.escape(id)}"]`);
    if (progress) progress.hidden = false;
    try {
      await downloadPack(entry, (pct) => {
        setBadge(id, 'badge badge-downloading', `Downloading ${pct}%`);
        // transform, not width: the bar animates without transitioning a
        // layout property (Floor 10a).
        if (progress) progress.firstElementChild.style.transform = `scaleX(${pct / 100})`;
      });
      await refreshDownloaded();
      snack('Ready for offline');
      renderHome();
    } catch (err) {
      setBadge(id, 'badge badge-failed', 'Download failed');
      if (progress) {
        progress.hidden = true;
        progress.firstElementChild.style.transform = 'scaleX(0)';
      }
      snack(err?.message || 'Download failed');
      btn.disabled = false;
    }
    return;
  }

  if (action === 'delete') {
    // Two-tap destructive confirm (PRD F36: modal confirm for destructive actions).
    if (btn.dataset.confirm !== '1') {
      btn.dataset.confirm = '1';
      btn.textContent = 'Confirm delete?';
      setTimeout(() => {
        if (btn.dataset.confirm === '1') {
          btn.dataset.confirm = '0';
          btn.textContent = 'Delete';
        }
      }, 4000);
      return;
    }
    await store.deletePack(id);
    await refreshDownloaded();
    snack('Pack deleted');
    renderHome();
  }
}

async function renderSongList(packId) {
  main.innerHTML = `
    <span class="visually-hidden" role="status">Loading songs</span>
    <ol class="skeleton" aria-hidden="true"><li></li><li></li><li></li><li></li></ol>`;
  let rec;
  try {
    rec = await store.getPack(packId);
  } catch {
    renderError(main, 'This device could not read that pack.', () => renderSongList(packId));
    return;
  }
  if (!rec) {
    main.innerHTML = `<div class="empty-state"><p>This pack is not on this device.</p><a class="btn button button-fill btn-primary" href="#/">Back to packs</a></div>`;
    return;
  }
  const rows = rec.songs
    .map(
      (s, i) => `
      <li>
        <button class="song-row" data-song="${esc(s.id)}">
          <span class="song-order">${String(i + 1).padStart(2, '0')}</span>
          <span class="song-title">${esc(s.title)}</span>
        </button>
      </li>`
    )
    .join('');
  const head = [rec.manifest.artist, rec.setlist?.event?.name].filter(Boolean).join(', ');
  main.innerHTML = `
    <a class="btn button btn-back" href="#/">${CHEVRON}<span>Packs</span></a>
    <header class="program-head">
      <h1>${esc(rec.manifest.name)}</h1>
      ${head ? `<p class="muted">${esc(head)}</p>` : ''}
    </header>
    <ol class="song-list sheet">${rows}</ol>`;

  main.querySelector('.song-list').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-song]');
    if (btn) location.hash = `#/song/${encodeURIComponent(packId)}/${encodeURIComponent(btn.dataset.song)}`;
  });
}

async function renderViewer(packId, songId) {
  let rec;
  try {
    rec = await store.getPack(packId);
  } catch {
    renderError(main, 'This device could not read that pack.', () => renderViewer(packId, songId));
    return;
  }
  if (!rec) {
    main.innerHTML = `<div class="empty-state"><p>This pack is not on this device.</p><a class="btn button button-fill btn-primary" href="#/">Back to packs</a></div>`;
    return;
  }
  const song = rec.songs.find((s) => s.id === songId);
  if (!song) {
    main.innerHTML = `<div class="empty-state"><p>Song not found in this pack.</p><a class="btn button button-fill btn-primary" href="#/">Back to packs</a></div>`;
    return;
  }

  const idx = rec.songs.indexOf(song);
  const prev = rec.songs[idx - 1];
  const next = rec.songs[idx + 1];

  // Top: minimal context (back + title). Bottom: transport in the thumb zone
  // (research X8; the research doc flags top-corner Prev/Next as an anti-pattern).
  main.innerHTML = `
    <header class="viewer-header">
      <a class="btn button btn-back" href="#/pack/${encodeURIComponent(packId)}">${CHEVRON}<span>${esc(rec.manifest.name)}</span></a>
      <h1 class="viewer-title">${esc(song.title)}</h1>
      <p class="viewer-artist">${esc(song.artist || rec.manifest.artist || '')}</p>
    </header>
    <div class="lyrics" id="lyrics" tabindex="0" aria-label="Lyrics for ${esc(song.title)}"></div>
    <div id="now-playing" role="status" class="muted">Now playing: ${esc(song.title)}</div>
    <div class="transport">
      <div class="transport-row">
        ${prev ? `<button class="btn button" data-goto="${esc(prev.id)}">Prev</button>` : ''}
        <button class="btn button button-fill btn-primary" id="scroll-toggle" aria-pressed="false">Start</button>
        <button class="btn button" id="scroll-stop" hidden>Stop</button>
        ${next ? `<button class="btn button" data-goto="${esc(next.id)}">Next</button>` : ''}
      </div>
      <div class="transport-row transport-adjust">
        <button class="btn button" id="font-down" aria-label="Decrease text size">A−</button>
        <button class="btn button" id="font-up" aria-label="Increase text size">A+</button>
        <div class="speed" role="group" aria-label="Auto-scroll speed">
          <span aria-hidden="true">Speed</span>
          <button class="btn button btn-mini" id="speed-down" aria-label="Decrease auto-scroll speed">−</button>
          <input type="range" id="scroll-speed" min="10" max="90" step="5" value="30" aria-label="Auto-scroll speed, pixels per second">
          <button class="btn button btn-mini" id="speed-up" aria-label="Increase auto-scroll speed">+</button>
        </div>
      </div>
    </div>`;

  const scroller = document.getElementById('lyrics');
  cleanupViewer = renderLyrics(scroller, song);

  const toggle = document.getElementById('scroll-toggle');
  const stopBtn = document.getElementById('scroll-stop');
  const speed = document.getElementById('scroll-speed');

  autoscroll?.destroy();
  autoscroll = createAutoScroll(scroller, {
    onStateChange(state) {
      toggle.setAttribute('aria-pressed', String(state === 'running'));
      if (state === 'running') {
        toggle.textContent = 'Pause';
        stopBtn.hidden = false;
      } else if (state === 'paused') {
        toggle.textContent = 'Resume';
        stopBtn.hidden = false;
      } else {
        toggle.textContent = 'Start';
        stopBtn.hidden = true;
      }
    },
  });
  autoscroll.setSpeed(Number(speed.value));
  speed.addEventListener('input', () => autoscroll.setSpeed(Number(speed.value)));
  // ± steppers: the slider alone is a drag control (research A6 needs a non-drag path)
  const bumpSpeed = (delta) => {
    speed.value = String(Math.min(90, Math.max(10, Number(speed.value) + delta)));
    speed.dispatchEvent(new Event('input'));
  };
  document.getElementById('speed-down').addEventListener('click', () => bumpSpeed(-5));
  document.getElementById('speed-up').addEventListener('click', () => bumpSpeed(5));
  toggle.addEventListener('click', () => {
    const st = autoscroll.getState();
    if (st === 'running') autoscroll.pause();
    else autoscroll.start(); // start or resume
  });
  stopBtn.addEventListener('click', () => autoscroll.stop());

  document.getElementById('font-down').addEventListener('click', () => setFontScale(getFontScale() - 0.1));
  document.getElementById('font-up').addEventListener('click', () => setFontScale(getFontScale() + 0.1));

  main.querySelectorAll('[data-goto]').forEach((b) =>
    b.addEventListener('click', () => {
      location.hash = `#/song/${encodeURIComponent(packId)}/${encodeURIComponent(b.dataset.goto)}`;
    })
  );

  scroller.focus({ preventScroll: true });
}

function recentQueries() {
  try {
    return JSON.parse(localStorage.getItem('reff.recent') || '[]');
  } catch {
    return [];
  }
}

function pushRecent(q) {
  const list = [q, ...recentQueries().filter((x) => x !== q)].slice(0, 3);
  localStorage.setItem('reff.recent', JSON.stringify(list));
}

function renderSearch() {
  const recents = recentQueries();
  main.innerHTML = `
    <h1>Search</h1>
    <form class="search-box searchbar searchbar-inline" id="search-form" role="search">
      <div class="searchbar-inner">
        <div class="searchbar-input-wrap">
          <input id="search-input" type="search" placeholder="Words you remember…" autocomplete="off" aria-label="Search lyrics and titles">
        </div>
        <button class="btn button button-fill btn-primary" type="submit">Search</button>
      </div>
    </form>
    ${
      recents.length
        ? `<div class="recents" aria-label="Recent searches">${recents
            .map((q) => `<button class="chip button" data-recent="${esc(q)}">${esc(q)}</button>`)
            .join('')}</div>`
        : ''
    }
    <div id="search-results" aria-live="polite"></div>`;

  const form = document.getElementById('search-form');
  const input = document.getElementById('search-input');
  const results = document.getElementById('search-results');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    runSearch(input.value, results);
  });

  main.querySelector('.recents')?.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-recent]');
    if (chip) {
      input.value = chip.dataset.recent;
      runSearch(input.value, results);
    }
  });
}

async function runSearch(query, resultsHost) {
  const q = query.trim();
  if (!q) return;
  pushRecent(q);
  await refreshDownloaded();

  if (!downloaded.size) {
    resultsHost.innerHTML = `<div class="empty-state"><p>Search works offline once a pack is on this device.</p><a class="btn button button-fill btn-primary" href="#/">Get a pack</a></div>`;
    return;
  }

  let hits = [];
  let relaxed = false;
  for (const rec of downloaded.values()) {
    for (const hit of search(rec.index || [], q)) {
      hits.push({ rec, ...hit });
    }
  }
  hits.sort((a, b) => b.score - a.score);
  if (!hits.length) {
    // F37: zero-result state offers relaxed near-matches, not a dead end.
    relaxed = true;
    for (const rec of downloaded.values()) {
      for (const hit of search(rec.index || [], q, { relaxed: true })) {
        hits.push({ rec, ...hit });
      }
    }
    hits.sort((a, b) => b.score - a.score);
  }

  if (!hits.length) {
    resultsHost.innerHTML = `<div class="empty-state"><p>No matches in downloaded packs. Try fewer or different words.</p></div>`;
    return;
  }

  const top = hits.slice(0, 20);
  // Rows, not cards: song + artist two lines, matched line third, whole row
  // tappable (research U11: rows >= 64px, never a modal, single tappable hit).
  resultsHost.innerHTML = `
    ${relaxed ? `<p class="muted">No exact matches. Showing the nearest songs.</p>` : ''}
    <ol class="result-list">
    ${top
      .map(({ rec, song, matchLine }) => {
        const line = matchLine >= 0 ? song.lines[matchLine].trim() : '';
        return `
      <li>
        <button class="result-row" data-open="${esc(rec.id)}|${esc(song.id)}">
          <span class="result-title">${esc(song.title)}</span>
          <span class="result-meta">${esc(
            [song.artist || rec.manifest.artist || '', rec.manifest.name].filter(Boolean).join(', ')
          )}</span>
          ${line && !line.startsWith('#') ? `<span class="result-line">${esc(line)}</span>` : ''}
        </button>
      </li>`;
      })
      .join('')}
    </ol>`;

  resultsHost.querySelectorAll('[data-open]').forEach((btn) =>
    btn.addEventListener('click', () => {
      const [packId, songId] = btn.dataset.open.split('|');
      location.hash = `#/song/${encodeURIComponent(packId)}/${encodeURIComponent(songId)}`;
    })
  );
}

// ---------- router ----------

function setActiveTab(name) {
  const packs = document.getElementById('tab-packs');
  const searchTab = document.getElementById('tab-search');
  // aria-current for assistive tech, tab-link-active for the kit's own styling
  const set = (el, on) => {
    if (on) {
      el.setAttribute('aria-current', 'page');
      el.classList.add('tab-link-active');
    } else {
      el.removeAttribute('aria-current');
      el.classList.remove('tab-link-active');
    }
  };
  set(packs, name === 'packs');
  set(searchTab, name === 'search');
}

function route() {
  cleanupViewer?.();
  cleanupViewer = null;
  autoscroll?.destroy();
  autoscroll = null;
  // New screen starts at the top (hash navigation keeps the old scroll position)
  window.scrollTo({ top: 0, behavior: 'instant' });

  const hash = location.hash || '#/';
  const parts = hash.slice(2).split('/').filter(Boolean);

  if (parts[0] === 'pack' && parts[1]) {
    setActiveTab('packs');
    renderSongList(decodeURIComponent(parts[1]));
  } else if (parts[0] === 'song' && parts[1] && parts[2]) {
    setActiveTab('packs');
    renderViewer(decodeURIComponent(parts[1]), decodeURIComponent(parts[2]));
  } else if (parts[0] === 'search') {
    setActiveTab('search');
    renderSearch();
  } else {
    setActiveTab('packs');
    renderHome();
  }
}

addEventListener('hashchange', route);
route();
