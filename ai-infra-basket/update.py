#!/usr/bin/env python3
"""Rebuild the AI-Infrastructure Basket performance series.

Fetches daily *adjusted* closes from Yahoo Finance (no third-party deps — just
urllib) for the 15-name "picks & shovels" basket, the S&P 500 benchmark, and the
USD/KRW rate (to price the one non-USD name, SK Hynix). It then reconstructs
three index lines, all based to 100 at inception:

  1. buyhold  — equal dollar in all 15 at inception, then never touched.
  2. active   — same equal-weight start, re-weighted on the Friday dates recorded
                in data/strategy.json (a hand-authored decision ledger), held in
                between. Self-financing: no cash added or removed at a rebalance.
  3. sp500    — the S&P 500 (^GSPC), total-return-adjusted.

The whole series is rebuilt from scratch each run (idempotent and self-healing:
Yahoo's back-adjustment of past closes is honoured automatically), and written to
data/series.json, which the static page renders client-side.

Run:  python3 ai-infra-basket/update.py
"""

import json
import os
import sys
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone, date

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "data")

# --- The basket -------------------------------------------------------------
# (ticker as shown to users, Yahoo symbol, company, layer, native currency)
BASKET = [
    ("AMD",       "AMD",       "AMD",                  "Compute & chips",            "USD"),
    ("AVGO",      "AVGO",      "Broadcom",             "Compute & chips",            "USD"),
    ("MRVL",      "MRVL",      "Marvell",              "Compute & chips",            "USD"),
    ("TSM",       "TSM",       "TSMC",                 "Manufacturing & equipment",  "USD"),
    ("ASML",      "ASML",      "ASML",                 "Manufacturing & equipment",  "USD"),
    ("AMAT",      "AMAT",      "Applied Materials",    "Manufacturing & equipment",  "USD"),
    ("MU",        "MU",        "Micron",               "Memory & storage",           "USD"),
    ("000660.KS", "000660.KS", "SK Hynix",             "Memory & storage",           "KRW"),
    ("STX",       "STX",       "Seagate",              "Memory & storage",           "USD"),
    ("ANET",      "ANET",      "Arista",               "Networking & optics",        "USD"),
    ("COHR",      "COHR",      "Coherent",             "Networking & optics",        "USD"),
    ("CRDO",      "CRDO",      "Credo",                "Networking & optics",        "USD"),
    ("VRT",       "VRT",       "Vertiv",               "Power, cooling & data centres", "USD"),
    ("CEG",       "CEG",       "Constellation Energy", "Power, cooling & data centres", "USD"),
    ("EQIX",      "EQIX",      "Equinix",              "Power, cooling & data centres", "USD"),
]
BENCHMARK = ("^GSPC", "S&P 500")
FX_SYMBOL = "KRW=X"  # KRW per 1 USD

# Inception = first trading day on/after this date. "Start of the year" (YTD).
INCEPTION_ON_OR_AFTER = "2026-01-02"
# Fetch a little history before inception so we always have a clean baseline.
FETCH_FROM = "2025-12-10"


def fetch_chart(symbol, period1, period2, retries=4):
    """Return {iso_date: adjusted_close} for a Yahoo symbol over [p1, p2)."""
    q = urllib.parse.quote(symbol, safe="")
    url = (
        f"https://query1.finance.yahoo.com/v8/finance/chart/{q}"
        f"?period1={period1}&period2={period2}&interval=1d"
        f"&events=div,split&includeAdjustedClose=true"
    )
    last_err = None
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=30) as resp:
                doc = json.load(resp)
            res = doc["chart"]["result"][0]
            ts = res["timestamp"]
            ind = res["indicators"]
            adj = (ind.get("adjclose") or [{}])[0].get("adjclose")
            close = ind["quote"][0]["close"]
            out = {}
            for i, t in enumerate(ts):
                val = None
                if adj is not None and i < len(adj):
                    val = adj[i]
                if val is None and i < len(close):
                    val = close[i]
                if val is None:
                    continue
                d = datetime.fromtimestamp(t, tz=timezone.utc).date().isoformat()
                out[d] = float(val)
            if not out:
                raise ValueError("empty series")
            return out
        except Exception as e:  # network / parse — retry with backoff
            last_err = e
            if attempt < retries - 1:
                time.sleep(2 ** attempt)
    raise RuntimeError(f"failed to fetch {symbol}: {last_err}")


def ffill_onto(dates, series):
    """Align a {date: value} series onto an ordered date list, forward-filling."""
    out = []
    last = None
    for d in dates:
        if d in series:
            last = series[d]
        out.append(last)
    return out


def load_strategy():
    path = os.path.join(DATA, "strategy.json")
    with open(path) as f:
        strat = json.load(f)
    strat["rebalances"].sort(key=lambda r: r["date"])
    return strat


def normalise_weights(weights):
    """Map ticker->fraction, plus implied cash = 1 - sum(weights). Clamps >=0."""
    w = {k: max(0.0, float(v)) for k, v in weights.items()}
    total = sum(w.values())
    if total > 1.0:  # never lever up — scale back to fully invested
        w = {k: v / total for k, v in w.items()}
        total = 1.0
    cash = max(0.0, 1.0 - total)
    return w, cash


def main():
    p1 = int(datetime.fromisoformat(FETCH_FROM).replace(tzinfo=timezone.utc).timestamp())
    p2 = int(datetime.now(timezone.utc).timestamp()) + 86400

    print("Fetching benchmark and FX…")
    gspc = fetch_chart(BENCHMARK[0], p1, p2)
    fx = fetch_chart(FX_SYMBOL, p1, p2)

    raw = {}
    for shown, sym, name, layer, ccy in BASKET:
        print(f"Fetching {shown} ({sym})…")
        raw[shown] = fetch_chart(sym, p1, p2)

    # Master calendar = US trading days (the benchmark's dates), from inception on.
    all_dates = sorted(gspc)
    inception = next((d for d in all_dates if d >= INCEPTION_ON_OR_AFTER), None)
    if inception is None:
        sys.exit("No trading day found on/after inception date.")
    dates = [d for d in all_dates if d >= inception]

    fx_aligned = ffill_onto(dates, fx)

    # Per-name USD price series, forward-filled and FX-converted where needed.
    usd = {}
    for shown, sym, name, layer, ccy in BASKET:
        aligned = ffill_onto(dates, raw[shown])
        if ccy == "KRW":
            aligned = [
                (px / fxr) if (px is not None and fxr) else None
                for px, fxr in zip(aligned, fx_aligned)
            ]
        if aligned[0] is None:
            sys.exit(f"No baseline price for {shown} at inception {inception}.")
        usd[shown] = aligned

    tickers = [b[0] for b in BASKET]
    n = len(tickers)
    base_px = {t: usd[t][0] for t in tickers}

    # 1) Buy & hold: fixed equal-dollar shares from inception.
    bh_shares = {t: (100.0 / n) / base_px[t] for t in tickers}
    buyhold = [sum(bh_shares[t] * usd[t][i] for t in tickers) for i in range(len(dates))]

    # 2) Active: equal-weight start, re-weighted on ledger dates, self-financing.
    strat = load_strategy()
    rebal_by_date = {r["date"]: r for r in strat["rebalances"]}
    shares = {t: 0.0 for t in tickers}
    cash = 0.0
    active = []
    applied = []  # decisions actually applied (date present in calendar)
    for i, d in enumerate(dates):
        reb = rebal_by_date.get(d)
        if i == 0:
            # Inception is equal-weight by definition. Seed the active book with the
            # exact same equal-dollar shares as buy & hold so the two lines start
            # perfectly identical (no rounding drift from the ledger's inception
            # weights) and only separate at the first real trade.
            shares = dict(bh_shares)
            cash = 0.0
            r0 = reb or {"label": "Inception",
                         "rationale": "Inception: equal-weight all 15 names."}
            applied.append({
                "date": d,
                "label": r0.get("label", "Inception"),
                "rationale": r0.get("rationale", ""),
                "weights": {t: round(1.0 / n, 4) for t in tickers},
                "cash": 0.0,
            })
            active.append(sum(shares[t] * usd[t][i] for t in tickers) + cash)
            continue
        # value just before any action today
        value = sum(shares[t] * usd[t][i] for t in tickers) + cash
        if reb is not None:
            w, c = normalise_weights(reb["weights"])
            shares = {t: (w.get(t, 0.0) * value) / usd[t][i] for t in tickers}
            cash = c * value
            applied.append({
                "date": d,
                "label": reb.get("label", ""),
                "rationale": reb.get("rationale", ""),
                "weights": {t: round(w.get(t, 0.0), 4) for t in tickers},
                "cash": round(c, 4),
            })
            value = sum(shares[t] * usd[t][i] for t in tickers) + cash
        active.append(value)

    # 3) S&P 500
    g0 = gspc[inception]
    sp500 = [100.0 * gspc[d] / g0 for d in dates]

    last = len(dates) - 1
    # Current weights of the active book (drifted since last rebalance).
    active_val = active[last]
    cur_active_w = {t: (shares[t] * usd[t][last]) / active_val for t in tickers}
    cur_cash_w = cash / active_val
    bh_val = buyhold[last]

    stocks = []
    for shown, sym, name, layer, ccy in BASKET:
        s = usd[shown]
        stocks.append({
            "ticker": shown,
            "name": name,
            "layer": layer,
            "currency": ccy,
            "lastUSD": round(s[last], 2),
            "ytdPct": round(100.0 * (s[last] / s[0] - 1.0), 2),
            "weightBuyhold": round((bh_shares[shown] * s[last]) / bh_val, 4),
            "weightActive": round(cur_active_w[shown], 4),
        })

    def stat(line):
        return {
            "indexLast": round(line[last], 2),
            "retPct": round(line[last] - 100.0, 2),
        }

    out = {
        "meta": {
            "title": "AI-Infrastructure Basket",
            "subtitle": "An equal-weighted basket of 15 'picks & shovels' AI-infra "
                        "stocks (no Nvidia), vs the S&P 500.",
            "generated": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "inception": inception,
            "asOf": dates[last],
            "note": "Total-return (dividend-adjusted) closes from Yahoo Finance. "
                    "SK Hynix (000660.KS) converted KRW→USD daily. Indices based to "
                    "100 at inception.",
        },
        "dates": dates,
        "lines": {
            "buyhold": [round(v, 3) for v in buyhold],
            "active": [round(v, 3) for v in active],
            "sp500": [round(v, 3) for v in sp500],
        },
        "stats": {
            "buyhold": stat(buyhold),
            "active": stat(active),
            "sp500": stat(sp500),
            "activeCashWeight": round(cur_cash_w, 4),
        },
        "stocks": stocks,
        "decisions": applied,
        "layers": list(dict.fromkeys(b[3] for b in BASKET)),
    }

    os.makedirs(DATA, exist_ok=True)
    with open(os.path.join(DATA, "series.json"), "w") as f:
        json.dump(out, f, indent=2)
        f.write("\n")

    print(f"\nWrote data/series.json — {len(dates)} trading days from {inception} to {dates[last]}.")
    print(f"  Buy & hold : {buyhold[last]:8.2f}  ({buyhold[last]-100:+.2f}%)")
    print(f"  Active     : {active[last]:8.2f}  ({active[last]-100:+.2f}%)")
    print(f"  S&P 500    : {sp500[last]:8.2f}  ({sp500[last]-100:+.2f}%)")
    print("\nYTD by name:")
    for s in sorted(stocks, key=lambda x: -x["ytdPct"]):
        print(f"  {s['ticker']:>10}  {s['ytdPct']:+7.2f}%   {s['name']}")


if __name__ == "__main__":
    main()
