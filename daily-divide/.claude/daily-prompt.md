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
4. VERIFY every claim to the highest degree, per the verification protocol in SCORING.md:
   actually OPEN each cited source (WebFetch — don't trust search snippets); GO TO PRIMARY
   DOCUMENTS FIRST (statute/bill text on Congress.gov & the U.S. Code, roll-call records,
   rulings, official data, hearing transcripts, the actual letter/press release) and use
   reporting only to corroborate; quote the confirming figure/wording in `evidence`;
   CORROBORATE CONTESTED CLAIMS ACROSS THE SPECTRUM — a right-trusted AND a left-trusted
   outlet plus a neutral wire/reference, not just one tribe; cite the source that truly
   contains the figure; set `confidence` honestly; mark party-to-conflict figures lower;
   surface conflicts/staleness; and if a page can't be fetched (paywall/government HTTP
   403/451/503), say so and downgrade confidence. No quotable receipt → mark `unverifiable`
   or drop it. Never fabricate a quote, figure, or URL.
5. RUN THE POWER TEST (the longer view): would each side hold this position if the other
   party held power? Find the role-reversed historical precedent and document concrete
   position-flips on BOTH sides (ideally each cited to a source from the other tribe).
   Record it in `powerLens`. Selective constitutional conviction is a reasoningHonesty
   penalty, not a needle mover — keep the needle on present-tense facts.
6. Score per SCORING.md: two sub-scores per side (factualAccuracy, reasoningHonesty) →
   blended score; needle = right.score − left.score (clamp −100…+100); 5–9 graded `facts`
   (each with confidence, evidence, corroboration) covering both sides; a `powerLens`
   (thesis, precedent, two-sided flips, longRun, appliedToScore); 3–5 `notAdjudicable`
   value questions; one `biasWatch` paragraph with a concrete "tell"; a short
   `verificationNote` on how claims were checked.
7. Write `daily-divide/data/<today>.json` matching the schema of the most recent file in
   `daily-divide/data/`. Never fabricate a claim, source, or URL.
8. Add today's date to the front of `days` in `daily-divide/data/manifest.json` and set
   `updated`.
9. Commit (`Daily Divide: <date> — <topic> (needle NN)`) and push to `main` (Pages publishes
   from `main`).

Do not edit past data files. Do not touch index.html / app.js / style.css.
Most honest days land in the modest middle of the meter — a drift to one pole over time, or
a pile-up at the extremes, means your own bias has crept in. Recalibrate.
