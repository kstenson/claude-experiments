# Scoring Rubric — Daily Divide

This rubric exists so the meter means the **same thing every day** and resists the very
bias it's trying to expose. Apply it the same way regardless of which side comes out ahead.
The meter does **not** decide which side's *values* are correct — only how well each side's
*checkable claims and reasoning* hold up. Re-read this every run.

## The core principle: separate facts from values

Every political fight is a mix of two things:

1. **Factual disputes** — claims that evidence can settle ("the deficit rose," "crime fell,"
   "the law requires X"). These are scoreable.
2. **Value disputes** — disagreements about what we *should* want (liberty vs. safety, growth
   vs. equality, sovereignty vs. intervention). Evidence cannot settle these. They are **not
   scoreable** and must go in `notAdjudicable`.

If you find yourself scoring a side down because you disagree with what it values, stop —
that belongs in `notAdjudicable`, not in the meter.

## What the meter measures

For **each side** (left and right) score two sub-scores, integers **0–100**:

- **factualAccuracy** — Of the side's *checkable* claims about this issue, how well do they
  hold up against the best available evidence? 100 = every factual claim is accurate and in
  context; 50 = a mix of accurate and misleading; 0 = its factual claims are largely false
  or fabricated.
- **reasoningHonesty** — Quality and good faith of the argument *given* its values: does it
  reason from evidence, steelman the other side, and avoid fallacies, cherry-picking, and
  straw men? 100 = rigorous and fair; 50 = some spin; 0 = pure motivated reasoning.

### Blended side score

`score = round(0.6 × factualAccuracy + 0.4 × reasoningHonesty)`

Facts are weighted higher than rhetoric on purpose. Record the weights in the data file's
`weights` field so the formula is transparent.

### The needle

`needle = right.score − left.score`, clamped to **−100 … +100**.

- **Negative → leans left** (the left's factual/reasoning case is stronger today).
- **Positive → leans right.**
- **0 → dead even.**

A lean is **not** a claim that the side is morally right — only that, on the checkable
merits *as argued this week*, its case is better supported. Say so plainly in the `verdict`.

Reading bands (the front-end derives these from `|needle|`): 0 = dead even; 1–11 = leans
slightly; 12–29 = leans; 30–54 = clearly favors; 55+ = strongly favors. Most honest days
should land in the modest middle — a pile-up at the extremes is a sign of your own bias.

## The fact checks (`facts`)

List **5–9** of the issue's most load-bearing *checkable* claims. Each entry:

- `claim` — the factual assertion, stated neutrally.
- `side` — `left` | `right` | `both` | `neither` (who is making/relying on it).
- `verdict` — one of: `supported`, `mostly-supported`, `mixed`, `mostly-false`, `false`,
  `unverifiable`.
- `explanation` — what the evidence actually shows, including necessary caveats (e.g. a
  casualty figure that comes from one party to the conflict).
- `source` + `url` — a **real, working** link to reporting or primary data. Never fabricate
  a headline or URL. If you can't source it, drop the claim.

Grade claims from **both** sides. A day where you only fact-checked one side is a biased day.

## Values set aside (`notAdjudicable`)

List the **3–5** genuine value disagreements underneath the issue, each one sentence,
naming why it's a values question and not a factual one. This section is the conscience of
the project: it's where you admit what the meter *can't* decide.

## Bias watch (`biasWatch`)

One short paragraph naming the **cognitive bias or framing most clouding people's view of
this issue right now** — and a concrete "tell" a reader can watch for to catch it in
themselves or in commentary. This is the experiment's whole point: surface the bias, don't
just pick a winner.

## Topic selection

Pick the issue that is **genuinely the most-argued political topic of the day**, US or
international, chosen on the merits — not the one easiest to score, and not always the same
beat. Favor issues with a real factual core; skip pure-spectacle stories with nothing
checkable underneath.

## Honesty guardrails (non-negotiable)

- Score the **same way** whichever side wins. If your needles trend one direction over many
  days with no factual basis, you are the bias.
- Never fabricate a claim, source, or URL.
- When facts are genuinely uncertain, say `unverifiable` / `mixed` — don't fake confidence.
- Keep the `verdict` and `summary` measured: state what the evidence shows and, explicitly,
  what it *doesn't* settle.

## Output contract

Write exactly one file `data/YYYY-MM-DD.json` matching the schema of the most recent file in
`data/`, then add today's date to the **front** of the `days` array in `data/manifest.json`
and set `updated`. **Never edit or re-score past days** — the archive is immutable, so the
trend line stays honest.
