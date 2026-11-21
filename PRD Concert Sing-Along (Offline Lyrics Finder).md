# PRD: Reff (Offline Lyrics and Setlist App for Concerts)

**Status:** Draft v0.4  
**Owner:** Product  
**Date:** November 2, 2026  
**Scope:** Installable **PWA** only (no native app build in v1). Fully offline after pack download. No audio playback, recognition, or microphone input.

## 1. Summary

Reff (from "refrain", the part everyone sings together) is a lightweight, open-source progressive web app that helps people sing along at live concerts. It shows lyrics even when the internet is very bad or fully offline. It can also help the user find a song when they forgot the title, by following the concert setlist or by searching with a few words they remember. The app is designed with accessibility first: large text, high contrast, screen reader support, and simple one-handed use.

## 2. Problem

At concerts, a user often wants to sing along but does not know the lyrics. Three things make this hard:

- **Bad connection.** Crowded venues have weak mobile signal, so searching for lyrics online is slow or fails.
- **Forgotten title.** The user knows the melody or a few words, but not the song name, so they cannot search.
- **Hard to use in the moment.** It is dark, loud, and crowded. Phones with bright screens and tiny text are difficult to use, and the user does not want to miss the show.

## 3. Goals

1. Show correct lyrics for a song within **5 seconds**, with **no internet** needed.
2. Help the user find a song they cannot name, using the setlist or a few remembered words, offline.
3. Keep the app **small and fast**, with low battery and data use.
4. Be usable by people with visual, hearing, motor, and cognitive differences.

## 4. Non-Goals (for v1)

- Not a music streaming or music player app.
- Not a social network or live chat.
- No full global song catalog offline in v1 (we use downloadable packs, see section 8).
- No video recording or sharing features. No microphone and no audio recognition: songs are found by setlist or text search.
- Not a native app in v1: distribution is a web URL plus install-to-home-screen (PWA). No app-store release.
- No audio playback or "listening" features of any kind.

## 5. Target Users

| Persona | Need |
| --- | --- |
| **Casual concert-goer** (main) | Wants to sing along to songs they half-know, without searching. |
| **International fan** | Songs are in a language they know less well, so they need lyrics (and romanization or translation later). |
| **User with low vision** | Needs very large text and high contrast, in a dark venue. |
| **Deaf or hard-of-hearing user** | Needs lyrics that follow the show so they can feel part of it (v1: visible lyrics + setlist; line sync is v2). |
| **Older or less technical user** | Needs very simple screens and few steps. |

## 6. User Stories

- As a concert-goer, I want to open the app and see lyrics quickly, so I can sing along without looking for them.
- As a concert-goer with no signal, I want everything to work offline, so poor connection does not stop me.
- As a fan who forgot the title, I want to see the concert setlist and tap the current song, so I do not need to search.
- As a fan who remembers only a few words, I want to type them and get matching songs, so I can find the right one.
- As a user with low vision, I want big, high-contrast text, so I can read in the dark.
- As a user who uses a screen reader, I want every button and lyric line to be read correctly, without the app talking over scrolling lyrics.
- As a fan before the concert, I want to download the artist's songs on Wi-Fi at home, so I am ready at the venue.
- As a returning user, I want the app to offer to resume tonight's show in one tap, so I do not navigate again in the dark.

## 7. Scope

### MVP (v1)

- **Artist / event packs:** download before the concert on Wi-Fi, then use offline. Persistent "ready for offline" state on every pack.
- **Offline lyrics viewer** with large readable text, auto-scroll with **pause/stop**, and manual scroll.
- **Setlist mode:** the pack can include the event's song order. Tap the current song, then "Next" to follow the show. Undo, not confirm, for reordering.
- **Offline text search:** type a few words from the lyrics, with typo tolerance; index pre-built at pack download.
- **Concert Mode:** dark, low-brightness, simple screen that keeps the screen awake (best-effort), with layered exit options.
- **PWA behaviors:** branded offline/missing-pack fallbacks, cache-first rendering, resume-last-show entry, install prompt only after engagement.
- **Accessibility settings** (see section 10).

### Later (v2+)

- Smart next-song suggestion, based on past setlists of the same artist.
- Setlist updates sent to the phone when the connection is good.
- Lyrics synced line by line with the song.
- Translation and romanization for non-Latin scripts.
- Optional online sync when the connection is good.

## 8. Functional Requirements

### 8.1 Packs and Offline Data

| ID | Requirement | Priority |
| --- | --- | --- |
| F1 | User can search and download a pack (artist, album, or event setlist) when online. | Must |
| F2 | Downloaded packs work 100% offline, including search and setlist. Search runs only from an index built when the pack downloads — never from the network. | Must |
| F3 | Show pack size before download and let the user pause, resume, or delete it. Surface storage quota warnings before download when space is tight. | Must |
| F4 | Download only on Wi-Fi by default (can be changed in settings). | Should |
| F5 | When online, update packs in the background with small "delta" updates. | Should |
| F6 | Suggest packs for upcoming concerts the user adds (manual date and artist). | Could |

### 8.2 Lyrics Viewer

| ID | Requirement | Priority |
| --- | --- | --- |
| F7 | Show lyrics in a clean, one-column layout with adjustable text size (relative units; system font scaling honored). | Must |
| F8 | Auto-scroll with a speed control, **visible Pause and Stop controls** (WCAG 2.2.2), and easy manual scroll. Manual scroll suspends auto-scroll until the user resumes. Speed control alone is not sufficient. | Must |
| F9 | Highlight the current section (verse, chorus) when sync data exists. | Should |
| F10 | Best-effort screen wake lock in Concert Mode: feature-detected (HTTPS; iOS 16.4+), visible on/off status chip, re-acquire on tab visibility change, calm fallback message when denied or unsupported. Never hold wake lock for downloads. | Must |

### 8.3 Setlist Mode (offline)

| ID | Requirement | Priority |
| --- | --- | --- |
| F11 | Show the setlist as a big list, with the current song marked. Open any song in **one tap**. | Must |
| F12 | A big Next button moves to the next song in the setlist. A Previous button goes back. | Must |
| F13 | The user can tap any song to mark it as the current one, so the list follows the band even when the order changes. | Must |
| F14 | Show the next 2 songs as a preview. The user can also create or edit their own setlist before the show. | Must |
| F15 | If a song is not in the setlist, offer text search and let the user add it to the list. | Must |

### 8.4 Text Search (offline)

| ID | Requirement | Priority |
| --- | --- | --- |
| F16 | Search by any lyric words, and by title or artist, across downloaded packs. | Must |
| F17 | Tolerate typos and misheard words (fuzzy matching). | Must |
| F18 | Show the matching lyric line in the result so the user can confirm the song. Results offer **Open lyrics** and **Mark as current in setlist**. | Must |

### 8.5 Concert Mode

| ID | Requirement | Priority |
| --- | --- | --- |
| F20 | Very dark theme, low brightness (in-app dimmer), no bright flashes. Near-black surfaces and off-white text — never pure `#000`/`#FFF`. | Must |
| F21 | Only 3 main actions on screen: Setlist, Search, Current lyrics. | Must |
| F22 | Guard against accidental touches. Press-and-hold to leave may exist but **must never be the only exit**: also provide a large explicit Exit control (confirm or undo), a simple non-hold path (e.g. double-tap confirm or Back/Esc), and an optional idle-timeout unlock. | Must |
| F23 | Optional vibration on Next where the platform supports it (not on iOS Safari). **Never the only feedback** — always pair with a visible cue (e.g. row transition). | Should |

### 8.6 PWA Experience and Live-Show UX

| ID | Requirement | Priority |
| --- | --- | --- |
| F32 | Persistent pack status badge everywhere (Not downloaded → Downloading % → Ready for offline → Stale/failed), not only during download. | Must |
| F33 | Render from local cache first; **no spinner when a pack exists**. Branded offline and missing-pack fallbacks (never the browser error page): distinguish "offline but pack present" from "no pack for this artist," with clear next actions; auto-retry when the connection returns. | Must |
| F34 | On launch, when a pack and recent event exist, show a **Resume last show** hero card → one tap into Concert Mode with setlist pre-marked. | Must |
| F35 | After the last setlist song (or via an explicit **End show** action): return to normal mode and release the wake lock. | Must |
| F36 | Setlist changes (Next, Prev, re-mark current) apply immediately with an undo snackbar (~6 seconds). Modal confirm only for destructive actions (e.g. deleting a pack). Pair with visual feedback so deaf/HoH users get equivalent confirmation. | Must |
| F37 | Search: show 2–3 recent queries on focus; zero-result state offers relaxed near-matches, not a dead end. | Should |
| F38 | Install-to-home-screen prompt only after engagement (e.g. after first successful pack download); dismissible and remembered. On iOS, show localized Share → Add to Home Screen steps (no programmatic prompt exists). | Should |

## 9. Non-Functional Requirements

### Lightweight

- App shell and static assets: **under 2 MB** first load (not counting packs). Keep precache budget small.
- Typical pack: **under 2 MB per artist** (compressed text only).
- Time to interactive for the shell: **under 2 seconds** on a mid-range phone from 3 years ago.
- Battery: less than **8% per hour** in Concert Mode with the screen on — **stretch target; validate with a prototype spike before committing** (screen-on drain dominates).
- Runtime memory: guideline under **150 MB** while running (dev target, not a store metric).
- Browser support: current and previous major versions of Chrome, Edge, Firefox, and Safari. **iOS 16.4+** required for Wake Lock; document iOS limits (no Vibration API) in-product where relevant.

### Offline

- No network call is needed for any core feature after a pack is downloaded.
- The app must never freeze or show long spinners while waiting for a network; when a pack exists, content is on screen from cache immediately.
- All user settings and history are stored on the device.

### Privacy

- The app does not use the microphone and does **not** record or upload any audio.
- No account needed. No ads. No tracking by default.

## 10. Accessibility Requirements

Target: **WCAG 2.2 AA** at minimum. Full requirement detail and test checklist: `Research UI-UX-Accessibility (Reff PWA).md`.

| Area | Requirement |
| --- | --- |
| **Text size** | Lyrics text from 16 pt up to at least 48 pt, in `rem`/`em` so browser zoom and system font scaling work. Usable at 320 CSS px width and 200% text zoom with no clipping or horizontal scroll of lines. |
| **Contrast** | At least 4.5:1 for normal text and 3:1 for large text and UI indicators in the default dark theme; 7:1 for normal body text in the high-contrast theme (UI components still ≥3:1). Themes: dark, light, high contrast. Honor `prefers-contrast` and `prefers-color-scheme`. |
| **Auto-scroll** | Visible Pause and Stop (and Resume) as soon as auto-scroll starts; keyboard-operable; not focus-gated. `prefers-reduced-motion`: no smooth easing, auto-scroll defaults off (user may opt in deliberately). |
| **Screen readers** | Full VoiceOver and TalkBack support (plus desktop NVDA/VoiceOver if desktop is claimed). Every control has a clear label. Lyrics container uses `aria-live="off"` — users read lines on demand; **no line-by-line announcements on scroll**. Announce song-level changes only (e.g. "Now playing: …") via a polite `role="status"` region. |
| **Color** | Never use color alone to show meaning: current song and current lyric line use color **plus** a non-color cue (label such as "Now", icon, left rule, weight). Current song marked with `aria-current` in the DOM. |
| **Touch targets** | Design goal 48 × 48 dp; WCAG AA floor 24 × 24 CSS px with adequate spacing. Main buttons are very large. No drag-only controls without buttons/presets. |
| **One-handed use** | Main actions are in the lower half of the screen. No top-corner-only primary controls. |
| **Motion** | Respect "reduce motion". Auto-scroll can be turned off. No flashing. |
| **Cognitive** | Simple words, few steps, no time-limited actions, clear error messages. Undo over confirmation for reversible actions. |
| **Reading comfort** | Optional "reading comfort" preset: wider line/letter/paragraph spacing (evidence-based ranges), optional alternate font (e.g. OpenDyslexic as opt-in only). **No efficacy claims** — not presented as a dyslexia fix. |
| **Hearing** | Lyrics and setlist are always visible on screen. Vibration on Next only where supported, always paired with a visual cue. |
| **Concert Mode exits** | Layered: large Exit + confirm/undo, simple non-hold path, optional idle timeout; hold-to-exit only as one method with progress and cancel. Keyboard Esc works on desktop. |
| **Language** | Interface in English and Bahasa Indonesia at launch, with more later. Set `lang` per content language so screen readers switch voices. |
| **Status messages** | Pack download progress, completion, and failure programmatically determinable (`role="status"`), without stealing focus. |

## 11. Main User Flows

**Flow A: Prepare before the concert (online)**

1. Open app, search artist.
2. Tap Download pack (see size, quota check, Wi-Fi only).
3. See "Ready for offline" confirmation; status badge persists on the pack afterward.
4. If the download fails or is interrupted: reason + Resume (do not restart from zero when possible).
5. Install prompt appears only after this first successful download (not on first paint).

**Flow B: Forgot the title at the concert (offline)**

1. Open app → **Resume last show** hero (or Concert Mode if already active).
2. Tap the big **Setlist** button.
3. See the setlist, with the current song marked (color + "Now" cue).
4. Tap to open the lyrics, which start scrolling (Pause/Stop visible; manual scroll available).
5. Next / Prev / re-mark current apply immediately with undo snackbar (~6s).

**Flow C: Remember only a few words**

1. Tap **Search** (recent queries shown on focus).
2. Type the words (fuzzy match; matched line highlighted in results).
3. Pick the result → **Open lyrics** or **Mark as current in setlist**.
4. If nothing matches: relaxed near-matches or "no matches in downloaded pack" with next actions — never a dead end.

**Flow D: First run / no pack yet**

1. Empty state explains packs: how to download on Wi-Fi before the show.
2. Online → search and download; offline → local import guidance and "download when online."
3. Never show the browser's offline error page.

**Flow E: No setlist for tonight's event**

1. User has the artist pack but no event setlist.
2. Offer text search within the pack; allow adding found songs to a personal list (local overlay only).

**Flow F: End of show**

1. After the last song, or via **End show**: leave Concert Mode, release wake lock, return to normal UI.

## 12. Technical Approach (high level)

- **PWA** (web app with service worker): installable, offline-capable, no native build in v1. Minimal dependencies to keep the shell small.
- **Local database** (IndexedDB, or SQLite-wasm with full-text search) for lyrics, metadata, and a pre-built search index from the pack.
- **Cache-first service worker** for packs and app shell; network only for optional metadata and pack updates. Branded offline fallback route precached at install.
- **Setlist engine** on the device: reads the setlist from the pack and tracks the current song (local state only).
- **Compressed packs** (text compression only), downloaded in chunks that can resume.
- **Delta updates** to avoid large re-downloads.
- **Progressive platform APIs:** Screen Wake Lock and Vibration with feature detection and graceful degradation; no reliance on either for core flows.
- **Typography:** `rem`-based scale; relative units throughout for zoom/reflow.
- Background work limited, to save battery.

## 13. Success Metrics

| Metric | Target |
| --- | --- |
| Time from **tap on a song** to lyrics rendered (offline) | Under 5 seconds for 90% of sessions |
| Offline sessions with a pack present show content with **no network spinner** | 100% |
| Users who reach their song in 2 taps or fewer (from Resume hero or Concert Mode home) | At least 90% |
| Pack download completion rate | At least 85% |
| App crash-free sessions | At least 99.5% |
| Accessibility audit | Zero blocking issues for screen reader and large text (automated in CI + manual VoiceOver/TalkBack/NVDA pass) |
| Concert-goers who use the app again at a later concert within 60 days | At least 35% |

## 14. Risks and Open Questions

| Risk / Question | Notes |
| --- | --- |
| **Lyrics licensing** | Lyrics are copyrighted. The open-source repo will never include lyrics. Packs must come from licensed, open-licensed, organizer-owned, or user-imported sources (see section 16). This is the biggest risk. |
| **Setlist accuracy** | Setlists come from organizers or users and may be wrong or missing. Manual setlist editing and text search are the backup. |
| **Pack size vs. coverage** | More songs means bigger downloads. We may start with top artists only. |
| **Setlist changes** | Artists change songs. Packs should cover the full catalog, not only expected setlists. |
| **Battery in long concerts** | Stretch target; needs a prototype spike before the metric is committed. |
| **PWA platform limits** | No vibration on iOS; wake lock version-gated and dismissible by the OS; install UX differs per platform. Design must not depend on these. |
| **Which markets first?** | To decide, for example Indonesia first, and which artists. |
| **Business model** | The app is free and open source. How do we fund it (donations, sponsors, paid official packs)? Decision needed. |

## 15. Milestones (proposed)

| Phase | Content | Time |
| --- | --- | --- |
| 0. Discovery | Licensing talks, user interviews, open-source setup (license, pack spec) | 3 weeks |
| 1. Prototype | Pack download, offline lyrics viewer, text search | 5 weeks |
| 2. Alpha | Setlist mode, Concert Mode, accessibility pass | 6 weeks |
| 3. Beta | Test at real concerts with a small group, performance tuning | 4 weeks |
| 4. Launch | Publish PWA with first artist packs | 2 weeks |

## 16. Open Source and Reusability

The app code is open source and has no built-in artists, so any fan, organizer, choir, or festival can use it for any concert by loading a different pack.

### 16.1 Principles

- **Code is open, content is separate.** The app and engine are open source. Lyrics and songs live in packs.
- **No copyrighted lyrics in the repo.** Ever.
- **Anyone can make a pack** with a simple tool and an open format.
- **Same quality everywhere.** Offline, lightweight, and accessible for every pack and every event.

### 16.2 Proposed Licenses

| Part | Proposed license | Note |
| --- | --- | --- |
| App code and pack builder tool | Apache-2.0 | Free to use and change, with a patent grant. GPL-3.0 is the option if we want all forks to stay open. |
| Pack format specification | CC0 (public domain) | So anyone can build compatible tools. |
| Docs and translations | CC BY 4.0 | Easy for the community to translate and reuse. |
| Lyrics and setlists | Not in the repo | Each pack states its own license and rights holder. Needs legal review. |

### 16.3 Where Packs Come From

| Source | Example | Legal risk | Priority |
| --- | --- | --- | --- |
| Official pack from artist, label, or publisher | A band shares its own lyrics for fans | Low | Must |
| Open-licensed or public-domain songs | Folk songs, anthems, Creative Commons artists | Low | Must (starter packs and demo) |
| Organizer-made pack | A festival, school, church, or choir with its own rights | Low to medium | Should |
| Personal import | User adds own .txt or .lrc lyrics files, stored only on the phone | User responsibility | Should |
| Community pack of copyrighted lyrics without permission | Fan-uploaded lyrics for a famous band | High | Not allowed. The official registry rejects these. |

### 16.4 Pack Format and Tools

A pack is one compressed file with a documented, versioned format:

- **manifest:** pack ID, version, name, language, license, rights holder, source, size, checksum.
- **songs:** title, artist, lyrics (plain text or synced .lrc), optional romanization or translation.
- **theme (optional):** colors, logo, and name for white-label events.
- **setlist (optional):** event name, date, and song order.

A **pack builder** (command-line tool, runs on a laptop) takes a folder of lyrics the creator has rights to, plus an optional setlist file, then outputs a pack. It runs fully offline.

A **registry** is just a static JSON index on any web host. Anyone can host their own. The app can add a custom registry URL.

### 16.5 Architecture for Reuse

- **Core engine as a separate library, no UI:** pack loader, search, and setlist logic, so other apps can reuse it.
- **Thin app on top:** Concert Mode and accessibility features.
- **White-label config:** an event can set its own name, colors, logo, and default pack without changing code.
- **Community translations:** interface text in simple translation files.
- **Plugin points:** custom pack source or custom search method.

### 16.6 Added Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| F24 | Pack format is an open, versioned, documented spec. | Must |
| F25 | The app has no hard-coded artists or songs. It loads any valid pack. | Must |
| F26 | A pack builder tool lets anyone create a pack. | Must |
| F27 | Every pack shows its license, rights holder, and a takedown contact. | Must |
| F28 | User can import own .txt and .lrc lyrics files, kept on the device only. | Should |
| F29 | User can add a custom registry URL. | Should |
| F30 | Share a pack phone-to-phone without internet (QR code, nearby share, or file). | Could |
| F31 | White-label config for event organizers. | Could |

### 16.7 Community and Project Setup

- Public repo with README, CONTRIBUTING guide, Code of Conduct, issue templates, and "good first issue" labels.
- **Accessibility checklist in every pull request.** Accessibility problems block the merge.
- **Automatic checks (CI):** app shell/precache budget under 2 MB, startup time, and accessibility lint on every change.
- **No tracking by default.** Builds are reproducible so the hosted PWA can be self-hosted; no app-store dependency.
- Distribution: web URL + install-to-home-screen. Release via the project's own host (and mirrors if desired).
- Simple governance: a few maintainers, decisions in public issues, and a takedown process for pack disputes.

### 16.8 Added Success Metrics

| Metric | Target (first 12 months) |
| --- | --- |
| Community-made packs in the registry | At least 50 |
| Different events or concerts using the app | At least 20 |
| Contributors | At least 25 |
| Interface languages from community translations | At least 6 |

### 16.9 Open Questions

- Apache-2.0 or GPL-3.0?
- Who may publish lyrics and setlists for a given artist? A lawyer should review the pack license rules and the takedown process before launch.
- Which web framework gives the smallest shell and the easiest contributions?
- Who hosts and moderates the official registry?
- Phase 0 grows by about 2 weeks for repo setup, license decision, and the first draft of the pack spec.
