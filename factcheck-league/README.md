# 🇬🇧 UK Politics Fact-Check League

A daily experiment: take the **most-discussed claim in UK politics** that day, fact-check it
against primary sources, score it **0–100 on a truth meter**, and keep a running **league table**
of everyone featured (ranked by their average truthfulness).

**Live page:** `index.html` (static — works on GitHub Pages, no build step required).

---

## How a day works

1. **Find the most-discussed claim.** Scan PMQs, major speeches, broadsheet front pages and
   high-reach social posts. Pick the single claim getting the most attention.
2. **Fact-check it.** Go to primary sources first:
   - ONS, National Audit Office, House of Commons Library, Hansard, OBR, IFS.
   - Then established fact-checkers: Full Fact, BBC Reality Check, Channel 4 FactCheck.
3. **Score & write up.** Assign a 0–100 truth score, a verdict band, a plain-English
   explanation, the evidence bullets, a confidence level, and the source links.
4. **Append one entry** to [`data/entries.json`](data/entries.json).
   The page recomputes the league from all entries on load — nothing else to update.

## Truth-meter bands

| Score | Band |
|------:|------|
| 90–100 | True |
| 70–89 | Mostly True |
| 50–69 | Half True / Needs Context |
| 30–49 | Mostly False |
| 10–29 | False |
| 0–9 | Fabricated |

## League scoring

- Each figure's **average score** is the mean of every claim attributed to them.
- Higher average = more truthful. Best and worst single claims are also shown.
- Claims are scored **as used**. Where accuracy depends on the time period (e.g. a statistic
  that was true two years ago but is now outdated), the verdict says so explicitly.

## Data shape (`data/entries.json`)

```jsonc
{
  "meta": { "scoringScale": [ /* bands with colors */ ], "note": "..." },
  "entries": [
    {
      "id": "2026-05-31",          // unique; date works well
      "date": "2026-05-31",
      "headline": true,             // the day's hero claim (one per day)
      "topic": "Asylum hotel costs",
      "claim": "…the claim, in quotes…",
      "speaker": "Rishi Sunak",
      "party": "Conservative",      // drives the colour coding
      "role": "Then Prime Minister",
      "discussionScore": 92,        // 0-100, how discussed it is
      "discussionNote": "why it's the most-discussed claim today",
      "score": 55,                  // 0-100 truth score
      "verdict": "Half True / Needs Context",
      "explanation": "plain-English verdict",
      "evidence": ["bullet", "bullet"],
      "confidence": "High — corroborated across NAO, Migration Observatory, Full Fact.",
      "sources": [{ "title": "…", "url": "https://…" }]
    }
  ]
}
```

`party` accepts: Labour, Conservative, Liberal Democrats, Green, Reform UK, SNP, Plaid Cymru,
Independent (anything else falls back to grey).

## Running it daily (automation)

The fact-finding step needs judgement, so the recommended cadence is a **scheduled
Claude Code on the web session** that runs [`PROMPT.md`](PROMPT.md) once a day, appends an
entry, commits, and pushes. See the Claude Code on the web docs:
https://code.claude.com/docs/en/claude-code-on-the-web

There's also a GitHub Actions workflow at
`../.github/workflows/factcheck-league-daily.yml` that fires on a daily schedule and opens an
issue as the day's reminder/checklist (it deliberately does **not** invent a verdict on its own).

## Today's seed edition (2026-05-31)

Headline claim: *"Housing asylum seekers in hotels costs around £8 million a day"* —
scored **55 / Half True (Needs Context)**: accurate for 2023/24 (~£8.3m/day at peak) but
out of date for 2024/25 (~£5.77m/day, down ~17%). Immigration is the #1 issue in the May 2026
Ipsos Issues Index, which is why this figure leads the debate. The league is seeded with
cross-party claims from Starmer, Blair, Tice and Streeting so the table is populated from day one.

> ⚠️ This edition was compiled while live news retrieval was degraded. Every figure is anchored
> to a named source (linked in the data), but verdicts should be re-confirmed against those
> sources before publication.
