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
- `confidence` — `high` | `medium` | `low`: how sure you are *after* verification (see the
  protocol below). High = directly read in a primary/authoritative source **and**
  corroborated independently; low = single-source, party-to-conflict, or could not be
  directly read.
- `evidence` — the **direct quote or specific figure** from the source that establishes the
  claim. This is the receipt; a claim with no quotable evidence is not yet verified.
- `explanation` — what the evidence actually shows, including caveats, the strongest
  *contrary* evidence, and any source conflict (e.g. tallies that differ by date).
- `source` + `url` — the **primary / most authoritative** real, working link. Never
  fabricate a headline, quote, or URL. If you can't source it, drop the claim.
- `corroboration` — an array of `{ source, url }` for **independent** outlets that confirm
  the same fact. Required (≥1) for any load-bearing claim; `[]` only when the source is
  itself primary (e.g. the bill text, a court ruling, official data).

Grade claims from **both** sides. A day where you only fact-checked one side is a biased day.

### The verification protocol (this is the "highest degree" bar)

Hold **every** claim to this before you publish it:

1. **Read the source, don't trust the snippet.** Open the cited page (WebFetch) and confirm
   it actually contains the figure/quote. Search-result summaries are leads, not evidence.
   Put the confirming words in `evidence`.
2. **Go to primary documents first.** For anything that *has* a primary source, cite it: the
   bill or statute text (Congress.gov, the U.S. Code), roll-call records (the House/Senate
   Clerk), court rulings, official data, hearing transcripts, the actual letter/press
   release/transcript of what someone said. News reporting *characterizes* primary
   documents; cite the document, then use reporting to corroborate. "What the law says"
   should come from the law, not from a columnist's summary of it.
3. **Corroborate across the political spectrum, not just within it.** Two outlets reprinting
   the same wire story is *one* source. For any load-bearing claim, corroborate across **≥2
   independent outlets that include both a right-trusted and a left-trusted source** where
   the claim is contested (e.g. Fox/WSJ/National Review/Washington Examiner *and*
   NPR/NYT/CNN), plus a neutral wire/reference (Reuters, AP, Britannica) when possible. **A
   fact-check sourced only to one side of the media spectrum is itself biased** — the whole
   point of this project is to be trustable across the divide. When a right-leaning outlet
   concedes a point against the right (or vice versa), say so; that is the strongest possible
   corroboration.
4. **Cite the source that actually contains the figure.** If outlet A reports a number but
   you can only verify it in outlet B, cite B. Never attribute a figure to a page that
   doesn't state it.
5. **Mark provenance and confidence honestly.** Figures from a party to a dispute (a
   government, a combatant, an advocacy NGO) get `low`/`medium` confidence and an explicit
   caveat. Independently verified + corroborated → `high`.
6. **Surface conflicts and staleness, don't smooth them over.** If sources disagree (e.g.
   13 vs. 15 dead) or a number is outdated, say so in `explanation` and reflect it in the
   `verdict`/`confidence` — a range beats false precision.
7. **If a page can't be fetched** (paywall, publisher block / HTTP 403/451/503), say so in
   the `explanation`, drop confidence accordingly, and lean on sources you *can* read. Never
   present an unread page as if you verified it.
8. **No receipt, no claim.** If you cannot quote supporting evidence from a readable source,
   either downgrade to `unverifiable` or drop the claim. Fabrication is disqualifying.

Use the optional top-level `verificationNote` to tell readers, in one short paragraph, how
the day's claims were checked and to flag any sources you couldn't read directly.

## Values set aside (`notAdjudicable`)

List the **3–5** genuine value disagreements underneath the issue, each one sentence,
naming why it's a values question and not a factual one. This section is the conscience of
the project: it's where you admit what the meter *can't* decide.

## Bias watch (`biasWatch`)

One short paragraph naming the **cognitive bias or framing most clouding people's view of
this issue right now** — and a concrete "tell" a reader can watch for to catch it in
themselves or in commentary. This is the experiment's whole point: surface the bias, don't
just pick a winner.

## The longer view — the power test (`powerLens`)

The single most reliable bias on most political issues is that **people switch positions
based on who holds power.** Today's day-by-day needle can't see that; this section is the
macro lens that can. For every issue, run the **power test** and record it in `powerLens`:

> Would each side hold this position if the other party controlled the relevant branch of
> government? Find the moment in recent history when the roles *were* reversed, and show what
> each side said then.

Include:

- `thesis` — one paragraph stating the power test and pointing to the role-reversed precedent.
- `precedent` — the historical mirror image (`case`, `what` happened, the `mirror` that maps
  it onto today, with `source`/`url` and corroboration). Prefer a primary or
  cross-spectrum source.
- `flips` — concrete, sourced position-reversals on **both** sides (name names and quote the
  then-vs-now where you can). Document a left flip **and** a right flip; a one-sided
  hypocrisy list is itself partisan. Ideally cite each flip to a source from the *other*
  tribe (a right outlet documenting the left's flip, and vice versa).
- `longRun` — the durable, above-the-fray through-line that survives once you strip out
  who's in power, and what it predicts when power changes hands next.
- `appliedToScore` — how the power test feeds the meter. **Selective constitutional
  conviction is a `reasoningHonesty` problem:** if a side's stated principle would flip with
  the partisan label, it doesn't earn a reasoning-honesty bonus for that principle, and the
  inconsistency belongs in its `weakestPoint`. The needle should rest on present-tense,
  checkable facts — not on either side's professed sincerity.

This section is *not* false balance: documenting that both sides flip does not mean both
sides are equally right on today's facts. Keep the two separate — the power test scores
*consistency of principle*; the meter scores *who is correct on the checkable facts now*.

### Don't grade the issue in isolation (`pattern`)

Most issues are not one-offs; they're instances of a wider pattern, and **treating each one
as an isolated, self-justifying event is itself a common bias** (it keeps the argument off
the trend). Where an issue is part of a broader pattern — a string of similar actions by the
same administration, a multi-year policy trajectory, a repeated tactic — situate it. Record
it in `pattern`:

- `thesis` — how this issue fits the larger pattern, and why isolation distorts it.
- `campaigns` (or analogous items) — the other instances, each with `where`/`what`, an
  at-a-glance status flag (e.g. `authorization`), and a **real, verified** `source`/`url`
  plus cross-spectrum `corroboration`. Same verification bar as `facts`.
- `takeaway` — the recurring question underneath the whole pattern, and the "one-off" tell to
  watch for.

Like the power test, the pattern is **context that reframes the stakes, not a thumb on the
needle.** The needle still rests on the present issue's checkable facts. Skip this section
only when an issue genuinely stands alone.

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
