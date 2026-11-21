# Reff — Phase 1 prototype

Offline-first PWA for concert sing-along lyrics. This is the Phase 1 scaffold from the PRD (`../PRD Concert Sing-Along (Offline Lyrics Finder).md`): pack download, offline lyrics viewer, offline text search.

## Run

No build step — `public/` is the site root.

```bash
cd app
python -m http.server 8080 -d public
# open http://localhost:8080
```

Service worker and IndexedDB need localhost or HTTPS.

## Build packs

Converts a source folder in `../packs/<folder>/` (manifest.json, setlist.json, songs/*.txt) into a single-file pack plus registry entry:

```bash
node tools/build-pack.mjs            # all folders
node tools/build-pack.mjs demo-mcr-black-parade-2026
```

Outputs `public/packs/<folder>.json` and updates `public/registry.json`.

## Test

```bash
node tools/build-pack.mjs && node tools/test-search.mjs
```

## Layout notes (lyric viewer)

Typography and focus hierarchy follow the [Mochy Music](https://github.com/realidkroo/Mochy-Music) lyric screen: 1.25 line-height ratio, single font weight for all lines (focus changes never reflow line breaks), focus via opacity + `transform: scale(1.06)`, viewport headroom so the focused line sits mid-screen. The rest-opacity floor is raised to 0.75 (Mochy uses 0.24–0.5) to hold WCAG AA on near-black.

## Scope

**In this scaffold (PRD Phase 1):** pack registry/download/delete with status badges, song list, lyrics viewer with auto-scroll (visible Pause/Stop, manual-scroll suspend, speed control, A−/A+ font scale), offline fuzzy search with relaxed fallback, service-worker shell precache, offline banner, recent queries.

**Not yet (PRD Phase 2+):** setlist mode, Concert Mode + wake lock, install prompt, delta pack updates, line sync, translation/romanization, i18n (EN/ID), personal .txt/.lrc import, white-label.

## Licensing

Demo pack ships with placeholder lyric files only — no copyrighted lyrics in the repo (PRD §16). Packs must state their own license and rights holder before appearing in any public registry.
