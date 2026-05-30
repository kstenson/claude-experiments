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

## Adding a new experiment

1. Create `experiments/<today>/index.html`.
2. Add an `<a class="card">` entry to the grid in `index.html`.
3. Add a row to the table above.
