// Validates the AI-Infrastructure Basket data files.
// Run: node ai-infra-basket/validate.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const read = (f) => JSON.parse(readFileSync(join(here, f), 'utf8'));

const errors = [];
const TICKERS = ['AMD','AVGO','MRVL','TSM','ASML','AMAT','MU','000660.KS','STX',
  'ANET','COHR','CRDO','VRT','CEG','EQIX'];

// --- strategy.json: the hand-authored decision ledger ---
let strat;
try { strat = read('data/strategy.json'); }
catch (e) { console.error('❌ strategy.json invalid JSON:', e.message); process.exit(1); }

if (!Array.isArray(strat.rebalances) || !strat.rebalances.length) {
  errors.push('strategy.rebalances must be a non-empty array');
} else {
  const seen = new Set();
  for (const [i, r] of strat.rebalances.entries()) {
    const at = `rebalance[${i}] (${r.date || '?'})`;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.date || '')) errors.push(`${at}: bad date`);
    if (seen.has(r.date)) errors.push(`${at}: duplicate date`);
    seen.add(r.date);
    if (!r.rationale) errors.push(`${at}: missing rationale`);
    if (!r.weights || typeof r.weights !== 'object') { errors.push(`${at}: missing weights`); continue; }
    let sum = 0;
    for (const [tk, w] of Object.entries(r.weights)) {
      if (!TICKERS.includes(tk)) errors.push(`${at}: unknown ticker "${tk}"`);
      if (typeof w !== 'number' || w < 0) errors.push(`${at}: bad weight for ${tk}`);
      sum += w;
    }
    if (sum > 1.0001) errors.push(`${at}: weights sum to ${sum.toFixed(4)} (>1; would lever up)`);
    if (sum < 0.5) errors.push(`${at}: weights sum to only ${sum.toFixed(4)} (>50% cash — intended?)`);
  }
}

// --- series.json: generated output (present once update.py has run) ---
let series;
try { series = read('data/series.json'); }
catch { series = null; }

if (series) {
  const n = (series.dates || []).length;
  if (!n) errors.push('series.dates is empty');
  for (const k of ['buyhold', 'active', 'sp500']) {
    if (!Array.isArray(series.lines?.[k])) errors.push(`series.lines.${k} missing`);
    else if (series.lines[k].length !== n) errors.push(`series.lines.${k} length ${series.lines[k].length} ≠ ${n} dates`);
  }
  if ((series.stocks || []).length !== 15) errors.push(`expected 15 stocks, got ${series.stocks?.length}`);
  for (const k of ['buyhold', 'active', 'sp500']) {
    const v0 = series.lines?.[k]?.[0];
    if (v0 !== undefined && Math.abs(v0 - 100) > 0.05) errors.push(`series.lines.${k} does not start at 100 (got ${v0})`);
  }
}

if (errors.length) {
  console.error('❌ Validation failed:\n - ' + errors.join('\n - '));
  process.exit(1);
}
console.log(`✅ AI-Infra Basket valid — ${strat.rebalances.length} decision(s)` +
  (series ? `, ${series.dates.length} trading days, ${series.stocks.length} holdings.` : ' (series.json not generated yet).'));
