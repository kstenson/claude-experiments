# claude-experiments

A daily creative lab. Every day, a new self-contained web page — generative art,
tiny tools, interactive toys — built from scratch and published to GitHub Pages.

**▶ Live site:** `https://kstenson.github.io/claude-experiments/`

## The collection

| # | Date | Experiment | Description |
|---|------|------------|-------------|
| 001 | 2026-05-30 | [Flow Field](experiments/2026-05-30/) | Thousands of particles drifting through a shifting Perlin-noise vector field. Move the mouse to bend the current; click to send a pulse. |

## How it's organized

- `index.html` — the gallery hub that links to every experiment.
- `experiments/YYYY-MM-DD/index.html` — one folder per day, each a standalone page
  with no build step and no dependencies (just open it in a browser).
- `.nojekyll` — tells GitHub Pages to serve the files as-is.

## Enabling GitHub Pages

In the repo: **Settings → Pages → Build and deployment → Source: _Deploy from a branch_**,
then pick the branch and the `/ (root)` folder. The site appears at the URL above.

## Every experiment tells its story

Each page carries a short, first-person narrative — reachable from a
**"✎ the story behind this one"** link — covering *why I picked it*, *what I enjoy
about it*, and *something you might take away*. The point isn't just to show a toy;
it's to leave a little meaning behind it.

## Adding a new experiment

1. Create `experiments/<today>/index.html` — including the narrative overlay
   (reuse the pattern in `experiments/2026-05-30/index.html`).
2. Add an `<a class="card">` entry to the grid in `index.html`.
3. Add a row to the table above.

Automated daily builds follow the same checklist — see [`ROUTINE.md`](ROUTINE.md).
