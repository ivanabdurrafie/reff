# Research: UI, UX, and Design & Accessibility for Reff (PWA)

**Date:** November 2, 2026
**Scope note:** Findings assume **PWA only** (no native app build), **fully offline** after pack download, and **no listening/audio features** (no playback, no recognition, no microphone). Three parallel research passes: UI (visual patterns), UX (flows/interaction), Design & Accessibility (WCAG 2.2 AA + PWA platform reality).

**Research limits:** Some vendor pages (Material dark-theme blog, Apple Music Sing, Musixmatch/Smule marketing) blocked automated fetches; several claims rest on Apple HIG, web.dev, MDN, and W3C primary sources. Where evidence is thin, it is flagged.

---

## Executive summary — the decisions that matter most

1. **Auto-scroll needs a real Pause/Stop control.** Speed control alone fails WCAG 2.2.2 (Level A). This is a hard requirement, not a nice-to-have.
2. **Screen readers must not be force-fed scrolling lyrics.** Lyrics container stays `aria-live="off"`; announce only song-level changes via a polite `role="status"` region. Never line-by-line announcements on scroll.
3. **Press-and-hold can never be the only way to exit Concert Mode.** Add a large Exit control + undo/confirm, plus a timeout or simple-tap path. Hold becomes one option among several.
4. **Pure `#000`/`#FFF` is banned.** Use near-black surfaces (~`#0D0D0F`–`#1C1C1E`) and off-white text (~85–92% white) to avoid halation and glare. Concert Mode adds warm/red-shifted accents and an in-app brightness cap.
5. **Current song / current line: color plus a non-color cue** (label like "Now", icon, left rule, weight) and `aria-current="true"` in the DOM. Color alone fails WCAG 1.4.1.
6. **Cache-first rendering, always.** Never a spinner when a pack exists; never the browser's offline dino page — a branded shell with an honest "Offline — using downloaded packs" banner.
7. **"Resume last show" should be the home-screen hero** when event state exists → launch to content in 1 tap. This is what makes the 2-tap goal real.
8. **Undo over confirmation.** Setlist reordering applies immediately with a ~6s undo snackbar; modals only for destructive acts (e.g., deleting a pack).
9. **PWA platform reality:** vibration is **unsupported on iOS Safari**; Wake Lock works on iOS **16.4+** and must re-acquire on `visibilitychange`. Both need graceful degradation — never required for feedback.
10. **Install prompt only after engagement** (e.g., after first successful pack download). On iOS, no programmatic prompt exists — show Share → Add to Home Screen steps.

---

# Part 1 — UI (visual design)

## Top UI recommendations

| # | Recommendation | Applies to |
|---|---|---|
| U1 | **Current lyric line:** background band/bar + bold or left rule — color only as enhancement, never alone. | Lyrics viewer, Concert Mode |
| U2 | **Dark theme:** surfaces `#0D0D0F`–`#1C1C1E`; primary text ~85–92% white; lighter surface tones for elevation instead of shadows on black. No pure `#000`/`#FFF` (halation, harsh glare). | All screens |
| U3 | **Concert Mode palette:** warm/red-shifted accents (red preserves dark adaptation), desaturated secondary text, in-app brightness ceiling (~30–40% overlay or filter). Web apps cannot control system brightness — dim in-app. | Concert Mode |
| U4 | **Setlist layout:** semantic ordered list; sticky bottom **Prev \| Next** bar (Next ≥50% width, 48dp+); current song as a sticky banner above the list (number, title, "Now"), not just a recolored row. | Setlist mode |
| U5 | **Lyrics layout:** one column; default ≥24px (32–48px in Concert Mode); line-height 1.5–1.7 (more on dark backgrounds); stanza gaps > line gaps; verse/chorus labels as small tags (`[Verse 1]`, `[Chorus]`); measure ~45–66 characters. | Lyrics viewer |
| U6 | **Text scale:** default ~18–20pt; user stepper up to 48pt; `rem`/`em` units so system zoom works; test at 200% zoom and 320px width with no clipping. | All text |
| U7 | **Bottom nav: exactly 3 labeled destinations** (Setlist / Search / Lyrics), icon + text, active state by fill/weight not color alone. | All main screens |
| U8 | **Downloads:** determinate percent + step text for >10s; replace with a persistent static "Available offline" badge on completion; cancel allowed. Never spinner-only. | Pack manager |
| U9 | **Offline presentation:** precached app shell + slim persistent banner; skeleton → cached content; never blank screen or browser error page. | All screens |
| U10 | **Install UX:** CTA only after `beforeinstallprompt` + user engagement; dismissible and remembered; manifest `display: standalone`, dark `theme_color`/`background_color`, icons 192/512; iOS gets localized Share → Add to Home Screen steps. | Onboarding |
| U11 | **Search results:** rows ≥56–64px, song + artist two lines; fuzzy match surfaces as a single tappable "Did you mean …" row at top — never a modal. | Search |
| U12 | **Typography stack:** Latin-first (Inter/Roboto class) with `Noto Sans` fallback in the stack (preload Latin only). Bahasa Indonesia is Latin-script — no glyph work now, but the fallback avoids re-architecture later. | All text |

## Lyrics viewer — three layout options

| Approach | Description | Verdict |
|---|---|---|
| **A. Continuous scroll + auto-scroll** (current line in upper-middle third) | Matches karaoke/streaming mental model; best for screen readers; verse labels stay in flow. Risk: scroll anchoring under the thumb bar; manual scroll must suspend auto-scroll briefly. | **Recommended default** |
| **B. Paged/stanza cards** | Controlled glance size; fewer accidental scrolls in a crowd. Cons: splits lyrics (harder for "read all"), can't scan ahead. | Skip unless crowd-scrolling testing demands it |
| **C. Focus-line window (~5–7 lines, karaoke tape)** | Strongest "where am I" cue; great at very large type. Cons: can't scan ahead; accessibility risk if it's the only mode; odd without audio sync. | Offer as a Concert Mode density option ("Focus lines") |

## Anti-patterns (demo-friendly, venue-failing)

- Pure black + pure white (halation, no depth)
- Color-only current-line or current-song cue (fails 1.4.1)
- Tiny gray text below ~50% opacity (contrast collapses on dim OLED)
- Modals/tooltips over lyrics or results (fail on small screens)
- Spinner-only downloads >10s (stuck vs. slow is indistinguishable)
- Browser default offline page or white flash (kills night vision)
- Install prompt on first paint (trains dismissals)
- Top-corner-only Next button (out of thumb zone)
- Horizontal scroll or multi-column lyrics (fails reflow at 320px; users lose line return)
- Neon/vibrant accents on dark backgrounds (reads as glare — desaturate)
- Screen auto-dim mid-song without user control
- Auto-scroll without a visible Pause/Stop (fails WCAG 2.2.2)

---

# Part 2 — UX (flows and interaction)

## Top UX recommendations

| # | Recommendation | Applies to |
|---|---|---|
| X1 | **Persistent "ready for offline" badge** on every pack (Not downloaded → Downloading % → Ready → Stale/failed), visible everywhere — not a one-off toast. Readiness must be verifiable *before* leaving home. | Flow A |
| X2 | **"Resume last show" hero card** on launch when pack + recent event exist → one tap into Concert Mode with setlist pre-marked. Fallback: search. | All flows; Flow B entry |
| X3 | **Cache-first always:** render lyrics/setlist from Cache/IndexedDB first; network only for optional metadata. Never make users "wait for the network to fail." | Flows B, C |
| X4 | **Branded in-app offline/missing-pack fallback** — distinguish "offline but pack exists" from "no pack for this artist" with different copy and actions (local search / download when online / go online). Auto-retry on `online` event. Never the browser dino. | Flows A/B/C |
| X5 | **Current song:** color + "Now" label/icon + `aria-current="true"`; next-2 preview labeled "Up next." | Flow B |
| X6 | **Undo over confirmation** for Next/Prev and re-marking current: immediate apply + ~6s snackbar ("Moved to 'Song X' · Undo"). Modals only for destructive acts. | Flow B |
| X7 | **Press-and-hold = one exit option, never the only one.** Visible progress ring; activate on up-event so users can cancel by sliding off (WCAG 2.5.2); provide a large Exit with confirm/undo, timeout unlock, Esc on desktop. | Concert Mode |
| X8 | **Concert Mode controls ≥44–48px, bottom thumb zone, ≥4–8px apart.** No top-corner-only primary actions. | Flow B |
| X9 | **Wake Lock with visible status chip** ("Screen stays on"), manual off switch, re-acquire on `visibilitychange`, calm inline message on rejection (power-save). Never hold wake lock for downloads. | Flow B |
| X10 | **Search results show the matched lyric line** with query terms emphasized; rank exact phrase > all words > fuzzy. Zero results → relaxed "near matches," not a dead end. Results offer both "Open lyrics" and "Mark as current in setlist." | Flow C + F15 |
| X11 | **Download UX:** percent + bytes, "continue in background" reassurance, auto-resume on reopen, retry that doesn't restart from zero, storage-quota warning via `navigator.storage.estimate()`. | Flow A |
| X12 | **PWA install after engagement** (post first download / second visit); platform-aware; never on first paint. | Flow A / retention |

## Flow-level fixes

### Flow A — Prepare before the concert (online)
- Add explicit terminal state: checkmark + "Works with no signal" — then the badge persists.
- Add failure/interrupted state with Resume and a reason (storage full? went offline mid-download).
- Show pack size + quota check before download.
- Defer install prompt until after first successful download.
- Add "pack stale" concept: label "tour pack updated [date]," refresh when online.

### Flow B — At the concert (offline)
- **2-tap goal breaks unless Concert Mode is the launch target** — persist last mode; hero Resume card; Concert Mode ≤1 tap from home when event state exists.
- Out-of-order marking = 1 tap on the row + undo snackbar, not a form.
- Haptic on Next must be paired with a **visual** confirm (row transition) — deaf/HoH users and iOS (no vibration API) need it.
- After auto-follow, allow free scroll + a small sticky **"Return to current line"** button — users must not lose their place.
- Next-2 preview rows: tappable (1-tap jump) but visually secondary to prevent accidental skips.
- **Missing: "End show" state** — after the last song, offer End show → normal mode + release wake lock. Otherwise the screen stays awake all night.
- Wake Lock rejection needs inline handling (rec X9).

### Flow C — Forgot the title (offline)
- Empty state: "No matches in downloaded pack" + broaden-suggestions; if offline with no pack, say so explicitly.
- Search index must be pre-built as part of pack download — search never touches the network.
- Show 2–3 recent queries on search focus (cuts typing in the dark).
- With the microphone banned, fuzzy match + recent chips are the load-bearing substitute for voice — compensate accordingly.

## Open UX questions (recommended defaults)

| Question | Recommended default |
|---|---|
| Voice search: allow opt-in or keep mic ban absolute? | **Keep the ban** (venue noise/privacy are real). Document the cost: Flow C is the biggest beneficiary. Compensate with strong fuzzy match + recent queries; revisit if search abandonment is high in testing. |
| Concert Mode auto-enter by date/location, or manual? | **Manual + smart suggestion** ("Tonight's show? → Concert Mode"). Auto-locking a dark UI without consent risks trapping users. |
| Current-song marker: local or synced? | **Local only** — offline-first, no sync in scope. Pack order is source of truth; user corrects divergence. |
| Encore / show over? | **"End show" action** after last song → normal mode + release wake lock. |
| Pack granularity: per-artist or per-event? | **Per-artist tour pack** (one download covers multiple dates; setlist is an event-specific overlay). Less re-download churn. |
| Undo snackbar duration? | **6 seconds, visible** — users glance back slowly in a venue. Never under 4s. |
| "Add missing song" writes to pack or local? | **Local overlay only** (no write-back offline). |
| Install prompt language? | Localized, platform-specific (iOS Share steps vs. Android install button). |

---

# Part 3 — Design & Accessibility

## Requirements (with WCAG criteria)

| # | Requirement | Criterion |
|---|---|---|
| A1 | **Auto-scroll: visible Pause + Stop (and Resume), reachable, keyboard-operable, not focus-gated.** Speed control alone does not comply. Manual scroll always available. | **2.2.2 Pause/Stop/Hide (A)** — SCR33, G186, F16 |
| A2 | **`prefers-reduced-motion`:** disable smooth easing (jump instead), default auto-scroll OFF, kill decorative motion (pulse, parallax, entrance anims). User may opt in deliberately afterward. | 2.3.3 (AAA, treat as product req) + defense in depth for 2.2.2 — C39/SCR40 |
| A3 | **Screen readers:** lyrics container `aria-live="off"`; no focus movement on scroll/highlight; song-level announcements only ("Now playing: {title}") via pre-existing `role="status"` (polite, atomic) — never `alert`, never line-by-line. Debounce. | 4.1.3 Status Messages (AA); MDN aria-live; ARIA22/ARIA19; APG Alert |
| A4 | **Contrast:** default dark theme ≥4.5:1 normal / ≥3:1 large + UI indicators; high-contrast theme ≥7:1 normal text (AAA body). Large = ≥18pt/24px or ≥14pt bold. Lyrics at 16pt are *normal* text (4.5:1). Ratios not rounded. | 1.4.3 (AA), 1.4.11 (3:1 UI/graphics) |
| A5 | **Current song/line: non-color cue** (label/icon/weight/rule) with 3:1 contrast as a graphic; `aria-current="true"` in DOM. | 1.4.1 (A), 1.4.11, 1.3.1, 4.1.2 |
| A6 | **Targets: ≥24×24 CSS px floor with spacing; design at 48×48.** Any drag control (speed slider) also needs ± buttons or presets. Long-press never the sole path. | 2.5.8 (A); 2.5.5 (AAA 44×44 aspirational); 2.5.1; 2.5.7 |
| A7 | **Reflow/resize:** single column at 320 CSS px (400% zoom), no 2D lyric scroll; `rem`/`em` type (no `vw`, no hard `html{font-size:16px}`); survives 1.4.12 spacing overrides (line-height ≥1.5×, letter-spacing ≥0.12×, word-spacing ≥0.16×) without clipping. | 1.4.10, 1.4.4, 1.4.12 (all AA) |
| A8 | **Sticky chrome must not fully hide focus:** `scroll-padding-top/bottom`; consider un-fixing bars at 320px; focus ring ≥3:1. | 2.4.11 (AA), C43; 2.4.7; 1.4.11 |
| A9 | **Concert Mode exits (layered, all required):** (1) large Exit ≥48×48 with confirm/undo; (2) optional timeout auto-unlock (adjustable/off); (3) simple non-hold path (double-tap confirm, menu, Esc/back); (4) hold only as *one* method with progress + cancel. | 2.1.1 (A) — gesture-only fails F54; 2.5.1; 2.2.1 informs timer design; 2.5.8 |
| A10 | **"Reading comfort" mode, not a dyslexia cure:** optional spacing preset (line-height ≥1.5, letter-spacing ≤~0.12–0.2em), OpenDyslexic as opt-in only, line length 40–80 chars, no efficacy claims. Research does *not* support OpenDyslexic as superior once spacing/x-height are controlled. | 1.4.12 tolerance; McLeish 2007 / Zorzi 2012 in WCAG understanding doc |
| A11 | **Structure:** one `h1` per screen; setlist as real `ol/ul` with song buttons; search result counts announced politely; download progress via `role="status"`/progressbar without focus theft; DOM order = visual order. | 1.3.1, 1.3.2, 2.4.1, 2.4.3, 4.1.2, 4.1.3 |
| A12 | **Dark venue dimming:** near-black (not `#000`) + off-white (not `#FFF`); in-app brightness dimmer (PWAs can't touch system brightness); honor `prefers-contrast: more` → 7:1 theme; honor `prefers-color-scheme` as default. Keep lyrics large — small dark-mode text is harder at night. | 1.4.3/1.4.11 still apply (luminance-based); Apple HIG dark mode; web.dev; NN/g |

## PRD claims that must change (PWA reality check)

| PRD claim | Verdict | Amendment |
|---|---|---|
| Vibration on Next (F23) | **Wrong on iOS** — Vibration API unsupported in all Safari; no-op elsewhere; suppressed in silent mode | "Haptics where supported (Android browsers); never required — always pair with visual/status cue." |
| Screen awake in Concert Mode (F10) | **OK with caveats** — Wake Lock: Safari/iOS 16.4+, Chrome 84+, Firefox 126+; HTTPS only; auto-releases on hide; UA may deny (power-save) | "Best-effort wake lock with feature detection; visible status chip; re-acquire on `visibilitychange`; fallback message." |
| Press-and-hold to leave (F22) | **Risky as sole mechanism** — fails motor/cognitive users and keyboard access | Hold = optional; add large Exit + confirm/undo, timeout unlock, Esc/back path (see A9). |
| "7:1 in high-contrast theme" | OK if scoped | Body lyrics 7:1; large text ≥4.5:1 at AAA; UI components ≥3:1 even in high-contrast. Don't conflate with "WCAG AA" (AA is 4.5:1). |
| Auto-scroll with speed control (F8) | **Incomplete** | Speed ≠ pause. Add Pause/Stop per 2.2.2 (A1). |
| Dyslexia-friendly font (§10) | **Risky as a fix** | Rename to "reading comfort mode" (spacing-first, font opt-in, no efficacy claims) — A10. |
| 48dp targets | Fine as design goal | AA floor is 24×24 CSS px (2.5.8); 44×44 is AAA (2.5.5). Keep 48 internal; don't imply WCAG requires it. |
| App install size <25 MB; F-Droid / Play / App Store / APK (§9, §16.7) | **Obsolete under PWA scope** | Replace with: app-shell + assets budget (target e.g. <1–2 MB first load, precache budget), distribution = URL + install-to-homescreen; drop store channels. |
| "Last 4 major OS versions" (§9) | **Wrong axis for web** | Replace with browser matrix: current + previous major of Chrome/Edge/Firefox/Safari (iOS 16.4+ for wake lock; document iOS limits). |
| Voice input for search (F19) | **Already contradicts mic ban** — and scope now excludes listening features | **Remove F19.** Document fuzzy match + recent queries as the substitute. |
| Cold start <2s / memory <150 MB | Partially applicable | Cold start → time-to-interactive for the PWA shell (still meaningful). Drop or re-scope memory as a dev guideline, not a shipped metric. |
| Battery <8%/hr Concert Mode | Unverified, likely aggressive with screen on | Keep as a stretch target only after a prototype spike; screen-on drain dominates. |
| Screen readers: "VoiceOver and TalkBack" | OK, scope it | Web on iOS = VoiceOver + WebKit; Android = TalkBack + Chrome; add desktop NVDA/VoiceOver if desktop is claimed. Automated tools can't verify announcement quality — manual pass required. |
| "Interface in English and Bahasa Indonesia" | OK | Add `lang` handling per content language (3.1.1/3.1.2) so screen readers switch voices. |

## Pre-release accessibility test checklist

1. **2.2.2:** Auto-scroll starts → Pause and Stop visible, ≥24×24, keyboard-operable, actually stop movement >5s; pause survives focus change.
2. **Reduce motion:** OS reduce-motion on → instant scroll, auto-scroll defaults off, no pulse/parallax; deliberate opt-in still possible.
3. **Contrast:** Automated (axe color-contrast) + spot-check on both themes × all screens: 4.5:1 body, 7:1 high-contrast theme, 3:1 icons/markers/focus rings.
4. **Color-only:** Screenshot setlist in grayscale — current song still identifiable; DOM has `aria-current`.
5. **Reflow:** 320px width + 200% text zoom — one column, no horizontal lyric scroll, no clipping; apply 1.4.12 spacing overrides — no overlap/truncation.
6. **Targets:** Next/Prev, pause, speed, exit, search hits fit 24×24; spacing exception holds; design review vs. 48×48 goal.
7. **Focus:** Tab through all screens — focus never fully hidden behind sticky bars (`scroll-padding`); no traps; Esc closes overlays.
8. **SR song change:** VoiceOver (iOS Safari) + TalkBack (Android Chrome): one polite announcement per song; lyrics NOT announced on every scroll line.
9. **SR status:** Pack download progress/complete/fail announced via `role="status"` without focus theft; status container exists in DOM before update.
10. **Concert Mode exit:** Alternate large Exit exists; timeout/undo path works; Esc works on desktop; vibration cues always have visual twins; iOS vibrate no-ops cleanly.
11. **Wake lock:** On HTTPS enter Concert Mode → lock acquires; background/foreground re-acquires; unsupported browser shows fallback message instead of throwing.
12. **CI + manual:** axe-core in CI (0 critical; remember axe finds ~57% of issues) + Lighthouse a11y smoke; monthly manual NVDA+Firefox (Windows), VoiceOver+Safari (iOS), TalkBack+Chrome (Android) covering items 1–11.

---

# Consolidated PRD amendments (beyond the table above)

From the original PRD review + these three research passes, scoped to your direction (PWA, offline, no listening):

**Delete / drop**
- F19 (voice input) — contradicts mic ban; out of scope.
- Native app distribution channels (F-Droid, Play, App Store, APK) — PWA ships via URL.
- Store-oriented metrics: install size <25 MB → replace with shell/precaching budget; memory <150 MB → dev guideline.

**Add (Must)**
- A1–A12 accessibility requirements (especially: auto-scroll Pause/Stop, `aria-live="off"` lyrics, layered Concert Mode exits, non-color cues).
- Persistent pack readiness badge; branded offline/missing-pack fallback states (no browser error pages).
- Cache-first rendering; search index pre-built at pack download time.
- "Resume last show" hero; "End show" action (release wake lock).
- Undo snackbar pattern (≈6s) for setlist changes; modals only for destructive actions.
- Wake Lock: feature-detected, visible status, re-acquire on visibility; haptics: progressive enhancement with visual fallback.
- `rem`-based type scale, 320px reflow, 200% zoom support.

**Fix**
- F8: add Pause/Stop (speed control is not enough).
- F22: press-and-hold becomes one of several exits.
- F23: haptics = best-effort, Android-only in practice, never sole feedback.
- F10: wake lock = best-effort with degradation path.
- §10 "dyslexia-friendly font" → "reading comfort mode."
- §10 text sizes: use sp/dynamic-type language → on web: `rem` + system font scaling.
- §13 metrics: define "time to lyrics" from *tap*, not app open; fix 30-day return metric for episodic concert attendance; add offline-render (no spinner) as a measurable goal.
- §11 Flows: add first-run/no-pack, download-failure, no-setlist-for-tonight, and end-of-show flows.
- Battery target: validate with spike before committing.

**Open product questions (defaults proposed above)**
Voice search ban · Concert Mode entry (manual + suggestion) · local vs. synced current-song marker · End-show state · pack granularity (artist pack + event setlist overlay) · undo duration · local overlay for added songs · install prompt localization.

---

## Sources (key)

**WCAG / W3C:** [2.2.2 Pause/Stop/Hide](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html) · [1.4.1 Use of Color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html) · [1.4.3 Contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) · [1.4.10 Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) · [1.4.12 Text Spacing](https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html) · [2.4.11 Focus Not Obscured](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html) · [2.5.1 Pointer Gestures](https://www.w3.org/WAI/WCAG22/Understanding/pointer-gestures.html) · [2.5.2 Pointer Cancellation](https://www.w3.org/WAI/WCAG22/Understanding/pointer-cancellation.html) · [2.5.7 Dragging](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html) · [2.5.8 Target Size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) · [4.1.3 Status Messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html) · [Techniques SCR33/G186/F16](https://www.w3.org/WAI/WCAG22/Techniques/#pause-stop-hide) · [C43 scroll-padding](https://www.w3.org/WAI/WCAG22/Techniques/css/C43) · [ARIA22 role=status](https://www.w3.org/WAI/WCAG22/Techniques/aria/ARIA22)

**PWA / offline:** [Offline Cookbook](https://web.dev/articles/offline-cookbook) · [Offline fallback](https://web.dev/articles/offline-fallback-page) · [PWA checklist](https://web.dev/articles/pwa-checklist) · [Promote install](https://web.dev/articles/promote-install) · [Learn PWA: installation](https://web.dev/learn/pwa/installation/) · [Learn PWA: serving](https://web.dev/learn/pwa/serving) · [beforeinstallprompt (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeinstallprompt_event) · [Web App Manifest (MDN)](https://developer.mozilla.org/en-US/docs/Web/Manifest)

**Platform:** [Screen Wake Lock (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API) · [caniuse wake-lock (iOS 16.4+)](https://caniuse.com/wake-lock) · [WebKit Safari 16.4 notes](https://webkit.org/blog/13900/webkit-features-in-safari-16-4/) · [Vibration API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Vibration_API) · [caniuse vibration (Safari: no)](https://caniuse.com/vibration)

**Design guidance:** [Apple HIG Dark Mode](https://developer.apple.com/design/human-interface-guidelines/dark-mode) · [Apple HIG Typography](https://developer.apple.com/design/human-interface-guidelines/typography) · [Apple HIG Gestures](https://developer.apple.com/design/human-interface-guidelines/gestures) · [web.dev prefers-color-scheme](https://web.dev/articles/prefers-color-scheme) · [web.dev prefers-reduced-motion](https://web.dev/articles/prefers-reduced-motion) · [NN/g Touch Target Size](https://www.nngroup.com/articles/touch-target-size/) · [NN/g Progress Indicators](https://www.nngroup.com/articles/progress-indicators/) · [NN/g Dark Mode](https://www.nngroup.com/articles/dark-mode/) · [NN/g Heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/) · [Material 3 Navigation Bar](https://m3.material.io/components/navigation-bar/guidelines) · [Fitts's law](https://en.wikipedia.org/wiki/Fitts's_law) · [Night vision (dark adaptation)](https://en.wikipedia.org/wiki/Night_vision)

**Gig-app reference patterns:** [setlist.fm](https://www.setlist.fm/) · [Songkick](https://www.songkick.com/)

**Testing:** [axe-core](https://github.com/dequelabs/axe-core) · [W3C Easy Checks](https://www.w3.org/WAI/test-evaluate/preliminary/) · [WebAIM NVDA](https://webaim.org/articles/nvda/) · [WebAIM keyboard testing](https://webaim.org/techniques/keyboard/) · [A11y Project Checklist](https://www.a11yproject.com/checklist/)

**Evidence caveats:** No normative W3C "karaoke live-region" pattern exists — A3 synthesizes MDN live-region guidance + 4.1.3 + APG caution. OpenDyslexic efficacy claims are unsupported by the research line cited in WCAG 1.4.12's understanding doc. Dark-venue pure-black guidance rests on Apple HIG practice (Material blog page unavailable at fetch time). Recommend a manual device pass (real iPhone + Android in a dark room) before locking palette and wake-lock copy.
