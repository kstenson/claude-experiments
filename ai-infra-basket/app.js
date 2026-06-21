// AI-Infrastructure Basket — renders the three-line performance tracker from
// data/series.json. No build step, no dependencies.

const SVGNS = "http://www.w3.org/2000/svg";
const LINES = [
  { key: "buyhold", label: "Buy & hold", cls: "bh" },
  { key: "active", label: "Active (Fri.)", cls: "act" },
  { key: "sp500", label: "S&P 500", cls: "sp" },
];

let D = null;          // the loaded series
let selectedIdx = -1;  // index into D.dates currently shown in the readout

const fmtDate = (iso, opts) =>
  new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB",
    Object.assign({ timeZone: "UTC" }, opts));
const fmtLong = (iso) => fmtDate(iso, { day: "numeric", month: "long", year: "numeric" });
const fmtShort = (iso) => fmtDate(iso, { day: "numeric", month: "short" });
const pct = (v) => (v >= 0 ? "+" : "") + v.toFixed(1) + "%";

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

async function main() {
  const app = document.getElementById("app");
  try {
    const res = await fetch("data/series.json", { cache: "no-cache" });
    if (!res.ok) throw new Error(res.status);
    D = await res.json();
  } catch (err) {
    app.innerHTML = `<p style="padding:40px;color:var(--muted)">Couldn't load the basket data (${esc(err.message)}).</p>`;
    return;
  }

  document.getElementById("asof").textContent = "as of " + fmtLong(D.meta.asOf);
  document.getElementById("blurb").textContent = D.meta.subtitle;
  document.getElementById("footnote").textContent = D.meta.note;

  renderCards();
  renderLegend();
  renderHoldings();
  renderDecisions();
  renderChart();
  selectedIdx = D.dates.length - 1;
  updateReadout(selectedIdx);

  // Shared history navigator — browse to any trading day; the readout follows.
  HistoryNav.mount({
    container: document.getElementById("historyNav"),
    label: "day",
    days: D.dates.map((d) => ({ date: d, label: fmtShort(d) })),
    onSelect: (date) => {
      const i = D.dates.indexOf(date);
      if (i >= 0) { selectedIdx = i; updateReadout(i); drawGuide(i); }
    },
  });

  window.addEventListener("resize", () => { renderChart(); drawGuide(selectedIdx); });
  app.setAttribute("aria-busy", "false");
}

/* ---- headline cards -------------------------------------------------- */
function renderCards() {
  const wrap = document.getElementById("cards");
  const sp = D.stats.sp500.retPct;
  wrap.innerHTML = LINES.map(({ key, label, cls }) => {
    const ret = D.stats[key].retPct;
    const vsSp = key === "sp500" ? null : ret - sp;
    const vsTxt = vsSp === null ? "benchmark"
      : `${pct(vsSp)} vs S&P`;
    const vsCls = vsSp === null ? "" : vsSp >= 0 ? "up" : "down";
    return `<div class="card ${cls}">
      <div class="card-key"><span class="swatch ${cls}"></span>${label}</div>
      <div class="card-ret ${ret >= 0 ? "up" : "down"}">${pct(ret)}</div>
      <div class="card-vs ${vsCls}">${vsTxt}</div>
    </div>`;
  }).join("");
}

function renderLegend() {
  document.getElementById("legend").innerHTML = LINES.map(({ label, cls }) =>
    `<span class="leg"><span class="swatch ${cls}"></span>${label}</span>`).join("");
}

/* ---- holdings table -------------------------------------------------- */
function renderHoldings() {
  const rows = D.stocks.slice().sort((a, b) => b.ytdPct - a.ytdPct);
  const maxAbs = Math.max(...rows.map((s) => Math.abs(s.ytdPct)), 1);
  let lastLayer = null;
  const body = document.getElementById("holdingsBody");
  body.innerHTML = rows.map((s) => {
    const w = Math.min(100, (Math.abs(s.ytdPct) / maxAbs) * 100);
    const up = s.ytdPct >= 0;
    return `<tr>
      <td class="stock">
        <span class="tk">${esc(s.ticker)}</span>
        <span class="nm">${esc(s.name)}</span>
        <span class="ly">${esc(s.layer)}</span>
      </td>
      <td class="num ytd">
        <span class="bar ${up ? "up" : "down"}" style="width:${w}%"></span>
        <span class="val ${up ? "up" : "down"}">${pct(s.ytdPct)}</span>
      </td>
      <td class="num">${(s.weightBuyhold * 100).toFixed(1)}%</td>
      <td class="num">${(s.weightActive * 100).toFixed(1)}%</td>
    </tr>`;
  }).join("");

  // cash row for the active book
  const cw = D.stats.activeCashWeight || 0;
  if (cw > 0.0005) {
    body.insertAdjacentHTML("beforeend", `<tr class="cash">
      <td class="stock"><span class="tk">CASH</span><span class="nm">Dry powder</span></td>
      <td class="num">—</td><td class="num">0.0%</td>
      <td class="num">${(cw * 100).toFixed(1)}%</td></tr>`);
  }
}

/* ---- decision log --------------------------------------------------- */
function renderDecisions() {
  const log = D.decisions.slice().reverse(); // newest first
  document.getElementById("decisions").innerHTML = log.map((d) => `
    <article class="decision">
      <div class="dec-head">
        <span class="dec-date">${fmtLong(d.date)}</span>
        <span class="dec-label">${esc(d.label)}</span>
      </div>
      <p class="dec-why">${esc(d.rationale)}</p>
    </article>`).join("");
}

/* ---- the chart ------------------------------------------------------ */
let chartGeom = null;

function renderChart() {
  const svg = document.getElementById("chart");
  const wrap = svg.parentElement;
  const W = Math.max(320, wrap.clientWidth);
  const H = Math.min(440, Math.max(280, Math.round(W * 0.52)));
  const m = { t: 14, r: 14, b: 26, l: 44 };
  const iw = W - m.l - m.r, ih = H - m.t - m.b;
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.setAttribute("width", W);
  svg.setAttribute("height", H);
  svg.innerHTML = "";

  const n = D.dates.length;
  const all = LINES.flatMap(({ key }) => D.lines[key]);
  let lo = Math.min(...all), hi = Math.max(...all);
  const padv = (hi - lo) * 0.06 || 1;
  lo -= padv; hi += padv;

  const x = (i) => m.l + (n <= 1 ? 0 : (i / (n - 1)) * iw);
  const y = (v) => m.t + ih - ((v - lo) / (hi - lo)) * ih;
  chartGeom = { x, y, m, iw, ih, lo, hi, n };

  // horizontal gridlines, labelled as % return (index-100)
  const ticks = niceTicks(lo, hi, 5);
  for (const t of ticks) {
    const yy = y(t);
    add(svg, "line", { x1: m.l, y1: yy, x2: m.l + iw, y2: yy, class: "grid" });
    add(svg, "text", { x: m.l - 8, y: yy + 3, class: "axis y" }, pct(t - 100));
  }

  // month ticks on x
  let prevMonth = null;
  D.dates.forEach((d, i) => {
    const mo = d.slice(0, 7);
    if (mo !== prevMonth) {
      prevMonth = mo;
      add(svg, "text", { x: x(i), y: H - 8, class: "axis x" },
        fmtDate(d, { month: "short" }));
    }
  });

  // baseline at 100
  if (100 >= lo && 100 <= hi) {
    add(svg, "line", { x1: m.l, y1: y(100), x2: m.l + iw, y2: y(100), class: "base" });
  }

  // the three series
  for (const { key, cls } of LINES) {
    const pts = D.lines[key].map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
    add(svg, "polyline", { points: pts, class: `series ${cls}` });
  }

  // rebalance markers on the active line
  for (const dec of D.decisions) {
    const i = D.dates.indexOf(dec.date);
    if (i < 0) continue;
    add(svg, "circle", { cx: x(i), cy: y(D.lines.active[i]), r: 3.5, class: "reb" });
  }

  // hover capture
  const guide = add(svg, "line", { class: "guide", x1: 0, y1: m.t, x2: 0, y2: m.t + ih, style: "opacity:0" });
  guide.id = "guide";
  const hit = add(svg, "rect", { x: m.l, y: m.t, width: iw, height: ih, fill: "transparent", style: "cursor:crosshair" });
  hit.addEventListener("pointermove", (e) => {
    const r = svg.getBoundingClientRect();
    const px = (e.clientX - r.left) * (W / r.width);
    let i = Math.round(((px - m.l) / iw) * (n - 1));
    i = Math.max(0, Math.min(n - 1, i));
    selectedIdx = i; updateReadout(i); drawGuide(i);
  });

  drawGuide(selectedIdx < 0 ? n - 1 : selectedIdx);
}

function drawGuide(i) {
  if (!chartGeom || i < 0) return;
  const g = document.getElementById("guide");
  if (!g) return;
  const xx = chartGeom.x(i);
  g.setAttribute("x1", xx); g.setAttribute("x2", xx);
  g.style.opacity = "1";
}

function updateReadout(i) {
  const el = document.getElementById("readout");
  const d = D.dates[i];
  const rows = LINES.map(({ key, label, cls }) => {
    const ret = D.lines[key][i] - 100;
    return `<div class="ro-row"><span class="swatch ${cls}"></span>
      <span class="ro-lab">${label}</span>
      <span class="ro-val ${ret >= 0 ? "up" : "down"}">${pct(ret)}</span></div>`;
  }).join("");
  el.innerHTML = `<div class="ro-date">${fmtShort(d)} <span class="ro-yr">${d.slice(0, 4)}</span></div>${rows}`;
}

/* ---- helpers -------------------------------------------------------- */
function add(parent, tag, attrs, text) {
  const el = document.createElementNS(SVGNS, tag);
  for (const k in attrs) el.setAttribute(k, attrs[k]);
  if (text != null) el.textContent = text;
  parent.appendChild(el);
  return el;
}

function niceTicks(lo, hi, count) {
  const span = hi - lo;
  const step0 = span / count;
  const mag = Math.pow(10, Math.floor(Math.log10(step0)));
  const norm = step0 / mag;
  const step = (norm >= 5 ? 5 : norm >= 2 ? 2 : 1) * mag;
  const out = [];
  for (let t = Math.ceil(lo / step) * step; t <= hi; t += step) out.push(Math.round(t));
  return out;
}

main();
