#!/usr/bin/env node
// Validates every experiment page: HTML is present, inline <script> parses,
// no external resource references, and each experiment is linked from index.html.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const expDir = join(root, 'experiments');
let errors = 0;

if (!existsSync(expDir)) {
  console.error('No experiments/ directory found.');
  process.exit(1);
}

const indexHtml = readFileSync(join(root, 'index.html'), 'utf8');
const days = readdirSync(expDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  // Skip scaffolding like experiments/_template — it isn't a real experiment.
  .filter((d) => !d.name.startsWith('_') && !d.name.startsWith('.'))
  .map((d) => d.name)
  .sort();

console.log(`Validating ${days.length} experiment(s)…`);

for (const day of days) {
  console.log(`\n• ${day}`);
  const before = errors;
  const fail = (m) => { console.error('  ✗ ' + m); errors++; };
  const file = join(expDir, day, 'index.html');
  if (!existsSync(file)) { fail(`${day}: missing index.html`); continue; }
  const html = readFileSync(file, 'utf8');

  // 1. Inline script must parse as JS. Match scripts with attributes too
  // (e.g. <script type="module">) so an attributed inline script isn't skipped.
  const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)]
    .map((m) => m[1])
    // Only syntax-check genuinely inline scripts; a <script src=...></script>
    // has no inline body (and is caught as an external asset below).
    .filter((src) => src.trim().length > 0);
  if (scripts.length === 0) {
    console.log('  · no inline script (static page) — ok');
  }
  for (const src of scripts) {
    try { new Function(src); } catch (e) { fail(`${day}: script syntax error — ${e.message}`); }
  }

  // 2. No external resources (keep pages self-contained). Flag asset loads on
  // script/link/img/source/iframe; allow plain http(s) links in anchor text.
  // Match both scheme-qualified (https://) and protocol-relative (//host) URLs.
  const assetExternal = [...html.matchAll(/<(?:script|link|img|source|iframe)\b[^>]+(?:src|href)\s*=\s*["'](?:https?:)?\/\//gi)];
  if (assetExternal.length) fail(`${day}: loads ${assetExternal.length} external asset(s) — pages must be self-contained`);

  // 3. Must link back to the gallery.
  if (!/href\s*=\s*["']\.\.\/\.\.\/index\.html/.test(html)) {
    fail(`${day}: no "← all experiments" link back to ../../index.html`);
  }

  // 4. Must be registered on the gallery hub.
  if (!indexHtml.includes(`experiments/${day}/`)) {
    fail(`${day}: not linked from index.html gallery grid`);
  }

  // 5. Gallery card copy must stay concise. Left unchecked, card text ratchets
  // longer every day (each entry imitates its ever-longer predecessors) — it
  // once grew from ~20 words to ~230 before being cut back. Hard caps here.
  const DESC_WORD_CAP = 70;
  const IDEA_WORD_CAP = 50;
  const card = indexHtml.match(
    new RegExp(`<a class="card" href="experiments/${day}/index\\.html">([\\s\\S]*?)</a>`)
  );
  if (card) {
    const words = (s) => s.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length;
    const desc = card[1].match(/<p>([\s\S]*?)<\/p>/);
    const idea = card[1].match(/<p class="idea">([\s\S]*?)<\/p>/);
    if (desc && words(desc[1]) > DESC_WORD_CAP) {
      fail(`${day}: gallery description is ${words(desc[1])} words (cap ${DESC_WORD_CAP}) — two or three sentences, ~30–60 words`);
    }
    if (idea && words(idea[1]) > IDEA_WORD_CAP) {
      fail(`${day}: gallery idea teaser is ${words(idea[1])} words (cap ${IDEA_WORD_CAP}) — one or two sentences, ~25–40 words`);
    }
  }

  if (errors === before) console.log('  ✓ ok');
}

console.log('');
if (errors) { console.error(`Validation failed with ${errors} error(s).`); process.exit(1); }
console.log('All experiments valid.');
