# Song Bird 🎵🐦

A daily generative song. Each day, Claude reads the tone of
[world-mode-score](https://kstenson.github.io/claude-experiments/world-mode-score/), picks a
musical style to match the mood, writes lyrics, and composes a short piece that
is **synthesized live in your browser** with [Tone.js](https://tonejs.github.io/) —
no audio files involved.

## How it works

| File | Role |
|------|------|
| `index.html` | The page (GitHub Pages serves this). |
| `styles.css` | Styling; themes itself from the day's mood palette. |
| `tone.min.js` | Self-hosted Tone.js, so audio works even when external CDNs are blocked. |
| `engine.js` | Reads the archive and plays the selected day with Tone.js. **Never changes.** |
| `songs/YYYY-MM-DD.json` | One song per day — mood, style, music, and lyrics. **A new one is added daily.** |
| `songs/index.json` | Auto-generated manifest of every day (powers the "Previous days" picker). |
| `song.json` | Auto-generated mirror of the newest day (backward compatibility). |
| `build-index.js` | Rebuilds `songs/index.json` + `song.json` from the dated files. |
| `DAILY.md` | The playbook the daily routine follows to add each day's song. |

Visitors land on the newest day; the **Previous days** dropdown (and a
`?date=YYYY-MM-DD` URL) opens any past entry from the archive.

## Publishing on GitHub Pages

1. Merge this branch into the Pages branch (e.g. `main`).
2. Repo **Settings → Pages → Build and deployment → Source: Deploy from a branch**,
   pick the branch and the **/ (root)** folder.
3. The site goes live at `https://<user>.github.io/claude-song-bird/`.

## The daily routine

Set up a recurring trigger that starts a Claude session with:

> Follow DAILY.md to generate today's Song Bird entry and push it.

**Requirement:** the environment's network allowlist must permit
`kstenson.github.io` so the routine can read the source page. Without it the
fetch is blocked and the song can't be generated from real data.

