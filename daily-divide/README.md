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
  graded (supported → false), shown with the **direct quote** that establishes it, a
  **confidence** level, and **independent corroborating sources**. (See "Verification standard" below.)
- **Set aside** — the genuine *value* disagreements underneath, which the meter deliberately
  refuses to adjudicate, because evidence can't.
- **Bias watch** — the cognitive bias most clouding people's view of the issue, plus a
  concrete "tell" to catch it in yourself.
- **The longer view (power test)** — the macro lens. People switch positions based on who
  holds power, so each day finds the role-reversed historical precedent and documents
  concrete position-flips on *both* sides. Selective principle is scored as a reasoning
  problem, not as evidence about who's right on today's facts.
- **Trend** — how the facts have leaned over time. A persistent drift to one pole is itself
  a finding (about the issues — or about the meter's own bias).

## How the meter is computed

For each side: `score = round(0.6 × factualAccuracy + 0.4 × reasoningHonesty)`
(facts weighted above rhetoric). Then `needle = right.score − left.score`, clamped to
−100…+100. The full rubric — and the honesty guardrails that keep it from becoming a
partisan scoreboard — live in [`SCORING.md`](SCORING.md).

## Verification standard

Credibility lives or dies on the facts, so every claim is held to a strict bar before it's
published (full protocol in [`SCORING.md`](SCORING.md)):

1. **Read the source, not the snippet** — each cited page is actually opened and the
   confirming figure/quote is recorded as the claim's `evidence`.
2. **Primary documents first** — for anything that has one, the cite is the statute or bill
   text (Congress.gov, the U.S. Code), the roll-call record, the ruling, the official data,
   or the actual letter/transcript. Reporting *characterizes* primary documents; we cite the
   document and use reporting to corroborate. "What the law says" comes from the law.
3. **Corroborate across the spectrum, not within one tribe** — a contested claim is backed by
   a **right-trusted *and* a left-trusted** outlet plus a neutral wire/reference. A
   fact-check sourced only to mainstream-left (or only to right) outlets is itself biased,
   and the project is meant to be trustable across the divide. When a right outlet concedes a
   point against the right (or vice versa), that's flagged — it's the strongest corroboration
   there is.
4. **Cite the page that truly contains the figure**, never one that merely sounds right.
5. **Mark provenance honestly** — figures from a party to the dispute get lower `confidence`
   and an explicit caveat; conflicts and stale numbers are surfaced, not smoothed over.
6. **No receipt, no claim** — anything that can't be quoted from a readable source is marked
   `unverifiable` or dropped. If a publisher or government site blocks automated fetching
   (403/451/503), the page says so and leans on readable corroboration.

A short `verificationNote` on each day records how that day's claims were checked and flags
anything that couldn't be read directly.

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
