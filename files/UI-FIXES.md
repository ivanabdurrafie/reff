# Known defects in the current build (measured from screenshots, approximate) and the fixes

| Screen | Defect | Fix |
|---|---|---|
| Lyrics header | Title "Cancer" sits ~12px (2x) left of screen centre: left group is narrower than right group with space-between | Grid `1fr auto 1fr` |
| Lyrics header | Search icon sits ~3px lower than "Setlist" and "Aa"; icon is a text glyph, thinner than the labels | SVG icons in 44px buttons, one centre line |
| Lyrics control bar | Buttons start ~12px left of the lyrics/header edge | Bar uses `padding: 0 var(--gutter)` |
| Lyrics control bar | "Prev" is cramped (~11px side padding), chevron is a text glyph | min-width 64px, SVG chevron |
| Lyrics | Wrapped lines ("drink", "faded") look like separate lines; stanza gaps vary (24px vs 28px) | Hanging indent; one stanza gap |
| Lyrics | Last visible line is hard-cut by the control bar | Edge fade mask on the scroller |
| Lyrics | First line is stuck at the top, others sit lower | Top and bottom spacers (33vh) |
| Lyrics | Upcoming lines are only slightly dimmer than past lines | 65% upcoming, 30% past |
| Setlist | Back link and search button are ~7px off the same centre line | `data-row` + grid header |
| Setlist | Venue appears twice (title and subtitle); title is 2 lines of serif | Title = artist, subtitle = venue only |
| Setlist | Check mark on all 26 rows is noise | Remove; show "All saved offline" once |
| Setlist | Current row marked only by a thin bar overlapping the border | Tint + bar + "Resume" tag, clipped by the list radius |
| Setlist | Number is centred on the row, so it floats beside 2-line titles | Align to first title line |
| Home | Search circle (44) and status pill (36) differ in height | Same centre line, pill 36 / circle 44 on one `data-row` |
| Home | Bodoni hairlines are thin and widely spaced on the small header title | Serif only >= 24px, letter-spacing 0 |

## CSS to apply
```css
:root{--gutter:20px}
.hdr{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;min-height:52px;padding:0 var(--gutter)}
.hdr>:first-child{justify-self:start}
.hdr>:last-child{justify-self:end;display:flex;align-items:center;gap:4px}
.icon-btn{width:44px;height:44px;display:grid;place-items:center;border:0;background:none;color:inherit;border-radius:50%}
.icon-btn svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.hdr>:last-child .icon-btn:last-child{margin-right:-11px}
.hdr .title{font:600 17px/1.2 var(--sans)}

.ly{flex:1;overflow-y:auto;padding:0 var(--gutter);
  -webkit-mask-image:linear-gradient(to bottom,transparent 0,#000 24px,#000 calc(100% - 40px),transparent 100%);
  mask-image:linear-gradient(to bottom,transparent 0,#000 24px,#000 calc(100% - 40px),transparent 100%)}
.ly::before,.ly::after{content:"";display:block;height:33vh}
.line{display:block;padding:6px 0 6px calc(28px + .7em);text-indent:-.7em;line-height:1.3;opacity:.65}
.line.past{opacity:.3}.line.on{opacity:1}
.stanza-gap{height:1.3em}

.ctrl{display:flex;gap:12px;padding:12px var(--gutter) calc(12px + env(safe-area-inset-bottom))}
.ctrl .prev{min-width:64px;height:56px}.ctrl .next{flex:1;height:56px}

.row{display:grid;grid-template-columns:28px 1fr auto;column-gap:14px;align-items:start;padding:16px;min-height:56px;font:500 17px/24px var(--sans)}
.row .n{font-variant-numeric:tabular-nums;color:var(--ash)}
.list{border:1px solid var(--soot);border-radius:var(--r-card);overflow:hidden}
.row.cur{background:rgba(200,16,46,.12);box-shadow:inset 3px 0 0 var(--red)}
```
