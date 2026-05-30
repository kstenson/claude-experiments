# Daily experiment routine

This repo grows by one experiment per day. To automate that, use a **Claude Code
Routine** (Anthropic-managed cloud scheduling) so a fresh page is built and pushed
each day without anyone at the keyboard.

Docs: <https://code.claude.com/docs/en/routines>

## Set it up (one time)

> Note: `/schedule` is hidden *inside* a Claude Code on the web session — set this
> up from the web UI instead. (From a local terminal you can also run
> `/schedule daily experiment at 9am`.)

1. Go to <https://claude.ai/code/routines> → **New routine**.
2. **Name:** `Daily experiment`. Paste the prompt below into **Instructions** and
   pick a model (Sonnet is plenty and cheaper on the daily run allowance).
3. **Repository:** `kstenson/claude-experiments`.
4. **Environment:** **Default** is fine — no external network access is needed
   (everything is committed to the repo; the pages call no external APIs).
5. **Select a trigger → Schedule → Daily**, set your preferred local time
   (entered in your zone, auto-converted).
6. **Permissions:** leave branch pushes restricted to `claude/` — the prompt pushes
   to a `claude/` branch, so the default is correct.
7. **Create**, then **Run now** on the detail page to test it once.

## The routine prompt

Paste this verbatim into the routine's Instructions:

```
Build today's daily creative web experiment for this GitHub Pages site.

Steps:
1. Determine today's date as YYYY-MM-DD. If experiments/<date>/ already exists, stop — today is done.
2. Create experiments/<date>/index.html: a single, self-contained, dependency-free
   HTML/CSS/JS page with a fresh, creative idea DISTINCT from every existing
   experiment (check the experiments/ folder and README table first so you don't
   repeat a concept). It should be interactive or generative where possible, work
   on mobile and desktop, and include a "← all experiments" link back to ../../index.html.
3. Add a matching <a class="card"> entry to the grid in /index.html, incrementing
   the experiment number (e.g. № 002), with title, one-line description, and date.
4. Add a row to the collection table in README.md.
5. Commit with a clear message and push to branch claude/github-pages-experiments-W9Ivr.

Match the existing visual style and code conventions. Keep each page standalone —
no build step, no external dependencies.
```

## Managing it

- **Run now / pause / edit:** the routine's detail page has a **Run now** button, a
  **Repeats** toggle to pause, and a pencil icon to edit the prompt, repo, or schedule.
- **Custom cadence:** UI presets are hourly / daily / weekdays / weekly (minimum
  interval is 1 hour). For something custom (e.g. every 2 days), create it as Daily,
  then run `/schedule update` from a **local terminal** to set a cron expression.
- **Each run** appears as a normal session in your list, so you can open it, review
  the diff, and open a PR.

## Branching & publishing

The routine pushes to `claude/github-pages-experiments-W9Ivr`. Since GitHub Pages
publishes from `main`, either merge those daily branches periodically, or point the
routine at a dedicated long-lived branch that Pages serves from (that requires
enabling **Allow unrestricted branch pushes** for this repo in the routine's
Permissions tab).

## Adding an experiment by hand

Same five steps as the prompt above — create `experiments/<date>/index.html`, add a
card to `index.html`, add a README row, commit, push.
