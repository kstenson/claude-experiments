# shared/ — common building blocks for The Lab

Small, dependency-free pieces shared across experiments so cross-cutting
features behave the same everywhere.

## `history-nav.js` + `history-nav.css` — the history navigator

A consistent "browse past days" control: **◀ older / a date picker / newer ▶**,
a **Latest** button, a shareable **`#YYYY-MM-DD`** URL, and a banner when you're
viewing an archived day. No build step, no dependencies, injection-safe (only
date strings and `textContent` are used).

### Use it

```html
<link rel="stylesheet" href="../shared/history-nav.css" />
<div id="historyNav"></div>
<script src="../shared/history-nav.js"></script>
```

```js
const nav = HistoryNav.mount({
  container: document.getElementById('historyNav'),
  label: 'day',                              // noun in the banner: day/issue/song/claim
  days: DAYS.map(d => ({ date: d.date, label: d.topic })), // any order; newest = latest
  current: someDate,                         // optional initial (else #hash, else latest)
  useHash: true,                             // sync selection to location.hash (default true)
  onSelect: (date, meta) => renderDay(byDate[date]),       // fires on every selection
});

nav.current;            // currently selected date
nav.select('2026-05-31'); // navigate programmatically
```

### Theming

Reads each experiment's palette via CSS custom properties, with fallbacks:

| Variable    | Falls back to                          |
|-------------|----------------------------------------|
| `--hn-fg`     | `--text` → `--ink` → light default     |
| `--hn-muted`  | `--text-secondary` → `--muted`         |
| `--hn-line`   | `--rule` → `--line`                    |
| `--hn-panel`  | `--panel2` → `--panel`                 |
| `--hn-accent` | `--accent`                             |

### Where it's wired in

- **daily-divide** — switches the day panels in place (`#hash` URLs).
- **world-mood-score** — switches the dashboard in place; the "from the day
  before" delta and the region modal follow the selected day (`#hash` URLs).
- **song-bird** — drives the `?date=` param (playback reloads, since Strudel
  audio can't be hot-swapped).
- **factcheck-league** — a jump-to-day control that opens and scrolls to the
  selected claim (the full archive is already on one page).

### Patterns for two kinds of app

1. **Render-in-place** (daily-divide, world-mood): load all days up front, split
   `main()` into "load all" + a `renderDay(day)`, and call `renderDay` from
   `onSelect`. Keep any full-series chart rendered once from all days.
2. **Reload-on-select** (song-bird): set `useHash:false` and have `onSelect`
   change the query string.
