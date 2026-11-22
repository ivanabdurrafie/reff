# Lyrics format and unlabelled lyrics

Real-world lyrics often have NO section labels. The app must work either way.

## Input (one .txt per song)
- Blank line = new stanza.
- Optional label as the first line of a stanza: `[Verse 1]`, `(Chorus)`, `Reff:`,
  `Bridge`. Chorus, refrain and hook all become **Reff**; pre-chorus becomes **Pre-reff**.

## Detection (tools/parse-lyrics.mjs)
1. Explicit labels win.
2. Unlabelled stanzas that appear 2+ times (ignoring case and punctuation) = **Reff**, `inferred: true`.
3. Unlabelled stanzas sharing >= 80% of the smaller stanza's lines with a known Reff = **Reff**
   (catches a Reff with an extra ad-lib line).
4. Everything else stays `name: null`. Never guess "Verse" or "Bridge".

## UI rules
- `name: null` -> no header, just a larger gap between stanzas.
- Inferred Reff -> normal red Reff label (optionally a subtle "auto" marker in the editor only).
- Reff-only mode shows `reff:true` stanzas. If a song has none, hide the Reff button for that song.
- Stanza gaps keep the song readable even with zero labels.
- Editor (later): tap a stanza to set or clear its label; save into the pack JSON.
