// Validates the newest day's data file: required fields plus word budgets.
// The budgets exist because daily copy ratchets longer if each run imitates
// ever-longer predecessors (files grew ~450 → ~1,800 words before being capped).
// Run: node world-mode-score/validate.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const words = (s) => String(s).trim().split(/\s+/).filter(Boolean).length;
const totalWords = (v) =>
  typeof v === 'string' ? words(v)
  : Array.isArray(v) ? v.reduce((n, x) => n + totalWords(x), 0)
  : v && typeof v === 'object' ? Object.values(v).reduce((n, x) => n + totalWords(x), 0)
  : 0;

const errors = [];
let manifest, day, data;
try { manifest = JSON.parse(readFileSync(join(here, 'data', 'manifest.json'), 'utf8')); }
catch (e) { console.error('❌ manifest.json unreadable:', e.message); process.exit(1); }

day = manifest.days?.[0];
if (!day) { console.error('❌ manifest.days is empty'); process.exit(1); }
try { data = JSON.parse(readFileSync(join(here, 'data', `${day}.json`), 'utf8')); }
catch (e) { console.error(`❌ data/${day}.json unreadable:`, e.message); process.exit(1); }

// Required shape (newest day only — the archive is immutable and unchecked).
if (data.date !== day) errors.push(`date "${data.date}" does not match filename ${day}`);
if (typeof data.score !== 'number' || data.score < 0 || data.score > 100) errors.push('score must be 0-100');
if (!data.summary) errors.push('missing summary');
if (!Array.isArray(data.drivers) || data.drivers.length < 8 || data.drivers.length > 12) {
  errors.push(`drivers must be an array of 8-12 (got ${data.drivers?.length ?? 'none'})`);
}
for (const [i, d] of (data.drivers || []).entries()) {
  if (!d.url || !/^https?:\/\//.test(d.url)) errors.push(`drivers[${i}]: missing/invalid url`);
  if (!d.headline) errors.push(`drivers[${i}]: missing headline`);
}

// Word budgets (hard caps slightly above the documented budgets). Effective for
// days after the caps were introduced — the immutable archive stays unchecked.
const CAPS_EFFECTIVE = '2026-08-04';
const SUMMARY_CAP = 170, HEADLINE_CAP = 25, TOTAL_CAP = 900;
const total = totalWords(data);
if (day >= CAPS_EFFECTIVE) {
if (data.summary && words(data.summary) > SUMMARY_CAP) {
  errors.push(`summary is ${words(data.summary)} words (cap ${SUMMARY_CAP}) — budget ≤150`);
}
for (const [i, d] of (data.drivers || []).entries()) {
  if (d.headline && words(d.headline) > HEADLINE_CAP) {
    errors.push(`drivers[${i}].headline is ${words(d.headline)} words (cap ${HEADLINE_CAP}) — a headline, not a paragraph`);
  }
}
if (total > TOTAL_CAP) errors.push(`file totals ${total} words (cap ${TOTAL_CAP}) — budget ≤800`);
}

if (errors.length) {
  for (const e of errors) console.error(`✗ ${day}: ${e}`);
  console.error(`Validation failed with ${errors.length} error(s).`);
  process.exit(1);
}
console.log(`✓ ${day} valid (${total} words).`);
