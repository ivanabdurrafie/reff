// Single state object + settings persistence (localStorage, try/catch).
// All writes are idempotent: same values, no side effects on re-run.

const KEY = 'reff.settings.v1';

export const state = {
  route: { name: 'home', params: {} },
  index: [],           // packs/index.json catalog
  pack: null,          // full pack JSON once loaded
  packId: null,        // active pack id
  download: { id: null, version: null, pct: 0, busy: false },
  song: 0,             // current song n (order number)
  line: 0,             // raw index into song.lines
  search: { open: false, q: '' },
  // settings (persisted)
  lyricSize: 30,
  theme: 'dark',       // 'dark' | 'light'
  auto: false,
  autoSpeed: 5, // 1–10, higher = faster (~2000ms → ~200ms per line)
  lastSong: null,      // { packId, n } | null
  recent: [],          // recent opened song ids (n), newest first
};

function safeGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode / quota — settings just do not stick */
  }
}

export function loadSettings() {
  const raw = safeGet(KEY);
  if (!raw) return;
  try {
    const s = JSON.parse(raw);
    if (Number.isFinite(s.lyricSize)) state.lyricSize = clamp(s.lyricSize, 24, 46);
    if (s.theme === 'light' || s.theme === 'dark') state.theme = s.theme;
    if (typeof s.auto === 'boolean') state.auto = s.auto;
    if (Number.isFinite(s.autoSpeed)) state.autoSpeed = clamp(s.autoSpeed, 1, 10);
    else if (Number.isFinite(s.autoSec)) state.autoSpeed = clamp(Math.round(2000 / s.autoSec), 1, 10);
    if (s.lastSong && s.lastSong.packId) {
      state.lastSong = { packId: String(s.lastSong.packId), n: Number(s.lastSong.n) || 0 };
    }
    if (Array.isArray(s.recent)) {
      // Song ids only (numbers). Old string queries are dropped.
      state.recent = s.recent
        .map((x) => Number(x))
        .filter((x) => Number.isFinite(x) && x > 0)
        .slice(0, 5);
    }
  } catch {
    /* corrupt payload — keep defaults */
  }
}

export function saveSettings() {
  safeSet(
    KEY,
    JSON.stringify({
      lyricSize: state.lyricSize,
      theme: state.theme,
      auto: state.auto,
      autoSpeed: state.autoSpeed,
      lastSong: state.lastSong,
      recent: state.recent,
    })
  );
}

/** Persist a song id when the user opens it from search results (not keystrokes). */
export function pushRecentSong(songN) {
  const id = Number(songN);
  if (!Number.isFinite(id) || id <= 0) return;
  state.recent = [id, ...state.recent.filter((x) => x !== id)].slice(0, 5);
  saveSettings();
}

export function clearRecents() {
  state.recent = [];
  saveSettings();
}

export function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

export function applyTheme() {
  document.documentElement.classList.toggle('light', state.theme === 'light');
}

export function applyLyricSize() {
  document.documentElement.style.setProperty('--lyric-size', `${state.lyricSize}px`);
}
