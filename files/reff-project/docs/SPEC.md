# Reff: product spec

**Purpose:** a pocket karaoke screen for concerts, for people who DON'T know the lyrics.
**Test for every screen:** can a first-timer join the Reff within 10 seconds, one-handed, in the dark?
**Reference prototype:** `reference/reff-final.html` (open in a browser; copy layout, flow, copy and behaviour).

## Flow
Home -> Setlist -> Lyrics. Search is an overlay from Home. No tab bar.
Back: Lyrics -> Setlist -> Home.

## Screens
### Home ("Tonight")
- Header: "Reff" wordmark (Bodoni 700 28px) + status pill ("Offline ready" / amber "Not saved").
- First launch hint: "Download before the show. Everything works offline after that." + iOS install hint.
- Hero ticket (bone card): date, artist (serif 32px), pack, venue, ONE red CTA (56px).
  CTA by state: `Download · 57 KB` -> progress fill -> `Start singing` -> `Resume song N`.
  Ticket stub (dashed divider with notches): Songs / Size / Version.
- Mid-show: "Continue" row. Ready: "Next up" (3 songs) + "See full setlist".
- Pill search field at the bottom opens full-screen search.

### Search (overlay)
Live filter, matched text in red, clear button, Cancel, "Recent" when empty. Result tap opens the song.

### Setlist
Back to Home, serif pack title, venue + count, red CTA (Start singing / Resume), numbered rows (>=56px),
current song = red left bar, per-song offline check, "lyrics missing" flag.

### Lyrics (most important)
- Header: Back, one-line title, "Song N of M · <current section>", Aa. 4px red progress bar at top.
- Lyrics: Inter 600, default 30px (20-46), line-height 1.3, left aligned, 20px padding.
  Current line opacity 1, others .4, red 16px bouncing ball at the left of the current line
  (respect prefers-reduced-motion). Current line sits ~33% down the screen. Tap a line to jump.
- Section labels: bold 14px divider labels; Reff labels red. `name:null` = no label (see LYRICS-FORMAT.md).
- Reff lines +15% size, bold; "Everyone sings" pill on the first line of each Reff.
- Controls (all >= 44pt): Back line, big red Next line (-> Next song on the last line), Reff-only toggle,
  text link "Next song · <title>".
- Aa sheet: Size slider, Dark/Light, Auto-advance (OFF by default, 2-8 s/line; pause on touch/scroll).
- Keep screen awake (Wake Lock, re-request on visibilitychange). No toasts or overlays on this screen.

## Not in scope
Glow mode (removed), audio listening/synced lyrics, accounts, push/background sync.

## Acceptance
- Works fully offline after the pack is downloaded (airplane-mode test).
- Lyrics with zero labels still look clean.
- Contrast: bone on ink >= 7:1. Touch targets >= 44pt. VoiceOver labels on icon buttons.
- Lighthouse PWA installable; no layout jump with iOS safe areas.
