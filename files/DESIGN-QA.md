# Design QA: every UI change must pass this before you say "done"

Why this exists: code that merely renders is not the same as UI a human perceives as precise.
Edges, centres and icon weights are judged by eye, so they have to be MEASURED and LOOKED AT.

## Workflow (mandatory)
1. Build or change the screen.
2. Run `node tools/ui-check.mjs` (screenshots at 390x844 @2x + automated measurements).
3. OPEN the screenshots in ui-shots/ and look at them. Zoom into the header, the controls and any icon.
4. Fix every finding and anything you can see, then repeat from step 2.
5. In your final message list: what you checked, what you changed, what is still imperfect.
Never reply "looks good" without having viewed the screenshots.

## Markup hooks the checker reads
- `data-center`  on the header title (must be centred on the SCREEN, +-1px)
- `data-row`     on any row of controls (children must share one centre line, +-1px)
- `data-edge`    on every element that should share the screen's left gutter (+-1px)
- `data-contrast` on text that must pass contrast (>= 4.5:1 normal, >= 7:1 lyrics)

## Rules (all measurable)
1. One gutter: `--gutter: 20px`. Header, titles, cards, lists, buttons, control bar and lyrics use it.
2. Header = CSS grid `1fr auto 1fr`. `justify-content: space-between` puts the title off-centre when the
   left and right groups differ in width. Do not use it for centred titles.
3. Icons are inline SVG (22px, 2px stroke, round caps) inside a 44x44 button, centred by `display:grid;
   place-items:center`. Never use text glyphs as icons (‹ › ⌕ ▾ ✓ ♪): their metrics differ per font and sit off-centre.
4. Optical alignment: the *visible ink* aligns with the gutter, not the 44px box.
   The right-most header icon gets `margin-right: -11px`; the back chevron gets a matching negative left margin.
5. Controls on one row share a height, or are centred on one line. Heights: 44 secondary, 56 primary.
6. Radii: inner = outer - padding (never below 0). Tokens: card 18, button 16, control 12, pill 999.
7. Serif (Bodoni) only at >= 24px, letter-spacing 0, weight 700. Its hairlines disappear on dark below that.
   Small titles (header, rows) use Inter 600.
8. Lyrics: wrapped lines get a hanging indent so they read as one line; stanza gap = one line;
   past lines 30% opacity, upcoming 65%, current 100%; the current line always sits ~33% down
   (top and bottom spacers); the scroller fades at its edges so nothing is hard-cut by the control bar.
9. Lists: fixed number column with tabular-nums, number baseline-aligned to the FIRST title line,
   no status mark that is true for every row (show it once), current row = tint + bar + "Now"/"Resume" tag.
10. Never show the same text twice on one screen (e.g. venue in title and subtitle).
11. Colours only from design-tokens.css. One red.
12. Tap targets >= 44x44, body text >= 15px, lyrics >= 24px.
