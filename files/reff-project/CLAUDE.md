# Reff

Offline-first PWA lyrics companion for concerts. Read `docs/SPEC.md` first, then
`docs/LYRICS-FORMAT.md`. Visual and behavioural reference: `reference/reff-final.html`.

## Stack and rules
- Plain HTML, CSS and vanilla JavaScript (ES modules). No framework, no bundler, no npm runtime dependencies.
  The repo root is deployable as-is to GitHub Pages. Shell under ~50 KB gzip.
- Structure:
  index.html, manifest.webmanifest, sw.js, css/(tokens.css, app.css), js/(app.js, router.js, store.js,
  packs.js, home.js, setlist.js, lyrics.js, search.js), packs/<id>/<version>.json, icons/, fonts/.
- Render screens with small template functions that return HTML strings (as in reference/reff-final.html);
  one `render()` per screen, state in a single `state` object, events via delegation.
- Hash routing (#/, #/pack/:id, #/song/:id) so GitHub Pages never 404s. Use relative paths and a configurable base.
- Colours and type only from `docs/design-tokens.css`. Red is the only accent, one primary action per screen.
- Fonts: Bodoni Moda (titles) + Inter (everything else), self-hosted woff2, font-display: swap.
- Mobile first at 375px; safe-area insets; targets >= 44pt; respect prefers-reduced-motion.
- Packs are JSON (see `data/sample-pack.json`), cached by the service worker per version.
- Never commit real copyrighted lyrics. Use placeholder text; real packs are added by the owner.
- Settings (size, theme, last song) in localStorage; wrap storage calls in try/catch.

## Commands
Dev: `npx serve .` (or `python3 -m http.server`); service workers need http://localhost or HTTPS.
node tools/parse-lyrics.mjs song.txt > song.json

## Definition of done
Matches the reference prototype, passes SPEC acceptance, works offline, no console errors.
