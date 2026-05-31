# Setup — hosting & daily schedule

Daily Divide is a static page (`index.html` + `app.js` + `style.css`) that renders from JSON
files in `data/`. The only thing that changes day to day is a new `data/<date>.json`.

## 1. Hosting (GitHub Pages)

This folder lives inside the `claude-experiments` repo, which already publishes to GitHub
Pages from `main` at `https://kstenson.github.io/claude-experiments/`. The page is therefore
live at `https://kstenson.github.io/claude-experiments/daily-divide/`.

Because everything is static and the data is plain JSON fetched at runtime, **every push that
adds a data file redeploys automatically** — no build step. The daily session commits
straight to `main`, so each run publishes the new day.

## 2. Schedule the daily generation

The content engine is a **Claude Code on the web scheduled session**:

1. Open Claude Code on the web on this repository.
2. Create a **Schedule / recurring session** (daily, e.g. **06:30 UTC**).
3. Set the session prompt to the contents of `daily-divide/.claude/daily-prompt.md`
   (or simply: *"Run today's Daily Divide generation per daily-divide/CLAUDE.md."*).
4. Make sure the environment's **network policy allows web search/fetch** so the session can
   research the issue, and that it can **push** to `main`.

Each run picks the day's most-argued issue, researches both sides, writes
`data/<date>.json`, updates `data/manifest.json`, and pushes — which redeploys the page.

See <https://code.claude.com/docs/en/claude-code-on-the-web> for scheduling details.

## 3. Local preview

```sh
cd daily-divide
python3 -m http.server 8000
# then open http://localhost:8000
```

(Use a server rather than opening `index.html` directly, so `fetch()` of the JSON works.)
