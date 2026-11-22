// Pack catalog + download/cache. All operations idempotent:
// re-download of an already-cached pack is a no-op; cache writes are UPSERTs.

const PACK_CACHE = 'reff-packs-v1';

function packUrl(id, version) {
  return `packs/${encodeURIComponent(id)}/${encodeURIComponent(version)}.json`;
}

async function openPackCache() {
  if (!('caches' in globalThis)) return null;
  try {
    return await caches.open(PACK_CACHE);
  } catch {
    return null;
  }
}

/** Load packs/index.json (catalog). Safe to call repeatedly. */
export async function loadIndex() {
  const res = await fetch('./packs/index.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error(`index HTTP ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/** Compare dotted versions numerically (1.0.10 > 1.0.9). */
function cmpVersion(a, b) {
  const pa = String(a).split('.').map((n) => Number(n) || 0);
  const pb = String(b).split('.').map((n) => Number(n) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return d;
  }
  return 0;
}

/** Any version of this pack in Cache Storage (highest version wins). */
async function matchAnyCachedPack(id) {
  const cache = await openPackCache();
  if (!cache) return null;
  const base = new URL(`packs/${encodeURIComponent(id)}/`, location.href).href;
  let best = null;
  let bestV = '';
  for (const req of await cache.keys()) {
    if (!req.url.startsWith(base) || !req.url.endsWith('.json')) continue;
    const v = req.url.slice(base.length, -'.json'.length);
    if (!best || cmpVersion(v, bestV) > 0) {
      best = req;
      bestV = v;
    }
  }
  if (!best) return null;
  const hit = await cache.match(best);
  return hit || null;
}

/** True if any version of this pack is already on the device. */
export async function hasCachedPack(id) {
  return !!(await matchAnyCachedPack(id));
}

/**
 * Ensure a pack is on the device (fetch → Cache Storage).
 * Order: exact version cache → network exact → any cached version (stale OK).
 * Idempotent: if already cached, resolves immediately with the cached body.
 * @param {{id:string, version:string, size?:number}} meta
 * @param {(pct:number)=>void} [onProgress] 0–100, only during a real network fetch
 */
export async function ensurePack(meta, onProgress) {
  const url = packUrl(meta.id, meta.version);
  const cache = await openPackCache();

  if (cache) {
    const hit = await cache.match(url);
    if (hit) {
      onProgress?.(100);
      return hit.json();
    }
  }

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`pack HTTP ${res.status}`);

    const total = Number(res.headers.get('content-length')) || meta.size || 0;
    let body;
    if (res.body && total > 0 && onProgress) {
      const reader = res.body.getReader();
      const chunks = [];
      let loaded = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        loaded += value.length;
        onProgress(Math.min(100, Math.round((loaded / total) * 100)));
      }
      const buf = new Uint8Array(loaded);
      let off = 0;
      for (const c of chunks) {
        buf.set(c, off);
        off += c.length;
      }
      body = buf;
      onProgress(100);
    } else {
      body = await res.arrayBuffer();
      onProgress?.(100);
    }

    // Cache the bytes (idempotent put). Reuse the original Response when possible.
    if (cache) {
      const packed = new Response(body, {
        headers: { 'content-type': 'application/json' },
      });
      await cache.put(url, packed);
    }

    // Best-effort persistence so the pack survives storage pressure.
    try {
      await navigator.storage?.persist?.();
    } catch {
      /* not supported / denied */
    }

    return JSON.parse(new TextDecoder().decode(body instanceof ArrayBuffer ? body : body));
  } catch (err) {
    // Exact version unavailable (offline / not deployed) — any cached copy beats nothing.
    const stale = await matchAnyCachedPack(meta.id);
    if (stale) {
      onProgress?.(100);
      return stale.json();
    }
    throw err;
  }
}

/** True if this exact pack id+version is already in Cache Storage. */
export async function isDownloaded(id, version) {
  const cache = await openPackCache();
  if (!cache) return false;
  return !!(await cache.match(packUrl(id, version)));
}

/**
 * Load pack JSON without forcing a download (cache first, then network).
 * Tolerates a missing/empty pack: returns null instead of throwing.
 */
export async function loadPack(id, version) {
  try {
    return await ensurePack({ id, version });
  } catch {
    return null;
  }
}

/** Defensive field access so adding songs/fields later never crashes render. */
export function songList(pack) {
  const songs = pack && Array.isArray(pack.songs) ? pack.songs : [];
  return songs;
}

export function songLines(song) {
  if (!song) return [];
  if (Array.isArray(song.lines)) return song.lines.filter((l) => typeof l === 'string');
  // Alternate shapes (sections) are ignored by design — sections are out of scope.
  if (Array.isArray(song.sections)) {
    return song.sections.flatMap((s) => (Array.isArray(s?.lines) ? s.lines : []));
  }
  return [];
}

export function songTitle(song, fallbackIndex) {
  if (song && typeof song.title === 'string' && song.title.trim()) return song.title.trim();
  return `Song ${fallbackIndex + 1}`;
}

export function findSongByN(pack, n) {
  const songs = songList(pack);
  const i = songs.findIndex((s) => Number(s?.n) === Number(n));
  if (i >= 0) return { song: songs[i], index: i };
  // Tolerate missing/renumbered n: clamp into range by position.
  const idx = Math.min(Math.max(0, Number(n) - 1), Math.max(0, songs.length - 1));
  return songs.length ? { song: songs[idx], index: idx } : null;
}

export function fmtSize(bytes) {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
