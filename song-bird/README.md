# Song Bird

A daily generative song. Each day, Claude reads the tone of
[World Mood Score](https://kstenson.github.io/claude-experiments/world-mode-score/), picks a
musical style to match the mood, writes lyrics, and composes a
[Strudel](https://strudel.cc) pattern that is **performed live in your browser** —
pulling samples from across the internet on demand.

## How it works

| File | Role |
|------|------|
| `index.html` | The page (GitHub Pages serves this). |
| `styles.css` | Styling; themes itself from the day's mood palette. |
| `engine.js` | Reads the archive, loads samples, evaluates the Strudel pattern, and plays. **Never changes.** |
| `songs/YYYY-MM-DD.json` | One song per day — mood, style, Strudel pattern, and lyrics. **A new one is added daily.** |
| `songs/index.json` | Auto-generated manifest of every day (powers the "Previous days" picker). |
| `song.json` | Auto-generated mirror of the newest day (backward compatibility). |
| `build-index.js` | Rebuilds `songs/index.json` + `song.json` from the dated files. |
| `DAILY.md` | The playbook the daily routine follows to add each day's song. |

Visitors land on the newest day; the **Previous days** dropdown (and a
`?date=YYYY-MM-DD` URL) opens any past entry from the archive.

## Strudel

Song Bird uses [Strudel](https://strudel.cc) — a live-coding music system for
the browser based on Tidal Cycles. Each day's song is a Strudel `pattern` string
stored in the JSON, evaluated at runtime. Patterns can:

- Use built-in synths (sawtooth, triangle, square, sine)
- Load drum samples from banks (RolandTR808, RolandTR909, etc.)
- Pull samples from anywhere on the internet (GitHub repos, URLs)
- Apply effects: reverb, delay, filters, distortion, panning

## The daily routine

Set up a recurring trigger that starts a Claude session with:

> Follow song-bird/DAILY.md to generate today's Song Bird entry and push it.

**Requirement:** the environment's network allowlist must permit
`kstenson.github.io` so the routine can read the World Mood Score page.
