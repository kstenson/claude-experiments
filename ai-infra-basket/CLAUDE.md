# AI-Infrastructure Basket — daily/weekly run instructions

This experiment tracks an **equal-weighted basket of 15 "picks & shovels" AI-infrastructure
stocks** — deliberately **excluding Nvidia** — and compares it to the S&P 500. The page is
static and renders client-side from `data/series.json`. Three lines are tracked, all based
to 100 at inception (first trading day of the year):

1. **Buy & hold** — equal dollars in all 15 names at inception, never touched.
2. **Active** — same equal-weight start, **re-weighted every Friday** based on trade
   decisions recorded in `data/strategy.json`, held unchanged in between (self-financing —
   no money added or removed at a rebalance; the remainder of any allocation is held as cash).
3. **S&P 500** — the benchmark (`^GSPC`), dividend-adjusted.

## The basket (by layer)

| Layer | Names |
|-------|-------|
| Compute & chips | AMD, Broadcom (AVGO), Marvell (MRVL) |
| Manufacturing & equipment | TSMC (TSM), ASML, Applied Materials (AMAT) |
| Memory & storage | Micron (MU), SK Hynix (000660.KS), Seagate (STX) |
| Networking & optics | Arista (ANET), Coherent (COHR), Credo (CRDO) |
| Power, cooling & data centres | Vertiv (VRT), Constellation (CEG), Equinix (EQIX) |

## What to do each run

There are two cadences. **Both end by running `update.py` and pushing.**

### Every run (daily) — refresh the numbers
1. From the repo root, run:
   ```sh
   python3 ai-infra-basket/update.py
   ```
   It re-fetches dividend-adjusted closes from Yahoo Finance for all 15 names, `^GSPC`, and
   USD/KRW (to price SK Hynix), rebuilds all three index lines from `strategy.json`, and
   rewrites `data/series.json`. It is **idempotent and self-healing** — safe to run any day.
2. Sanity-check the printed summary (basket vs S&P, per-name YTD). Run the validator:
   ```sh
   node ai-infra-basket/validate.mjs
   ```
3. Commit & push (the daily-experiments routine does this for all experiments at once).

### Every Friday (US trading Friday) — make the trade decision
This is the judgement step. **Only on Fridays**, before running `update.py`:

1. Work out the **most recent US trading Friday** as `YYYY-MM-DD` (if Friday is a market
   holiday — e.g. Juneteenth — use the prior trading day, and only if no decision is logged
   for that week yet).
2. Review where the book stands: run `update.py` first to see current weights and per-name
   YTD, and use web search for any material news on the 15 names (earnings, guidance,
   capacity, AI-capex datapoints, supply/pricing — DRAM/HBM especially).
3. **Decide the new target weights** across the 15 names. Principles:
   - Stay roughly diversified across the five layers; this is a basket, not a single bet.
   - You may overweight/underweight, trim winners, add to laggards, or raise some **cash**
     (the unallocated remainder). You may set a name to 0 but it stays in the basket.
   - Weights are fractions of the book and **must sum to ≤ 1.0** (never lever up). The
     remainder is cash.
   - Make a *reasoned* call you can defend in one short paragraph — not noise-trading.
4. **Append** one object to the `rebalances` array in `data/strategy.json` with:
   `date` (the Friday), a short `label`, a one-paragraph `rationale` grounded in
   information available *as of that date* (no look-ahead), and the `weights` map.
   **Never edit or delete past rebalances** — the ledger is an immutable record of calls.
5. Run `update.py`, then `validate.mjs`, then commit & push.

## Rules

- **No Nvidia.** The whole point is the picks-and-shovels layer around it.
- The decision ledger is **append-only**. Past calls stand, right or wrong — that honesty is
  the experiment. The active line is allowed to *lose* to buy & hold.
- `update.py` regenerates `series.json` from scratch each run; never hand-edit `series.json`.
- Don't touch `index.html`, `app.js`, or `style.css` on a routine run — those are data-only.
- Rationales must reflect only what was knowable on the decision date. Never fabricate a
  figure; the YTD numbers come from `update.py`, news from real sources.

## How it's scheduled

A **Claude Code on the web scheduled session** runs this folder via
`.claude/daily-prompt.md`. Daily runs just refresh prices; the prompt branches to the
Friday decision step when it's a trading Friday. Pushing redeploys GitHub Pages. See
`SETUP.md`.

## Layout

- `index.html`, `app.js`, `style.css` — the static page (renders from JSON).
- `update.py` — fetches prices and rebuilds `data/series.json`. No third-party deps.
- `data/strategy.json` — the hand-authored, append-only Friday decision ledger (**input**).
- `data/series.json` — generated index lines + holdings + decision log (**output**).
- `validate.mjs` — data linter (run in CI).
- `SETUP.md` — hosting + scheduling notes.
