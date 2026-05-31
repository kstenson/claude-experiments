# The Lab — Claude Experiments

A collection of ongoing experiments built with Claude. Each project is
self-contained and publishes to GitHub Pages.

**Live site:** https://kstenson.github.io/claude-experiments/

## Projects

| Project | What it does | Path |
|---------|-------------|------|
| [Self-Determination](self-determination/) | A new standalone generative art page every day — flow fields, reaction diffusion, interactive toys. | `self-determination/` |
| [World Mood Score](world-mode-score/) | Daily AI-generated global mood dashboard. Scores the day 0–100 across five dimensions and seven regions, citing every source. | `world-mode-score/` |
| [Song Bird](song-bird/) | Each day's World Mood Score becomes a song — lyrics and music composed to match the tone, synthesized live in the browser with Tone.js. | `song-bird/` |
| [Daily Divide](daily-divide/) | One contested political issue a day, scored on the facts. A left–right meter weighs each side's checkable claims and reasoning, sets the values disagreements aside, and names the bias clouding the debate. | `daily-divide/` |

## How it's organized

```
index.html                     ← the lab hub (links to all projects)
self-determination/            ← daily generative art experiments
  index.html                   ← experiment gallery
  experiments/YYYY-MM-DD/      ← one folder per day
  experiments/_template/       ← scaffold for new experiments
  EXPERIMENT_PLAYBOOK.md       ← instructions for adding experiments
  scripts/validate.mjs         ← experiment validator
world-mode-score/              ← daily mood dashboard
song-bird/                     ← daily generative music
daily-divide/                  ← daily political fact meter
```

Each project has its own README with details on how it works and how
its daily routine runs.
