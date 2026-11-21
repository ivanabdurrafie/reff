#!/usr/bin/env node
// Build single-file pack JSON (public/packs/<folder>.json) + upsert registry.json
// from a packs/<folder>/ source folder (manifest.json, setlist.json, songs/*.txt).
// Usage: node tools/build-pack.mjs [folderId]   (no arg = all folders)
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const packsSrc = join(appRoot, '..', 'packs');
const outDir = join(appRoot, 'public', 'packs');
const registryPath = join(appRoot, 'public', 'registry.json');

const slug = (name) =>
  name.replace(/\.txt$/i, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

function parseSong(raw) {
  let body = raw;
  const fm = raw.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
  if (fm) body = raw.slice(fm[0].length);
  const title = raw.match(/^title:\s*(.+)$/m)?.[1]?.trim();
  return { title, lyrics: body.trim() };
}

async function build(folderId) {
  const dir = join(packsSrc, folderId);
  const manifest = JSON.parse(await readFile(join(dir, 'manifest.json'), 'utf8'));
  let setlist = null;
  try {
    setlist = JSON.parse(await readFile(join(dir, 'setlist.json'), 'utf8'));
  } catch { /* setlist optional */ }

  const files = (await readdir(join(dir, 'songs'))).filter((f) => f.endsWith('.txt')).sort();
  const songs = await Promise.all(
    files.map(async (f) => {
      const { title, lyrics } = parseSong(await readFile(join(dir, 'songs', f), 'utf8'));
      return { id: slug(f), title: title || slug(f), artist: manifest.artist || '', lyrics };
    })
  );

  // Order by setlist when present; append any songs not listed.
  let ordered = songs;
  if (setlist?.songs?.length) {
    const byId = new Map(songs.map((s) => [s.id, s]));
    const seen = new Set();
    ordered = setlist.songs
      .map((e) => {
        const id = slug((e.file || '').split('/').pop() || e.title || '');
        if (seen.has(id)) return null;
        seen.add(id);
        const fromFile = byId.get(id);
        if (!fromFile) return { id, title: e.title, artist: manifest.artist || '', lyrics: '' };
        // File had no `title:` header (title fell back to the filename slug):
        // the setlist's real title wins.
        if (e.title && fromFile.title === id) fromFile.title = e.title;
        return fromFile;
      })
      .filter(Boolean);
    ordered.push(...songs.filter((s) => !seen.has(s.id)));
  }

  const pack = { manifest, setlist, songs: ordered };
  await mkdir(outDir, { recursive: true });
  const outFile = join(outDir, `${folderId}.json`);
  const json = JSON.stringify(pack);
  await writeFile(outFile, json);

  // Upsert registry entry
  let registry = { packs: [] };
  try {
    registry = JSON.parse(await readFile(registryPath, 'utf8'));
  } catch { /* first run */ }
  const entry = {
    id: manifest.packId,
    version: manifest.version,
    name: manifest.name,
    artist: manifest.artist || '',
    url: `./packs/${folderId}.json`,
    size: Buffer.byteLength(json),
    songCount: ordered.length,
  };
  registry.packs = [...registry.packs.filter((p) => p.id !== entry.id), entry].sort((a, b) =>
    a.name.localeCompare(b.name)
  );
  await writeFile(registryPath, JSON.stringify(registry, null, 2) + '\n');

  console.log(`built ${folderId}: ${ordered.length} songs, ${entry.size} bytes -> public/packs/${folderId}.json`);
  return entry;
}

const arg = process.argv[2];
const folders = arg ? [arg] : (await readdir(packsSrc, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name);
if (!folders.length) {
  console.error('no pack folders found in', packsSrc);
  process.exit(1);
}
const entries = [];
for (const f of folders) entries.push(await build(f));
const total = entries.reduce((n, e) => n + e.size, 0);
console.log(`registry: ${entries.length} pack(s), ${total} bytes total`);
