You are generating today's entry for Daily Divide.

Follow the instructions in `daily-divide/CLAUDE.md` and score strictly against
`daily-divide/SCORING.md`. The meter scores how well each side's *checkable claims and
reasoning* hold up — NOT which side's *values* are correct. Score the same way whichever
side wins; if you dislike what a side wants, that belongs in `notAdjudicable`, not the meter.

Steps:
1. Work out today's UTC date as `YYYY-MM-DD`.
2. With web search, pick the political issue that is genuinely the most argued about today
   (US or international, on the merits, with a real factual core).
3. Research BOTH sides across an ideologically diverse source set (left- and right-leaning
   outlets, wire services, and primary sources where possible). Find each side's framing and
   the checkable claims it leans on.
4. Score per SCORING.md: two sub-scores per side (factualAccuracy, reasoningHonesty) →
   blended score; needle = right.score − left.score (clamp −100…+100); 5–9 graded `facts`
   with real working URLs covering both sides; 3–5 `notAdjudicable` value questions; one
   `biasWatch` paragraph with a concrete "tell."
5. Write `daily-divide/data/<today>.json` matching the schema of the most recent file in
   `daily-divide/data/`. Never fabricate a claim, source, or URL.
6. Add today's date to the front of `days` in `daily-divide/data/manifest.json` and set
   `updated`.
7. Commit (`Daily Divide: <date> — <topic> (needle NN)`) and push to `main` (Pages publishes
   from `main`).

Do not edit past data files. Do not touch index.html / app.js / style.css.
Most honest days land in the modest middle of the meter — a drift to one pole over time, or
a pile-up at the extremes, means your own bias has crept in. Recalibrate.
