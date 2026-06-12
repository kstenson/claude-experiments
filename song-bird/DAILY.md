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
3. **Pick a musical style — and make it different from recent days.** Follow
   "Tone → style" below: the day's tone picks the **mode, tempo and genre**; the
   **tonic** comes from the circle-of-fifths rotation; and you **must** check
   `songs/index.json` for the last few days' `key`/`scale`/`genre` and avoid
   repeating them. Do not default to dorian.
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

## Tone → style: mode & tempo from the day, tonic from rotation, never repeat the week

Variety is a requirement, not a nice-to-have. The day's mood sets the **mode,
tempo and energy** — but the **tonic (key root)** comes from a date-driven
rotation, *not* the mood (pitch height carries no mood on its own, so rotating
the root is free variety). And before you commit, **look at the last several
days** and deliberately differ from them. A run of grim news days is *not* a
licence to ship the same dorian downtempo piano ballad over and over.

Map the page's numeric score onto `mood.score` in **-1..1** (negative = darker).
The page bar fills from that value.

### 1. Mode, tempo & genre — from the day's tone (pick a *fresh* cell)

Each band lists **several** modes and genres on purpose. Pick a combination you
have **not** used in the last 3–4 days. **Do not default to dorian** — it is the
single most over-used mode in this archive; reach for it only when it genuinely
beats the alternatives, and never two days running.

| Day reads as…        | Modes (pick one, vary it)                       | BPM      | Genre / instrumentation leans (pick one, vary it)                       |
|----------------------|-------------------------------------------------|----------|-------------------------------------------------------------------------|
| Bright / hopeful     | ionian (major), lydian, mixolydian              | 104–128  | indie-pop, bright synth-pop, afrobeat, gospel-soul, house-lite          |
| Calm / contemplative | ionian, mixolydian, dorian (bright side)        | 78–100   | ambient folk-pop, chamber-pop, lo-fi beats, gentle bossa, new-age       |
| Mixed / neutral      | dorian, mixolydian, melodic minor               | 88–112   | trip-hop, neo-soul, motorik/krautrock, dub, downtempo                   |
| Tense / uneasy       | phrygian, harmonic minor, locrian-tinged minor  | 96–124   | dark electronic, post-punk, industrial, drum-and-bass, darkwave         |
| Somber / heavy       | aeolian (natural minor), dorian, phrygian       | 56–82    | piano nocturne, slow ballad, post-rock, drone, cinematic strings        |

Mode carries the mood, so keep it tied to the day — but within a band there is
real range: a mixed day leaning *up* can be mixolydian and brighter; one leaning
*down*, melodic minor and heavier. **Change the genre and instrumentation every
day.** If yesterday was piano-led, lead today with vibraphone, a Rhodes-ish
electric piano, post-rock guitars, or a TR-909 house kit. The library has
sampled piano, the full VCSL orchestra (`s("vibraphone")`, strings, mallets,
guitars, winds) and every Roland/Akai drum machine — visit a *different corner*
of it than the last few days.

### 2. Tonic (key root) — rotate the circle of fifths

Choose the tonic by **rotation** so consecutive days never share a key. Let `N` =
the number of dated song files already in `songs/` **before** today
(`ls songs/20*.json | wc -l`). Take position `N mod 12` of the circle of fifths:

```
index:  0   1   2   3   4   5   6    7    8    9    10   11
tonic:  C   G   D   A   E   B   F#   C#   Ab   Eb   Bb   F
```

Pair that root with the mode you chose, e.g. position 6 + phrygian →
`"key": "F#", "scale": "phrygian"`. Adjacent days land a fifth apart, so even two
back-to-back minor downtempo days sound clearly different. Sharps and flats are
fine in Strudel note names (`cs3`, `ef3`, `af2`). If the rotation somehow lands
on a tonic you used in the last 3 days, step one more position.

### 3. Don't repeat the recent run (check the archive first)

Open `songs/index.json` and read the **last 5–7 days'** `key`, `scale`, `bpm` and
`genre`. Your pick **must differ from yesterday on at least two** of {tonic, mode,
genre/instrumentation, tempo feel}, and must not reuse the exact `(key, scale)`
pair of any of the last 5 days. When a grim news stretch keeps pushing you toward
dark modes, that is fine — but then make the *tonic, genre, instrumentation and
rhythmic feel* carry the variety so each day still has its own identity.

## Strudel pattern guide

The engine uses [@strudel/web](https://strudel.cc). The `pattern` field in the
JSON is a JS expression evaluated at runtime. All Strudel globals are available.

### The preloaded instrument library (use it!)

The engine already preloads the **full Strudel default library** on first play —
the same set the official strudel.cc REPL uses:

- **Sampled piano** — `s("piano")`. Use this for piano-led songs, not a
  sawtooth pretending to be one.
- **Real drum machines** — `.bank("RolandTR808")`, `"RolandTR909"`,
  `"AkaiLinn"`, `"RhythmAce"`, etc., on top of `s("bd sd hh rim cp")`.
- **VCSL** — an orchestral/acoustic multisample set (mallets, strings,
  guitars, winds). Reference instruments by name, e.g. `s("vibraphone")`.
- **EmuSP12**, **Dirt-Samples**, and **mridangam** for extra texture.

You do **not** need to list any of these in `samples` — they're always loaded.
Reach for sampled instruments first; raw oscillators (`sawtooth`, `sine`,
`triangle`, `square`) are for *supporting pads and sub-bass only*.

### Loading extra samples

Only declare a `samples` array when you want something *beyond* the default
library. The engine loads it before evaluating the pattern:

```json
"samples": [
  "github:tidalcycles/dirt-samples",
  { "map": { "harp": "harp/C3.wav" }, "url": "https://example.com/sounds/" }
]
```

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
| `s("piano")` | Sampled piano (preloaded) |
| `stack(a, b, c)` | Layer patterns simultaneously |
| `.bank("RolandTR808")` | Use a built-in drum machine |
| `.s("sawtooth")` | Oscillator type (sawtooth, square, triangle, sine) — pads/bass only |
| `.lpf(sine.range(400,2000).slow(8))` | Modulate any param with a signal (sine/saw/perlin) |
| `.off(0.125, x => x.gain(0.2))` | Layer a shifted, transformed copy (echoes, harmonies) |
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

- **Lead with sampled instruments.** Carry melody and harmony on `s("piano")`,
  VCSL instruments, or real drum machines. A song built only from `sawtooth`/
  `sine`/`triangle` oscillators sounds like generic synth tones — reserve raw
  oscillators for pads and sub-bass under the real instruments.
- **Modulate, don't set-and-forget.** Drive a filter or gain with a slow signal
  (`lpf(sine.range(500,1600).slow(12))`) so the sound breathes.
- **Use the full toolbox.** `.jux(rev)` for stereo width, `.off()` for echoes
  and harmonies, `.euclid()`/`(3,8)` for rhythm, `.room()`/`.delay()` for space.
- **Keep it musical.** Stay in the chosen key/scale across all layers.
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
