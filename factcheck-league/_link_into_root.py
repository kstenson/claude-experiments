#!/usr/bin/env python3
"""Idempotently add a Fact-Check League card to the root index.html, styled to
match the site's existing `.entry` cards. Re-running cleans any prior insert
first, so it is safe to run repeatedly.
"""
import io, os, re, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "index.html"))

ENTRY = '''  <a class="entry" href="factcheck-league/index.html">
    <h2>UK Politics Fact-Check League</h2>
    <div class="meta">
      <span class="tag">daily data</span>
      daily since May 31, 2026
    </div>
    <p class="description">Each day, the most-discussed claim in UK politics is fact-checked against primary sources and scored 0–100 on a truth meter. Everyone featured earns a place in a running, cross-party league table — ranked by how well their claims hold up.</p>
  </a>

'''

def main():
    if not os.path.exists(ROOT):
        print(f"NOTE: {ROOT} not found; skipping."); return 0
    html = io.open(ROOT, encoding="utf-8").read()

    # 1) Remove the old dark auto-link block (comment + its anchor), if present.
    html = re.sub(r"\n?<!-- factcheck-league:auto-link.*?</a>\n?", "\n", html, flags=re.S)
    # 2) Remove any previously-inserted .entry card for this experiment.
    html = re.sub(r'\s*<a class="entry" href="factcheck-league/index\.html">.*?</a>\n', "\n", html, flags=re.S)

    # 3) Insert a fresh, site-styled card as the first entry inside <main>.
    m = re.search(r"<main>\s*\n", html)
    if m:
        html = html[:m.end()] + ENTRY + html[m.end():]
        msg = "Inserted styled Fact-Check League card as first entry."
    else:  # fall back to before </main>
        i = html.find("</main>")
        if i == -1:
            print("Could not find <main>; no change."); return 0
        html = html[:i] + ENTRY + html[i:]
        msg = "Inserted styled Fact-Check League card before </main>."

    io.open(ROOT, "w", encoding="utf-8").write(html)
    print(msg)
    return 0

if __name__ == "__main__":
    sys.exit(main())
