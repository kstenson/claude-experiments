# Daily prompt — UK Politics Fact-Check League

Run this once per day (e.g. as a scheduled Claude Code on the web session) from the repo root.

---

You are compiling today's edition of the **UK Politics Fact-Check League**.

**Step 1 — Find the most-discussed claim.**
Search for the single most-discussed *factual claim* made by a prominent UK political figure in
roughly the last 24–48 hours. Weight by reach and prominence: PMQs exchanges, major
speeches/interviews, front-page coverage, and high-engagement posts. It must be a checkable
factual claim (a number, a comparison, a cause-and-effect), not pure opinion.

**Step 2 — Fact-check it rigorously.**
- Go to **primary sources first**: ONS, National Audit Office, House of Commons Library, Hansard,
  OBR, IFS, departmental accounts.
- Corroborate with established fact-checkers: Full Fact, BBC Reality Check, Channel 4 FactCheck.
- Use at least two independent sources. If the claim's accuracy depends on the time period or a
  definition (e.g. employees vs total in work, people vs cases), say so explicitly.
- Be fair to the speaker: score the claim *as they used it*, in context.

**Step 3 — Score it.** Assign a truth score 0–100 and the matching band:
90–100 True · 70–89 Mostly True · 50–69 Half True/Needs Context · 30–49 Mostly False ·
10–29 False · 0–9 Fabricated.

**Step 4 — Append one entry** to `factcheck-league/data/entries.json`:
- Set `"headline": true` on today's new entry and set `"headline": false` on the previous
  headline entry (only one headline at a time).
- Fill every field: `id` (today's date), `date`, `topic`, `claim` (exact quote if possible),
  `speaker`, `party`, `role`, `discussionScore`, `discussionNote`, `score`, `verdict`,
  `explanation`, `evidence` (bullets), `confidence`, `sources` (title + url).
- Validate the JSON parses.

**Step 5 — Update `meta.lastUpdated`** to today's date.

**Step 6 — Commit and push** to the working branch with a message like
`Fact-check league: <date> — <speaker> on <topic> (<score>)`.

Do **not** fabricate figures. If you cannot verify a claim to a reasonable confidence, pick the
next most-discussed claim you *can* verify, and record the confidence honestly.
