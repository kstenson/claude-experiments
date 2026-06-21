# ⛏️ AI-Infrastructure Basket

A performance tracker for an **equal-weighted basket of 15 "picks & shovels"
AI-infrastructure stocks** — the companies selling the compute, equipment, memory,
networking and power that the AI build-out runs on — **deliberately excluding Nvidia**.
Everything is benchmarked against the S&P 500.

**Live:** https://kstenson.github.io/claude-experiments/ai-infra-basket/

## Three lines

All based to 100 at inception (the first trading day of the year):

1. **Buy & hold** — equal dollars in all 15 at inception, then left alone. Weights drift.
2. **Active** — same equal-weight start, but **re-weighted every Friday** from a logged
   trade decision, held unchanged in between. Self-financing (no cash in/out at a rebalance);
   any unallocated remainder sits in cash. Every Friday call is recorded with its rationale —
   and the line is allowed to lose to buy & hold. That honesty is the experiment.
3. **S&P 500** — the benchmark (`^GSPC`), dividend-adjusted.

## The basket

| Layer | Holdings |
|-------|----------|
| Compute & chips | AMD · Broadcom (AVGO) · Marvell (MRVL) |
| Manufacturing & equipment | TSMC (TSM) · ASML · Applied Materials (AMAT) |
| Memory & storage | Micron (MU) · SK Hynix (000660.KS) · Seagate (STX) |
| Networking & optics | Arista (ANET) · Coherent (COHR) · Credo (CRDO) |
| Power, cooling & data centres | Vertiv (VRT) · Constellation (CEG) · Equinix (EQIX) |

## How it works

- `update.py` fetches **dividend-adjusted** daily closes from Yahoo Finance for the 15
  names, `^GSPC`, and USD/KRW (to price the one non-USD name, SK Hynix), then rebuilds all
  three index lines and writes `data/series.json`. No third-party Python dependencies — just
  the standard library. It's idempotent: each run rebuilds the whole series from scratch.
- `data/strategy.json` is the **append-only Friday decision ledger** that drives the active
  line. Editing it is how a trade is made.
- `index.html` + `app.js` + `style.css` render the chart, scorecards, holdings table and
  decision log entirely client-side. No build step.
- `validate.mjs` lints the data (run in CI).

## Run it locally

```sh
python3 ai-infra-basket/update.py     # refresh data
node    ai-infra-basket/validate.mjs  # lint
cd ai-infra-basket && python3 -m http.server 8000   # then open http://localhost:8000
```

(Serve it rather than opening `index.html` directly, so the `fetch()` of the JSON works.)

## Daily routine

A scheduled Claude session runs `.claude/daily-prompt.md`: daily runs just refresh the
prices; on a trading Friday it also makes — and logs — a trade decision. See `CLAUDE.md` for
the full protocol and `SETUP.md` for scheduling.

*Not investment advice. An experiment in tracking a thesis over time.*
