You are running today's update for the **AI-Infrastructure Basket** experiment.

Follow `ai-infra-basket/CLAUDE.md`. The experiment tracks an equal-weighted basket of 15
"picks & shovels" AI-infra stocks (NO Nvidia) against the S&P 500, as three lines:
buy & hold, an actively traded book (re-weighted Fridays), and the S&P 500.

Steps:
1. Work out today's date (UTC) → `YYYY-MM-DD` and whether today is a **US trading Friday**
   (if Friday is a market holiday, the prior trading day stands in — but only act on the
   Friday step if no decision is logged for the current week yet).

2. **If it is a trading Friday and no decision is logged for this week** — make the weekly
   trade decision FIRST:
   - Run `python3 ai-infra-basket/update.py` to see current weights and per-name YTD.
   - Use web search for material news on any of the 15 names (earnings, guidance, AI capex,
     DRAM/HBM pricing & supply, data-centre power). Open real sources; don't trust snippets.
   - Decide new target weights across the 15 names: stay diversified across the five layers,
     tilt with conviction, optionally raise cash; weights must sum to ≤ 1.0 (never lever up).
   - **Append** one entry to `rebalances` in `ai-infra-basket/data/strategy.json`:
     `{ "date", "label", "rationale", "weights" }`. The rationale is one short paragraph
     grounded ONLY in what was knowable as of that date (no look-ahead). NEVER edit past
     entries — the ledger is immutable. Never fabricate a figure.

3. **Every run** (Friday or not): run `python3 ai-infra-basket/update.py` to rebuild
   `ai-infra-basket/data/series.json` from live prices, then `node ai-infra-basket/validate.mjs`.

4. Commit and push (`AI-Infra Basket: <date>` — note the trade if one was made). The push
   redeploys GitHub Pages.

Do not edit `index.html`, `app.js`, or `style.css` on a routine run. Do not add Nvidia.
The active book is allowed to underperform buy & hold — log the honest result either way.
