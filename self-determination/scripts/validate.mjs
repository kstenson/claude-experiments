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

  if (errors === before) console.log('  ✓ ok');
}

console.log('');
if (errors) { console.error(`Validation failed with ${errors} error(s).`); process.exit(1); }
console.log('All experiments valid.');
