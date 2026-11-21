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

// ---------- offline banner ----------

function syncOffline() {
  offlineBanner.hidden = navigator.onLine;
}
addEventListener('online', syncOffline);
addEventListener('offline', syncOffline);
syncOffline();

// ---------- views ----------

async function renderHome() {
  main.innerHTML = `<h1>Packs</h1><p class="muted">Download a pack on Wi-Fi before the show — everything works offline after that.</p><div id="pack-list"><p class="muted">Loading…</p></div>`;
  registry = await loadRegistry();
  await refreshDownloaded();

  const host = document.getElementById('pack-list');
  if (!registry.length) {
    host.innerHTML = `
      <div class="empty-state">
        <p>No packs found. If you are online, check that <code>registry.json</code> is reachable; if not, downloaded packs appear here once you have any.</p>
      </div>`;
    return;
  }

  host.innerHTML = registry
    .map((entry) => {
      const ready = downloaded.has(entry.id);
      return `
      <article class="pack-card" data-pack="${esc(entry.id)}">
        <h3>${esc(entry.name)}</h3>
        <div class="pack-meta">${esc(entry.artist)} · ${entry.songCount} songs · ${fmtSize(entry.size)} · v${esc(entry.version)}</div>
        <div class="pack-actions">
          ${badgeFor(entry)}
          ${
            ready
              ? `<button class="btn btn-primary" data-action="open" data-id="${esc(entry.id)}">Open</button>
                 <button class="btn btn-danger" data-action="delete" data-id="${esc(entry.id)}">Delete</button>`
              : `<button class="btn btn-primary" data-action="download" data-id="${esc(entry.id)}">Download</button>`
          }
        </div>
        <div class="progress" data-progress="${esc(entry.id)}" hidden><div style="width:0%"></div></div>
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
        if (progress) progress.firstElementChild.style.width = `${pct}%`;
      });
      await refreshDownloaded();
      snack('Ready for offline');
      renderHome();
    } catch (err) {
      setBadge(id, 'badge badge-failed', 'Download failed');
      if (progress) progress.hidden = true;
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
  const rec = await store.getPack(packId);
  if (!rec) {
    main.innerHTML = `<div class="empty-state"><p>This pack is not on this device.</p><a class="btn btn-primary" href="#/">Back to packs</a></div>`;
    return;
  }
  const rows = rec.songs
    .map(
      (s, i) => `
      <li>
        <button class="song-row" data-song="${esc(s.id)}">
          <span class="song-order">${i + 1}</span>
          <span>${esc(s.title)}</span>
        </button>
      </li>`
    )
    .join('');
  main.innerHTML = `
    <a class="btn" href="#/">← Packs</a>
    <h1>${esc(rec.manifest.name)}</h1>
    <p class="muted">${esc(rec.manifest.artist || '')}${rec.setlist?.event?.name ? ` · ${esc(rec.setlist.event.name)}` : ''}</p>
    <ol class="song-list">${rows}</ol>`;

  main.querySelector('.song-list').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-song]');
    if (btn) location.hash = `#/song/${encodeURIComponent(packId)}/${encodeURIComponent(btn.dataset.song)}`;
  });
}

async function renderViewer(packId, songId) {
  const rec = await store.getPack(packId);
  const song = rec?.songs.find((s) => s.id === songId);
  if (!song) {
    main.innerHTML = `<div class="empty-state"><p>Song not found in this pack.</p><a class="btn btn-primary" href="#/">Back to packs</a></div>`;
    return;
  }

  const idx = rec.songs.indexOf(song);
  const prev = rec.songs[idx - 1];
  const next = rec.songs[idx + 1];

  main.innerHTML = `
    <div class="viewer-header">
      <a class="btn" href="#/pack/${encodeURIComponent(packId)}">← ${esc(rec.manifest.name)}</a>
      <h1 class="viewer-title">${esc(song.title)}</h1>
      <p class="viewer-artist">${esc(song.artist || rec.manifest.artist || '')}</p>
      <div class="viewer-controls">
        <button class="btn" id="scroll-toggle" aria-pressed="false">Start auto-scroll</button>
        <button class="btn" id="scroll-stop" hidden>Stop</button>
        <label class="speed">Speed
          <input type="range" id="scroll-speed" min="10" max="90" value="30" aria-label="Auto-scroll speed, pixels per second">
        </label>
        <button class="btn" id="font-down" aria-label="Decrease text size">A−</button>
        <button class="btn" id="font-up" aria-label="Increase text size">A+</button>
      </div>
      <div class="btn-row" style="margin-top:0.6rem">
        ${prev ? `<button class="btn" data-goto="${esc(prev.id)}">← Previous</button>` : ''}
        ${next ? `<button class="btn" data-goto="${esc(next.id)}">Next →</button>` : ''}
      </div>
    </div>
    <div class="lyrics" id="lyrics" tabindex="0" aria-label="Lyrics for ${esc(song.title)}"></div>
    <div id="now-playing" role="status" class="muted" style="text-align:center">Now playing: ${esc(song.title)}</div>`;

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
        toggle.textContent = 'Start auto-scroll';
        stopBtn.hidden = true;
      }
    },
  });
  autoscroll.setSpeed(Number(speed.value));
  speed.addEventListener('input', () => autoscroll.setSpeed(Number(speed.value)));
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
    <form class="search-box" id="search-form" role="search">
      <input id="search-input" type="search" placeholder="Words you remember…" autocomplete="off" aria-label="Search lyrics and titles">
      <button class="btn btn-primary" type="submit">Go</button>
    </form>
    ${
      recents.length
        ? `<div class="recents" aria-label="Recent searches">${recents
            .map((q) => `<button class="chip" data-recent="${esc(q)}">${esc(q)}</button>`)
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
    resultsHost.innerHTML = `<div class="empty-state"><p>No packs downloaded yet — search works offline once a pack is on this device.</p><a class="btn btn-primary" href="#/">Get packs</a></div>`;
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
  resultsHost.innerHTML = `
    ${relaxed ? `<p class="muted">No exact matches — showing nearest songs.</p>` : ''}
    ${top
      .map(({ rec, song, matchLine }) => {
        const line = matchLine >= 0 ? song.lines[matchLine].trim() : '';
        return `
        <article class="result-card">
          <h3>${esc(song.title)}</h3>
          <div class="muted">${esc(song.artist || rec.manifest.artist || '')} · ${esc(rec.manifest.name)}</div>
          ${line && !line.startsWith('#') ? `<p class="result-line">${esc(line)}</p>` : ''}
          <button class="btn btn-primary" data-open="${esc(rec.id)}|${esc(song.id)}">Open lyrics</button>
        </article>`;
      })
      .join('')}`;

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
  if (name === 'packs') {
    packs.setAttribute('aria-current', 'page');
    searchTab.removeAttribute('aria-current');
  } else {
    searchTab.setAttribute('aria-current', 'page');
    packs.removeAttribute('aria-current');
  }
}

function route() {
  cleanupViewer?.();
  cleanupViewer = null;
  autoscroll?.destroy();
  autoscroll = null;

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
