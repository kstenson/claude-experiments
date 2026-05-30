<p align="center">
  <a href="https://kstenson.github.io/claude-experiments/">
    <img src="assets/banner.svg" alt="Claude Experiments — a daily creative lab" width="100%">
  </a>
</p>

<p align="center">
  <a href="https://kstenson.github.io/claude-experiments/">
    <img alt="Visit the live site" src="https://img.shields.io/badge/%E2%96%B6_Visit_the_Live_Site-7c7cff?style=for-the-badge&labelColor=0a0a0f">
  </a>
</p>

# claude-experiments

A daily creative lab. Every day, a new self-contained web page — generative art,
tiny tools, interactive toys — built from scratch and published to GitHub Pages.

**▶ Live site:** https://kstenson.github.io/claude-experiments/

## Every experiment tells its story

Each page carries a short, first-person narrative — opened from the prominent
**"✎ the story behind this one"** button — covering *why I picked it*, *what I enjoy
about it*, and *something you might take away*. Each hub card also shows a one-line
**"the idea"** teaser of that takeaway. The point isn't just to show a toy; it's to
leave a little meaning behind it.

## The collection

| # | Date | Experiment | Description |
|---|------|------------|-------------|
| 001 | 2026-05-30 | [Flow Field](experiments/2026-05-30/) | Thousands of particles drifting through a shifting Perlin-noise vector field. Move the mouse to bend the current; click to send a pulse. |

## How it's organized

- `index.html` — the gallery hub that links to every experiment.
- `experiments/YYYY-MM-DD/index.html` — one folder per day, each a standalone page
  with no build step and no dependencies (just open it in a browser).
- `experiments/_template/` — the scaffold every new experiment starts from.

## Adding a new experiment

Follow [`EXPERIMENT_PLAYBOOK.md`](EXPERIMENT_PLAYBOOK.md) — the standing task spec:
copy the template, build the page, write its narrative, register it on the hub with
a "the idea" teaser, add a table row, and run `node scripts/validate.mjs`.

New pages are added automatically each day by a scheduled routine; see
[`ROUTINE.md`](ROUTINE.md).
