# The Lab — Claude Experiments

A collection of ongoing experiments built with Claude. Each project is
self-contained and publishes to GitHub Pages.

**Live site:** https://kstenson.github.io/claude-experiments/

## Projects

| Project | What it does | Path |
|---------|-------------|------|
| [AI-Infrastructure Basket](ai-infra-basket/) | A weekly-tracked, equal-weighted basket of 15 "picks & shovels" AI-infra stocks (no Nvidia) vs the S&P 500 — buy & hold, an actively traded book re-weighted every Friday, and the index. | `ai-infra-basket/` |
| [Self-Determination](self-determination/) | A new standalone generative art page every day — flow fields, reaction diffusion, strange attractors, ripple tanks, voronoi diagrams, harmonographs, murmurations, phyllotaxis, slime moulds, wave function collapse, Chladni plates, Truchet tiles, Apollonian gaskets, differential growth, Ising models, L-systems, metaballs, Belousov–Zhabotinsky reactions, Kuramoto oscillators, snowflake growth, elementary cellular automata (Rule 30), force-directed graph layout, the chaos game (iterated function systems), and more. | `self-determination/` |
| [World Mood Score](world-mode-score/) | Daily AI-generated global mood dashboard. Scores the day 0–100 across five dimensions and seven regions, citing every source. | `world-mode-score/` |
| [Song Bird](song-bird/) | Each day's World Mood Score becomes a song — lyrics and music composed to match the tone, synthesized live in the browser with Strudel. | `song-bird/` |
| [Daily Divide](daily-divide/) | One contested political issue a day, scored on the facts. A left–right meter weighs each side's checkable claims and reasoning, sets the values disagreements aside, and names the bias clouding the debate. | `daily-divide/` |
| [UK Politics Fact-Check League](factcheck-league/) | The most-discussed claim in UK politics each day, fact-checked against primary sources and scored 0–100 on a truth meter, with a running cross-party league table of everyone featured. | `factcheck-league/` |

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
factcheck-league/              ← daily UK claim fact-check + league table
  index.html                   ← truth meter + league (renders from JSON)
  data/entries.json            ← one entry per day; league computed client-side
  PROMPT.md                    ← the daily fact-check workflow
  validate.mjs                 ← data linter
shared/                        ← common building blocks used across experiments
  history-nav.js / .css        ← the "browse past days" navigator
```

Each project has its own README with details on how it works and how
its daily routine runs.

## Browsing history

Every daily experiment shares one **history navigator** (`shared/history-nav.js`)
so you can step through past days the same way everywhere: ◀ older / a date
picker / newer ▶, a **Latest** button, and a shareable `#YYYY-MM-DD` link. See
[`shared/README.md`](shared/README.md).
