# Experiment Playbook

This file is the standing instruction set for adding a new daily experiment.
A scheduled trigger (Claude Code on the web) or a manual session can follow it
verbatim. Keep each experiment self-contained — no build step, no dependencies.

## The daily task

1. **Check the date.** Let `DATE` = today as `YYYY-MM-DD`.
   If `experiments/<DATE>/` already exists, stop — today is already done.
2. **Pick a fresh idea** distinct from every existing experiment (see the
   collection table in `README.md`). Rotate themes: generative art, an
   interactive toy, a tiny useful tool, a simulation, an audio-visual, a
   typographic/CSS-only piece, a data visualization, a game.
3. **Build** `experiments/<DATE>/index.html` — one standalone HTML file with
   inline CSS and JS. Requirements:
   - Works by opening the file directly (no network, no libraries/CDNs).
   - Responsive; works on mobile and desktop.
   - Include a `← all experiments` link back to `../../index.html`.
   - Show the experiment number and date somewhere in the page.
   - Match the house style: dark background, the accent palette
     (`#7c7cff` / `#ff7cc3`), rounded panels, subtle motion.
4. **Register it** in `index.html`: add a new `<a class="card">` at the **top**
   of `#grid`, increment the `№` number, write a one-line description, set the date.
5. **Document it**: add a row to the collection table in `README.md`.
6. **Validate** the JS parses (e.g. extract the `<script>` and run it through
   `node -e "new Function(src)"`).
7. **Commit & push** to `claude/github-pages-experiments-W9Ivr` with a message
   like `Add experiment NNN: <name>`.

## Numbering

Experiments are numbered sequentially: 001, 002, 003… The number shown on the
card and inside the page must match the row count.

## Quality bar

Each experiment should feel finished and delightful — something worth showing
off, not a stub. Favor one polished idea over several half-built ones.
