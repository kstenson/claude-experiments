// Validates the newest day's data file: required fields plus word budgets.
// The budgets exist because daily copy ratchets longer if each run imitates
// ever-longer predecessors (files grew ~3,000 → ~15,500 words before being capped).
// Run: node daily-divide/validate.mjs
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
for (const k of ['topic', 'summary', 'verdict', 'facts', 'notAdjudicable', 'biasWatch']) {
  if (data[k] === undefined || data[k] === '') errors.push(`missing "${k}"`);
}
if (typeof data.needle !== 'number' || data.needle < -100 || data.needle > 100) {
  errors.push('needle must be a number in -100…100');
}
if (Array.isArray(data.facts) && (data.facts.length < 5 || data.facts.length > 9)) {
  errors.push(`facts must have 5-9 entries (got ${data.facts.length})`);
}

// Word budgets (hard caps slightly above the documented budgets). Effective for
// days after the caps were introduced — the immutable archive stays unchecked.
const CAPS_EFFECTIVE = '2026-08-04';
const total = totalWords(data);
if (day >= CAPS_EFFECTIVE) {
const CAPS = { topic: 30, summary: 280, verdict: 130, verificationNote: 170, biasWatch: 170 };
for (const [field, cap] of Object.entries(CAPS)) {
  const v = data[field];
  if (typeof v === 'string' && words(v) > cap) {
    errors.push(`${field} is ${words(v)} words (cap ${cap})`);
  }
}
const FACT_CAPS = { claim: 60, explanation: 90, evidence: 90 };
for (const [i, f] of (Array.isArray(data.facts) ? data.facts : []).entries()) {
  for (const [field, cap] of Object.entries(FACT_CAPS)) {
    const n = totalWords(f?.[field]);
    if (n > cap) errors.push(`facts[${i}].${field} is ${n} words (cap ${cap})`);
  }
}
if (Array.isArray(data.sources_consulted)) {
  if (data.sources_consulted.length > 40) {
    errors.push(`sources_consulted has ${data.sources_consulted.length} entries (cap 40)`);
  }
  for (const [i, s] of data.sources_consulted.entries()) {
    if (totalWords(s) > 15) {
      errors.push(`sources_consulted[${i}] is ${totalWords(s)} words (cap 15) — names only, no annotations`);
    }
  }
}
const TOTAL_CAP = 5000;
if (total > TOTAL_CAP) errors.push(`file totals ${total} words (cap ${TOTAL_CAP}) — budget ≤4,500`);
}

if (errors.length) {
  for (const e of errors) console.error(`✗ ${day}: ${e}`);
  console.error(`Validation failed with ${errors.length} error(s).`);
  process.exit(1);
}
console.log(`✓ ${day} valid (${total} words).`);
