#!/usr/bin/env node
// Generates assets/banner.svg using the same flow-field algorithm as
// experiment 001 — the README art is produced by the project itself.
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const W = 1200, H = 380;
const PALETTE = ['#7c7cff', '#ff7cc3', '#5ad7ff', '#b388ff'];

// ---- value noise (same shape as the experiment) ----
let seed = 1337;
const rng = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
const perm = new Uint8Array(512);
(() => {
  const p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) { const j = (rng() * (i + 1)) | 0; [p[i], p[j]] = [p[j], p[i]]; }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
})();
const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
const lerp = (a, b, t) => a + (b - a) * t;
const grad = (h, x, y) => (h & 1 ? -x : x) + (h & 2 ? -y : y);
function noise(x, y) {
  const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
  x -= Math.floor(x); y -= Math.floor(y);
  const u = fade(x), v = fade(y);
  const a = perm[X] + Y, b = perm[X + 1] + Y;
  return lerp(lerp(grad(perm[a], x, y), grad(perm[b], x - 1, y), u),
              lerp(grad(perm[a + 1], x, y - 1), grad(perm[b + 1], x - 1, y - 1), u), v);
}
const angle = (x, y) => noise(x * 0.0022, y * 0.0022) * Math.PI * 2.4;

// ---- trace particles into polylines ----
const paths = [];
const N = 320, STEPS = 46, STEP = 7;
for (let i = 0; i < N; i++) {
  let x = rng() * W, y = rng() * H;
  const pts = [];
  for (let s = 0; s < STEPS; s++) {
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    const a = angle(x, y);
    x += Math.cos(a) * STEP;
    y += Math.sin(a) * STEP;
    if (x < -20 || x > W + 20 || y < -20 || y > H + 20) break;
  }
  if (pts.length > 3) paths.push({ d: pts.join(' '), c: PALETTE[(rng() * PALETTE.length) | 0] });
}

const lines = paths.map(
  (p) => `<polyline points="${p.d}" fill="none" stroke="${p.c}" stroke-width="1.1" stroke-opacity="0.5" stroke-linecap="round"/>`
).join('\n    ');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Claude Experiments — a new web experiment every day">
  <defs>
    <radialGradient id="aur1" cx="18%" cy="25%" r="55%">
      <stop offset="0%" stop-color="#7c7cff" stop-opacity="0.35"/><stop offset="100%" stop-color="#7c7cff" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="aur2" cx="88%" cy="18%" r="55%">
      <stop offset="0%" stop-color="#ff7cc3" stop-opacity="0.28"/><stop offset="100%" stop-color="#ff7cc3" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="aur3" cx="60%" cy="95%" r="55%">
      <stop offset="0%" stop-color="#5ad7ff" stop-opacity="0.22"/><stop offset="100%" stop-color="#5ad7ff" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="title" x1="0" y1="0" x2="1" y2="0.4">
      <stop offset="0%" stop-color="#ffffff"/><stop offset="55%" stop-color="#7c7cff"/><stop offset="100%" stop-color="#ff7cc3"/>
    </linearGradient>
    <linearGradient id="scrim" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#0a0a0f" stop-opacity="0.92"/><stop offset="55%" stop-color="#0a0a0f" stop-opacity="0.45"/><stop offset="100%" stop-color="#0a0a0f" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="#0a0a0f"/>
  <rect width="${W}" height="${H}" fill="url(#aur1)"/>
  <rect width="${W}" height="${H}" fill="url(#aur2)"/>
  <rect width="${W}" height="${H}" fill="url(#aur3)"/>

  <g>
    ${lines}
  </g>

  <rect width="${W}" height="${H}" fill="url(#scrim)"/>

  <g font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif">
    <text x="64" y="150" font-size="30" letter-spacing="6" fill="#9a9ab0">A  DAILY  CREATIVE  LAB</text>
    <text x="60" y="232" font-size="76" font-weight="800" fill="url(#title)">Claude Experiments</text>
    <text x="64" y="286" font-size="27" fill="#c2c2d4">One new web experiment, every day — each with a story behind it.</text>
  </g>
</svg>
`;

mkdirSync(join(process.cwd(), 'assets'), { recursive: true });
writeFileSync(join(process.cwd(), 'assets', 'banner.svg'), svg);
console.log(`Wrote assets/banner.svg (${paths.length} flow lines, ${svg.length} bytes)`);
