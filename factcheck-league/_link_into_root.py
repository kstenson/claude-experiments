#!/usr/bin/env python3
"""Idempotently insert a link to the Fact-Check League into the root index.html.

Safe by design: it only INSERTS a self-contained anchor before </main> (or
</body>); it never rewrites or deletes existing markup. Re-running is a no-op.
"""
import io, sys, os

ROOT = os.path.join(os.path.dirname(__file__), "..", "index.html")
ROOT = os.path.abspath(ROOT)
MARKER = "factcheck-league/"

CARD = (
    '\n<!-- factcheck-league:auto-link (safe to move/restyle) -->\n'
    '<a href="factcheck-league/index.html" '
    'style="display:block;max-width:880px;margin:16px auto;padding:18px 20px;'
    'border:1px solid #2a3441;border-radius:14px;background:#161b22;color:#e6edf3;'
    'text-decoration:none;font:16px/1.5 -apple-system,Segoe UI,Roboto,Arial,sans-serif">'
    '<div style="font-size:18px;font-weight:700">🇬🇧 UK Politics Fact-Check League</div>'
    '<div style="color:#9aa7b4;font-size:14px;margin-top:4px">'
    'Daily fact-check of the most-discussed claim in UK politics, scored 0–100 on a '
    'truth meter, with a running league table of everyone featured.</div></a>\n'
)

def main():
    if not os.path.exists(ROOT):
        print(f"NOTE: {ROOT} not found; skipping root link.")
        return 0
    with io.open(ROOT, encoding="utf-8") as f:
        html = f.read()
    if MARKER in html:
        print("Root index.html already links to factcheck-league; no change.")
        return 0
    for anchor in ("</main>", "</body>", "</html>"):
        i = html.lower().rfind(anchor)
        if i != -1:
            html = html[:i] + CARD + html[i:]
            break
    else:
        html = html + CARD
    with io.open(ROOT, "w", encoding="utf-8") as f:
        f.write(html)
    print("Inserted Fact-Check League link into root index.html.")
    return 0

if __name__ == "__main__":
    sys.exit(main())
