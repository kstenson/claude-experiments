# Daily song generation — routine playbook

This is the instruction set for the **daily routine**. Trigger a Claude Code
session on this repo each day with a prompt like:

> Follow song-bird/DAILY.md to generate today's Song Bird entry and push it.

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
5. **Compose a Strudel pattern.** Build a `stack()` of layers using Strudel's
   API (see pattern guide below). Use samples from the internet — the engine
   loads them on demand. The pattern must be a single JS expression that
   returns a Pattern.
6. **Write `songs/<today>.json`** (schema below) — e.g. `songs/2026-06-01.json`.
   Set `"generatedBy": "world-mode-score"` and `"date"` to today (the user's
   locale date). Never overwrite a previous day's file.
7. **Rebuild the index.** Run `node build-index.js`. This regenerates
   `songs/index.json` and refreshes the root `song.json` mirror. Don't edit
   those two by hand.
8. **Commit & push to `main`.** GitHub Pages deploys from `main`, so commit
   the new day's file (plus the regenerated `songs/index.json` and `song.json`)
   straight to `main` and push — no feature branch, no PR. Keep the commit
   message short, e.g. `song: 2026-06-01 — <title>`.

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

## Strudel pattern guide

The engine uses [@strudel/web](https://strudel.cc). The `pattern` field in the
JSON is a JS expression evaluated at runtime. All Strudel globals are available.

### Loading samples

Declare sample sources in the `samples` array. The engine loads them before
evaluating the pattern:

```json
"samples": [
  "github:tidalcycles/dirt-samples",
  { "map": { "piano": "piano/C3.wav" }, "url": "https://example.com/sounds/" }
]
```

Inside the pattern, use `s("bd sd hh cp")` with `.bank("RolandTR808")` for
built-in drum machines, or reference any sample name loaded via `samples`.

### Building layers with stack()

A song is a `stack()` of independent layers:

```javascript
stack(
  // Drums — use real drum samples
  s("bd ~ ~ ~ bd ~ ~ ~, ~ hh ~ hh ~ hh ~ hh, ~ ~ ~ ~ cp ~ ~ ~")
    .bank("RolandTR808").gain(0.7),

  // Chords — angle brackets = one per cycle, square brackets = chord
  note("<[c3,e3,g3] [f3,a3,c4] [g3,b3,d4] [e3,g3,b3]>")
    .s("sawtooth").attack(0.5).sustain(0.7).release(2)
    .lpf(2000).gain(0.3).room(0.4),

  // Bass
  note("c2 c2 g2 e2 f2 f2 c2 a2")
    .s("square").lpf(600).gain(0.5),

  // Melody — use ~ for rests
  note("e4 ~ g4 c5 ~ b4 a4 ~")
    .s("triangle").lpf(3000).gain(0.5)
    .delay(0.3).delaytime(0.375)
)
```

### Key functions

| Function | Purpose |
|----------|---------|
| `note("c4 e4 g4")` | Pitched pattern (mini-notation) |
| `s("bd sd hh")` | Sample/synth trigger |
| `stack(a, b, c)` | Layer patterns simultaneously |
| `.bank("RolandTR808")` | Use a built-in sample bank |
| `.s("sawtooth")` | Oscillator type (sawtooth, square, triangle, sine) |
| `.gain(0.5)` | Volume (0–1) |
| `.lpf(2000)` | Low-pass filter cutoff Hz |
| `.hpf(200)` | High-pass filter cutoff Hz |
| `.room(0.4)` | Reverb wet (0–1) |
| `.rsize(3)` | Reverb size |
| `.delay(0.3)` | Delay wet (0–1) |
| `.delaytime(0.25)` | Delay time in seconds |
| `.pan(0.3)` | Stereo pan (0=left, 1=right) |
| `.attack(0.1)` | Envelope attack seconds |
| `.decay(0.2)` | Envelope decay seconds |
| `.sustain(0.5)` | Envelope sustain level |
| `.release(0.5)` | Envelope release seconds |
| `.distort(2)` | Waveshaping distortion |
| `.speed(0.5)` | Sample playback speed |
| `.n(0)` | Sample variant index |
| `.jux(rev)` | Apply effect to right channel |

### Mini-notation cheatsheet

| Syntax | Meaning |
|--------|---------|
| `a b c` | Sequence |
| `[a b]` | Group into one step |
| `<a b c>` | Alternate per cycle |
| `a*3` | Repeat 3× in one step |
| `a/2` | Play every 2 cycles |
| `~` | Rest/silence |
| `[a,b]` | Play simultaneously (chord) |
| `a(3,8)` | Euclidean rhythm |
| `a:2` | Sample variant |

### Tips for good patterns

- **Vary the sources.** Don't use only synth oscillators — mix in samples from
  Dirt-Samples or other internet sources. Use `.bank()` for drums.
- **Keep it musical.** Stay in the chosen key/scale across all layers.
- **Use effects.** Reverb, delay, and filter make patterns feel alive.
- **Rests matter.** Use `~` generously — space is part of music.
- **The pattern must be a single expression** that returns a Pattern (no
  semicolons, no variable declarations). Use `stack()` to combine layers.

## `songs/<date>.json` schema

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

  // Sample sources to load before evaluating the pattern.
  // Strings are GitHub shorthand or strudel.json URLs.
  // Objects have { map: { name: "path.wav" }, url: "https://base/" }.
  "samples": [
    "github:tidalcycles/dirt-samples"
  ],
  "sampleSources": ["Dirt-Samples (tidalcycles)"],  // human-readable credits

  // A single JS expression using Strudel globals that returns a Pattern.
  // The engine calls eval() on this string after loading samples.
  "pattern": "stack( ... )",

  "lyrics": [ { "section": "Verse 1", "lines": ["...", "..."] }, ... ]
}
```

### Notes for whoever (or whatever) generates this
- The pattern must be a **single expression** — no `let`, `const`, `var`, or `;`.
- Use `stack()` to combine multiple layers.
- All sample sources in `samples` are loaded before the pattern runs.
- Keep notes inside the chosen key/scale so layers stay consonant.
- Validate the JSON before committing
  (`python3 -m json.tool songs/<today>.json`), then run `node build-index.js`.
