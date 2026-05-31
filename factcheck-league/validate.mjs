// Validates factcheck-league/data/entries.json.
// Run: node factcheck-league/validate.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const file = join(here, 'data', 'entries.json');

const REQUIRED = ['id','date','topic','claim','speaker','party','score','verdict','explanation','sources'];
const BANDS = ['True','Mostly True','Half True / Needs Context','Mostly False','False','Fabricated'];

let data;
try { data = JSON.parse(readFileSync(file, 'utf8')); }
catch (e) { console.error('❌ entries.json is not valid JSON:', e.message); process.exit(1); }

const errors = [];
if (!data.meta?.scoringScale) errors.push('meta.scoringScale missing');
if (!Array.isArray(data.entries)) errors.push('entries is not an array');

const seen = new Set();
let headlines = 0;
for (const [i, e] of (data.entries||[]).entries()) {
  const at = `entries[${i}] (${e.id||'?'})`;
  for (const k of REQUIRED) if (e[k] === undefined || e[k] === '') errors.push(`${at}: missing "${k}"`);
  if (seen.has(e.id)) errors.push(`${at}: duplicate id "${e.id}"`);
  seen.add(e.id);
  if (typeof e.score !== 'number' || e.score < 0 || e.score > 100) errors.push(`${at}: score must be 0-100`);
  if (e.verdict && !BANDS.includes(e.verdict)) errors.push(`${at}: verdict "${e.verdict}" not a known band`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(e.date||'')) errors.push(`${at}: date must be YYYY-MM-DD`);
  if (!Array.isArray(e.sources) || e.sources.length === 0) errors.push(`${at}: needs at least one source`);
  if (e.headline === true) headlines++;
}
if (headlines !== 1) errors.push(`exactly one entry must have "headline": true (found ${headlines})`);

if (errors.length) {
  console.error('❌ Validation failed:\n - ' + errors.join('\n - '));
  process.exit(1);
}
console.log(`✅ entries.json valid — ${data.entries.length} entries, ${new Set(data.entries.map(e=>e.speaker)).size} figures in the league.`);
