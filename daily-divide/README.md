# ⚖️ Daily Divide

One contested political issue a day, scored on the **facts** — not on whose side you're on.

Each day an AI picks the political topic people are arguing about most (US or global),
researches the **left** and **right** framings, and places a needle on a left–right meter.
But the meter answers a deliberately narrow question:

> Setting aside which side's *values* are "right" — whose **checkable claims and reasoning**
> hold up better today?

That distinction is the whole experiment. Most political fights are a tangle of **facts**
(which evidence can settle) and **values** (which it can't). Daily Divide scores the first
and openly refuses to score the second.

## What you get each day

- **The meter** — a needle from −100 (left) to +100 (right). It leans toward whichever
  side's factual/reasoning case is stronger *this week* — not toward who is morally right.
- **Two side cards** — each side's framing, a **factual-accuracy** score, a
  **reasoning-honesty** score, a blended score, and its single strongest and weakest point.
- **The checkable claims** — the load-bearing factual assertions from *both* sides, each
  graded (supported → false) with a real, clickable source.
- **Set aside** — the genuine *value* disagreements underneath, which the meter deliberately
  refuses to adjudicate, because evidence can't.
- **Bias watch** — the cognitive bias most clouding people's view of the issue, plus a
  concrete "tell" to catch it in yourself.
- **Trend** — how the facts have leaned over time. A persistent drift to one pole is itself
  a finding (about the issues — or about the meter's own bias).

## How the meter is computed

For each side: `score = round(0.6 × factualAccuracy + 0.4 × reasoningHonesty)`
(facts weighted above rhetoric). Then `needle = right.score − left.score`, clamped to
−100…+100. The full rubric — and the honesty guardrails that keep it from becoming a
partisan scoreboard — live in [`SCORING.md`](SCORING.md).

## How it works

A **Claude Code on the web scheduled session** runs once a day, picks the issue, researches
both sides, writes `data/<date>.json`, updates `data/manifest.json`, and pushes — which
redeploys the page on GitHub Pages. Rules in [`CLAUDE.md`](CLAUDE.md); rubric in
[`SCORING.md`](SCORING.md); hosting & scheduling in [`SETUP.md`](SETUP.md). The site is fully
static; each day is one immutable JSON file, so the archive and trend come for free.

## Local preview

```sh
python3 -m http.server 8000   # then open http://localhost:8000/daily-divide/
```

## Method & honesty

This is an **editorial, AI-generated** reading, not an oracle. It scores how claims and
arguments hold up against the evidence available that day; it does not declare which set of
values should win, because that isn't something facts can decide. Every claim links a real
source so the judgment is auditable, the rubric is applied the same way whichever side comes
out ahead, and **past days are never re-scored**.
