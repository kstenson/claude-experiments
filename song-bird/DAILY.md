# Daily song generation — routine playbook

This is the instruction set for the **daily routine**. Trigger a Claude Code
session on this repo each day with a prompt like:

> Follow DAILY.md to generate today's Song Bird entry and push it.

The engine (`engine.js`) and page (`index.html`) never change. Each day you
write a **new dated file** in `songs/`, rebuild the archive index, and push.
GitHub Pages redeploys automatically. Every past day stays browsable from the
"Previous days" picker on the page.

## Archive layout

| Path | Role |
|------|------|
| `songs/YYYY-MM-DD.json` | One file per day — the full song (schema below). **This is the day's deliverable.** |
| `songs/index.json` | Auto-generated manifest of all days (newest first). Don't hand-edit. |
| `song.json` | Auto-generated mirror of the newest day (kept for backward compatibility). |
| `build-index.js` | Regenerates `songs/index.json` and `song.json` from the dated files. |

## Steps

1. **Read the source page.** Fetch <https://kstenson.github.io/claude-experiments/world-mode-score/>.
   - This requires `kstenson.github.io` to be on the environment's network
     allowlist. If the fetch returns `403 host_not_allowed`, stop and report
     that the allowlist still needs fixing — do not invent data.
2. **Read the day's tone.** Identify the dominant mood/score/"mode" the page
   reports (and any topical content). Summarize it in one honest sentence.
3. **Pick a musical style from that tone.** See mapping below.
4. **Write lyrics** in that style — 2 verses + a chorus is the house format,
   grounded in what the page actually showed that day. Keep it human, not a
   news summary set to rhyme.
5. **Compose** a chord progression, bassline, melody, and (optionally) drums
   as step arrays in the key/scale you picked.
6. **Write `songs/<today>.json`** (schema below) — e.g. `songs/2026-05-31.json`.
   Set `"generatedBy": "world-mode-score"` and `"date"` to today (the user's
   locale date). Never overwrite a previous day's file.
7. **Rebuild the index.** Run `node build-index.js`. This regenerates
   `songs/index.json` and refreshes the root `song.json` mirror. Don't edit
   those two by hand.
8. **Commit & push to `main`.** GitHub Pages deploys from `main`, so commit
   the new day's file (plus the regenerated `songs/index.json` and `song.json`)
   straight to `main` and push — no feature branch, no PR. Keep the commit
   message short, e.g. `song: 2026-05-31 — <title>`.

## Tone → style mapping (guidance, not rules)

| Day reads as…        | Mode/key      | BPM     | Genre lean              | Palette         |
|----------------------|---------------|---------|-------------------------|-----------------|
| Bright / hopeful     | major / lydian| 100–124 | indie-pop, bright synth | warm, light     |
| Calm / contemplative | major / mixolydian | 80–96 | ambient folk-pop      | cool blues/teal |
| Tense / uneasy       | minor / phrygian | 96–120 | dark electronic, post-punk | deep red/violet |
| Somber / heavy       | minor / aeolian / dorian | 60–80 | slow ballad, piano-led | muted, dim    |
| Mixed / neutral      | dorian        | 88–104  | downtempo               | balanced        |

Map the page's numeric score (if any) onto `mood.score` in **-1..1**
(negative = darker). The page bar fills from that value.

## `song.json` schema

```jsonc
{
  "date": "YYYY-MM-DD",
  "source": "https://kstenson.github.io/claude-experiments/world-mode-score/",
  "generatedBy": "world-mode-score",
  "title": "Song title",
  "mood": {
    "label": "short human mood phrase",
    "score": 0.35,                 // -1..1
    "summary": "one honest sentence about the day's tone",
    "palette": { "bg": "#hex", "bg2": "#hex", "accent": "#hex", "accent2": "#hex", "text": "#hex" }
  },
  "style": { "genre": "...", "key": "C", "scale": "lydian", "bpm": 92, "swing": 0.1 },
  "fx": { "reverb": 0.35, "filter": 2600 },   // reverb 0..0.9, filter Hz 200..12000

  // Each layer is a looping step sequence. null = rest.
  "chords": { "subdivision": "1m", "steps": [ ["C3","E3","G3","B3"], ... ] },  // arrays of notes
  "bass":   { "subdivision": "4n", "steps": [ "C2", null, ... ] },              // single notes
  "melody": { "subdivision": "8n", "steps": [ "G4", null, ... ] },              // single notes
  "drums":  { "subdivision": "8n", "kick": ["x",null,...], "hat": [null,"x",...] }, // "x" = hit

  "lyrics": [ { "section": "Verse 1", "lines": ["...", "..."] }, ... ]
}
```

### Notes for whoever (or whatever) generates this
- All four music layers are optional; omit one and it simply won't play.
- Keep notes inside the chosen key/scale so layers stay consonant.
- The sequences loop independently and indefinitely, so make their lengths
  line up musically (e.g. chords 4 bars, melody 4 bars of 8th-notes = 32 steps).
- Validate the JSON before committing
  (`python3 -m json.tool songs/<today>.json`), then run `node build-index.js`.
