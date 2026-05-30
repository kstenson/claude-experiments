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

Paste this verbatim into the routine's Instructions:

```
Build today's daily creative web experiment for this GitHub Pages site.

Steps:
1. Determine today's date as YYYY-MM-DD. If experiments/<date>/ already exists, stop — today is done.
2. Copy the template folder experiments/_template/ to experiments/<date>/ and fill
   in every {{PLACEHOLDER}}. Build a fresh, creative idea DISTINCT from every
   existing experiment (check the experiments/ folder and the README table first so
   you don't repeat a concept). It should be interactive or generative where
   possible, work on mobile and desktop, and stay a single self-contained file.
3. Write the NARRATIVE in the template's .story overlay — first person, honest,
   three short sections: "Why I picked it", "What I enjoy about it", and "Something
   you might take away" (a genuine meaning a visitor could carry off). Personal and
   specific to THIS experiment, never generic filler. Keep the prominent
   "✎ the story behind this one" button and the "← all experiments" back link.
4. Add a matching <a class="card"> entry to the grid in /index.html, incrementing
   the experiment number (e.g. № 002). The card must include: the number, title, a
   one-line description, a <p class="idea"> teaser distilling the takeaway in one
   sentence, and the date. (See the Flow Field card for the exact shape.)
5. Add a row to the collection table in README.md.
6. Commit with a clear message and push directly to the main branch (GitHub Pages
   publishes from main, so this makes the new experiment live immediately).

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
