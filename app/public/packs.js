// Pack registry, download, and offline status.
import * as db from './db.js';
import { buildIndex } from './search.js';

const REGISTRY_CACHE_KEY = 'reff.registry';

export async function loadRegistry() {
  try {
    const res = await fetch('./registry.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error(`registry ${res.status}`);
    const data = await res.json();
    localStorage.setItem(REGISTRY_CACHE_KEY, JSON.stringify(data));
    return data.packs || [];
  } catch {
    // Offline: fall back to last known registry so downloaded packs stay reachable.
    try {
      return JSON.parse(localStorage.getItem(REGISTRY_CACHE_KEY) || '{"packs":[]}').packs || [];
    } catch {
      return [];
    }
  }
}

export async function listDownloaded() {
  const records = await db.getAllPacks();
  return new Map(records.map((r) => [r.id, r]));
}

export async function downloadPack(entry, onProgress) {
  // Surface a storage-quota problem before fetching (PRD F3).
  if (navigator.storage?.estimate && entry.size) {
    const { usage = 0, quota = 0 } = await navigator.storage.estimate();
    if (quota && usage + entry.size > quota) {
      throw new Error('Not enough storage space on this device. Delete a pack and try again.');
    }
  }

  const res = await fetch(entry.url);
  if (!res.ok) throw new Error(`Download failed (HTTP ${res.status})`);

  const total = Number(res.headers.get('content-length')) || 0;
  let text;
  if (res.body && total) {
    const reader = res.body.getReader();
    const chunks = [];
    let loaded = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      loaded += value.length;
      onProgress?.(Math.min(99, Math.round((loaded / total) * 100)));
    }
    const buf = new Uint8Array(loaded);
    let off = 0;
    for (const c of chunks) {
      buf.set(c, off);
      off += c.length;
    }
    text = new TextDecoder().decode(buf);
  } else {
    text = await res.text();
  }
  onProgress?.(100);

  const pack = JSON.parse(text);
  if (!pack.manifest?.packId || !Array.isArray(pack.songs)) {
    throw new Error('Invalid pack file.');
  }

  const record = {
    id: pack.manifest.packId,
    version: pack.manifest.version,
    manifest: pack.manifest,
    setlist: pack.setlist || null,
    songs: pack.songs,
    index: buildIndex(pack.songs),
    downloadedAt: Date.now(),
  };
  await db.putPack(record);
  return record;
}

export { db as store };
