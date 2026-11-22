# Build order (give Claude Code one task at a time)
1. Scaffold: index.html + css/ + js/ ES modules, hash router, design tokens, self-hosted subset fonts. No build step.
2. Data: load a pack JSON, render Setlist from it. Run tools/parse-lyrics.mjs to build packs.
3. Lyrics screen: sections, line focus, ball, Next/Back, Reff-only, size, theme, Wake Lock.
4. Home: ticket + state-aware CTA, status pill, Continue/Next up.
5. Search overlay (in-memory filter).
6. PWA: manifest, icons, service worker, pack download + cache, versioned update prompt, storage.persist().
7. Auto-advance (optional), then a small label editor for unlabelled lyrics.
8. GitHub Actions deploy to Pages (relative paths, hash routing).
Each task: match reference/reff-final.html, then run the acceptance checks in SPEC.md.
