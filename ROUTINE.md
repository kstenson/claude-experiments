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
6. **Permissions:** the prompt pushes directly to `main`, so under the
   **Permissions** tab enable **Allow unrestricted branch pushes** for
   `kstenson/claude-experiments`. (Without this, routines can only push to
   `claude/`-prefixed branches and the daily experiment won't reach the live site.)
7. **Create**, then **Run now** on the detail page to test it once.

## The routine prompt

The standing task spec lives in [`EXPERIMENT_PLAYBOOK.md`](EXPERIMENT_PLAYBOOK.md)
so there's a single source of truth. Paste this into the routine's Instructions:

```
Build today's daily creative web experiment for this GitHub Pages site by
following EXPERIMENT_PLAYBOOK.md in the repo root, verbatim.

In short: if experiments/<today YYYY-MM-DD>/ already exists, stop. Otherwise copy
experiments/_template/ to experiments/<today>/, build one polished, self-contained
HTML/CSS/JS experiment with a fresh idea distinct from all existing ones, write the
first-person narrative in the .story overlay (Why I picked it / What I enjoy about
it / Something you might take away), add a hub card in index.html with a
<p class="idea"> takeaway teaser, add a README table row, run node scripts/validate.mjs
until it passes, then commit and push directly to main.
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

GitHub Pages publishes from **`main`**, and the routine pushes directly to `main`,
so each daily experiment goes live as soon as the run finishes — no merge step.
This requires **Allow unrestricted branch pushes** to be enabled for the repo in
the routine's **Permissions** tab (see step 6 above).

If you'd rather review each one before it's public, change the prompt's final step
to push to a `claude/`-prefixed branch instead and merge the PR yourself.

## Adding an experiment by hand

Same steps as the prompt above — copy `experiments/_template/` to
`experiments/<date>/`, fill in the placeholders and narrative, add a card (with its
`the idea` teaser) to `index.html`, add a README row, commit, and push to `main`.
