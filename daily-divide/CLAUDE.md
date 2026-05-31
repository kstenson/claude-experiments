# Daily Divide — daily generation instructions

This repo publishes a daily page that takes **one contested political issue** and scores it
on a left–right meter — not by which side's *values* are right, but by how well each side's
*checkable claims and reasoning* hold up. The page is static; the only thing that changes
each day is one JSON data file. **Your job, on the daily schedule, is to research the day's
most-argued political issue and produce that file.**

## What to do each run

1. **Determine today's date** (UTC) → `YYYY-MM-DD`.
2. **Pick the issue.** Use web search to find the political topic that is *genuinely the
   most argued about* today — US or international, chosen on the merits (see `SCORING.md` →
   "Topic selection"). Favor issues with a real factual core.
3. **Research both sides.** Read a **broad, ideologically diverse** set of sources:
   - left-leaning and right-leaning outlets *and* wire services / nonpartisan reporting;
   - primary sources where possible (bills, rulings, official data, transcripts).
   Find how each side **frames** the issue and the **checkable claims** each one leans on.
4. **Score strictly against `SCORING.md`:**
   - two sub-scores per side (`factualAccuracy`, `reasoningHonesty`) → blended `score`;
   - `needle = right.score − left.score`, clamped −100…+100;
   - 5–9 graded `facts` with real source URLs, covering **both** sides;
   - 3–5 `notAdjudicable` value questions;
   - one `biasWatch` paragraph with a concrete "tell."
5. **Write** `data/YYYY-MM-DD.json` following the schema of the most recent file in `data/`.
6. **Update** `data/manifest.json`: add today's date to the **front** of `days`, set
   `updated` to today.
7. **Commit and push** to `main` with a message like
   `Daily Divide: YYYY-MM-DD — <topic> (needle NN)`. The push redeploys GitHub Pages.

## Rules

- One file per day. **Never edit or re-score past days** — the archive is immutable.
- Every `facts` entry must cite a real story or primary source. No invented claims/URLs.
- **Score the same way whichever side wins.** Separate facts from values religiously: if you
  dislike what a side *wants*, that belongs in `notAdjudicable`, never in the meter.
- Most honest days land in the modest middle of the meter. A drift toward one pole over many
  days, or a pile-up at the extremes, means *your* bias has crept in — recalibrate.
- Keep `summary` and `verdict` measured: say what the evidence shows and what it can't settle.
- Do not change `index.html`, `app.js`, or `style.css` during a daily run unless explicitly
  asked; daily runs are data-only.

## How this is scheduled

A **Claude Code on the web scheduled session** (daily trigger) runs this folder with the
prompt in `.claude/daily-prompt.md`. The schedule is configured in the web UI — see
`SETUP.md`. Pushing the new data file triggers GitHub Pages to redeploy the page.

## Layout

- `index.html`, `app.js`, `style.css` — the static page (renders from JSON).
- `data/<date>.json` — one immutable day per file.
- `data/manifest.json` — index of available days + last-updated.
- `SCORING.md` — the fixed rubric. **Read it every run.**
- `SETUP.md` — how to deploy (GitHub Pages) and schedule the daily session.
