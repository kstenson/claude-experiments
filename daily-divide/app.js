// Daily Divide — renders the day from JSON data files. No build step, no deps.
// Loads data/manifest.json, then the day files, and draws the meter + breakdown.

const SVGNS = "http://www.w3.org/2000/svg";
const VERDICT_LABEL = {
  "supported": "Supported",
  "mostly-supported": "Mostly true",
  "mixed": "Mixed",
  "mostly-false": "Mostly false",
  "false": "False",
  "unverifiable": "Unverifiable",
};

let DAYS = [];     // oldest -> newest
let TODAY = null;

function fmtDate(iso, opts) {
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString("en-GB", Object.assign({ timeZone: "UTC" }, opts));
}
const fmtLong = (iso) => fmtDate(iso, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const fmtShort = (iso) => fmtDate(iso, { day: "numeric", month: "short" });

async function getJSON(url) {
  const res = await fetch(url, { cache: "no-cache" });
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return res.json();
}

function escapeHTML(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

async function main() {
  const app = document.getElementById("app");
  try {
    const manifest = await getJSON("data/manifest.json");
    const dates = (manifest.days || []).slice(0, 90).reverse(); // oldest -> newest
    const loaded = await Promise.allSettled(dates.map((d) => getJSON(`data/${d}.json`)));
    DAYS = loaded.filter((r) => r.status === "fulfilled").map((r) => r.value);
    if (!DAYS.length) throw new Error("no day data");
    TODAY = DAYS[DAYS.length - 1];
  } catch (err) {
    app.innerHTML = `<p style="padding:40px;color:var(--muted)">Couldn't load today's data. ${escapeHTML(err.message)}</p>`;
    return;
  }

  renderIntro(TODAY);
  renderMeter(TODAY);
  renderSides(TODAY);
  renderSummary(TODAY);
  renderFacts(TODAY);
  renderNotAdjudicable(TODAY);
  renderBiasWatch(TODAY);
  renderHistory(DAYS);
  renderSources(TODAY);
  app.setAttribute("aria-busy", "false");
}

function renderIntro(day) {
  document.getElementById("date").textContent = fmtLong(day.date);
  document.getElementById("topic").textContent = day.topic || "—";
  document.getElementById("question").textContent = day.question || "";
}

// Needle: -100 (left) .. +100 (right) -> 0%..100% across the track.
function renderMeter(day) {
  const n = Math.max(-100, Math.min(100, day.needle ?? 0));
  const pct = (n + 100) / 2; // -100 -> 0%, 0 -> 50%, +100 -> 100%
  const needle = document.getElementById("needle");
  requestAnimationFrame(() => { needle.style.left = pct + "%"; });

  const read = document.getElementById("meterRead");
  const mag = Math.abs(n);
  let strength = "dead even";
  if (mag >= 1 && mag < 12) strength = "leans slightly";
  else if (mag >= 12 && mag < 30) strength = "leans";
  else if (mag >= 30 && mag < 55) strength = "clearly favors";
  else if (mag >= 55) strength = "strongly favors";
  if (n === 0) {
    read.textContent = "The facts land dead center today.";
    read.style.color = "var(--neutral)";
  } else {
    const side = n < 0 ? "the LEFT" : "the RIGHT";
    const color = n < 0 ? "var(--left-deep)" : "var(--right-deep)";
    read.textContent = `On the facts, today ${strength} ${side}  ·  needle ${n > 0 ? "+" : ""}${n}`;
    read.style.color = color;
  }
  document.getElementById("verdict").textContent = day.verdict || "";
}

function subscoreHTML(label, val) {
  return `<div class="subscore">
    <div class="subscore-row"><span>${label}</span><b>${val}</b></div>
    <div class="subscore-bar"><i data-w="${val}"></i></div>
  </div>`;
}

function sideHTML(side, which) {
  if (!side) return "";
  const tag = which === "left" ? "The Left" : "The Right";
  return `
    <div class="side-tag">${tag}</div>
    <h3>${escapeHTML(side.label)}</h3>
    <p class="framing">${escapeHTML(side.framing)}</p>
    ${subscoreHTML("Factual accuracy", side.factualAccuracy ?? 0)}
    ${subscoreHTML("Reasoning honesty", side.reasoningHonesty ?? 0)}
    <div class="side-score"><span class="num">${side.score ?? 0}</span><span class="lbl">blended score / 100</span></div>
    ${side.strongestPoint ? `<p class="point strong"><span class="point-lbl">Strongest point —</span> ${escapeHTML(side.strongestPoint)}</p>` : ""}
    ${side.weakestPoint ? `<p class="point weak"><span class="point-lbl">Weakest point —</span> ${escapeHTML(side.weakestPoint)}</p>` : ""}
  `;
}

function renderSides(day) {
  const L = document.getElementById("sideLeft");
  const R = document.getElementById("sideRight");
  L.innerHTML = sideHTML(day.sides?.left, "left");
  R.innerHTML = sideHTML(day.sides?.right, "right");
  requestAnimationFrame(() => {
    document.querySelectorAll(".subscore-bar > i").forEach((el) => { el.style.width = el.dataset.w + "%"; });
  });
}

function renderSummary(day) {
  const root = document.getElementById("summary");
  const paras = (day.summary || "").split(/\n\n+/).filter(Boolean);
  root.innerHTML = paras.map((p) => `<p>${escapeHTML(p)}</p>`).join("");
}

function factHTML(f) {
  const v = f.verdict || "unverifiable";
  const sideTag = f.side ? `<span class="fact-side ${f.side}">${f.side}</span>` : "";
  const src = f.url
    ? `<div class="fact-src"><a href="${escapeHTML(f.url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(f.source || "source")} ↗</a></div>`
    : (f.source ? `<div class="fact-src">${escapeHTML(f.source)}</div>` : "");
  return `<li class="fact">
    <div class="fact-top">
      <span class="fact-claim">${escapeHTML(f.claim)}${sideTag}</span>
      <span class="badge ${v}">${VERDICT_LABEL[v] || v}</span>
    </div>
    ${f.explanation ? `<p class="fact-exp">${escapeHTML(f.explanation)}</p>` : ""}
    ${src}
  </li>`;
}

function renderFacts(day) {
  document.getElementById("facts").innerHTML = (day.facts || []).map(factHTML).join("");
}

function renderNotAdjudicable(day) {
  const list = day.notAdjudicable || [];
  document.getElementById("notAdjudicable").innerHTML =
    list.map((x) => `<li>${escapeHTML(x)}</li>`).join("");
}

function renderBiasWatch(day) {
  document.getElementById("biasWatch").textContent = day.biasWatch || "";
}

function renderSources(day) {
  const root = document.getElementById("sources");
  const list = day.sources_consulted || [];
  if (!list.length) { root.style.display = "none"; return; }
  root.innerHTML = `<b>Sources consulted today:</b> ${list.map(escapeHTML).join(" · ")}`;
}

/* ---------- History chart: needle (-100..+100) over time ---------- */
function renderHistory(days) {
  const svg = document.getElementById("historyChart");
  const tip = document.getElementById("historyTip");
  const series = days.map((d) => ({ date: d.date, value: d.needle ?? 0 }));
  drawNeedleChart(svg, tip, series);

  const cap = document.getElementById("historyCaption");
  if (series.length >= 2) {
    const vals = series.map((s) => s.value);
    cap.textContent = `${series.length} days · most left ${Math.min(...vals)} · most right ${Math.max(...vals)}`;
  } else {
    cap.textContent = "Building history — one day so far";
  }
}

function drawNeedleChart(svg, tip, series) {
  const VB = svg.viewBox.baseVal;
  const W = VB.width, H = VB.height;
  const m = { top: 18, right: 16, bottom: 30, left: 42 };
  const innerW = W - m.left - m.right;
  const innerH = H - m.top - m.bottom;

  svg.innerHTML = "";
  const add = (tag, attrs, cls) => {
    const el = document.createElementNS(SVGNS, tag);
    for (const k in attrs) el.setAttribute(k, attrs[k]);
    if (cls) el.setAttribute("class", cls);
    svg.appendChild(el);
    return el;
  };

  // Y domain fixed at -100..+100 so days stay comparable.
  const yMin = -100, yMax = 100;
  const n = series.length;
  const x = (i) => m.left + (n === 1 ? innerW / 2 : (i * innerW) / (n - 1));
  const y = (v) => m.top + innerH - ((v - yMin) / (yMax - yMin)) * innerH;

  // Gridlines + labels (left / center / right).
  [[100, "right +100"], [50, "+50"], [0, "even 0"], [-50, "−50"], [-100, "left −100"]].forEach(([gv, lab]) => {
    add("line", { x1: m.left, x2: m.left + innerW, y1: y(gv), y2: y(gv) }, gv === 0 ? "zero-line" : "grid");
    const t = add("text", { x: m.left - 8, y: y(gv) + 4, "text-anchor": "end" }, "axis-label");
    t.textContent = lab;
  });

  if (n < 2) {
    const t = add("text", { x: m.left + innerW / 2, y: m.top + innerH / 2, "text-anchor": "middle" }, "axis-label");
    t.textContent = "A trend line appears once there are at least two days.";
    if (n === 1) add("circle", { cx: x(0), cy: y(series[0].value), r: 4 }, "dot");
    return;
  }

  // X labels: first, middle, last.
  const xIdx = n <= 3 ? series.map((_, i) => i) : [0, Math.floor((n - 1) / 2), n - 1];
  [...new Set(xIdx)].forEach((i) => {
    const t = add("text", { x: x(i), y: H - 10, "text-anchor": "middle" }, "axis-label");
    t.textContent = fmtShort(series[i].date);
  });

  const pts = series.map((s, i) => [x(i), y(s.value)]);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const lineEl = add("path", { d: line }, "line");

  const len = lineEl.getTotalLength ? lineEl.getTotalLength() : 0;
  if (len) {
    lineEl.style.strokeDasharray = len;
    lineEl.style.strokeDashoffset = len;
    requestAnimationFrame(() => {
      lineEl.style.transition = "stroke-dashoffset 1s ease";
      lineEl.style.strokeDashoffset = "0";
    });
  }
  add("circle", { cx: pts[n - 1][0], cy: pts[n - 1][1], r: 4 }, "dot");

  // Interactive cursor.
  const cursor = add("line", { x1: 0, x2: 0, y1: m.top, y2: m.top + innerH, opacity: 0 }, "cursor");
  const marker = add("circle", { r: 4, opacity: 0 }, "marker");
  const move = (evt) => {
    const r = svg.getBoundingClientRect();
    const cx = (evt.touches ? evt.touches[0].clientX : evt.clientX) - r.left;
    const px = (cx / r.width) * W;
    let i = Math.round(((px - m.left) / innerW) * (n - 1));
    i = Math.max(0, Math.min(n - 1, i));
    const p = pts[i];
    cursor.setAttribute("x1", p[0]); cursor.setAttribute("x2", p[0]); cursor.setAttribute("opacity", 1);
    marker.setAttribute("cx", p[0]); marker.setAttribute("cy", p[1]); marker.setAttribute("opacity", 1);
    const v = series[i].value;
    tip.hidden = false;
    tip.style.left = (p[0] / W) * 100 + "%";
    tip.style.top = (p[1] / H) * 100 + "%";
    tip.innerHTML = `<b>${v > 0 ? "+" : ""}${v}</b><span class="tip-date">${fmtShort(series[i].date)}</span>`;
  };
  const leave = () => { cursor.setAttribute("opacity", 0); marker.setAttribute("opacity", 0); tip.hidden = true; };
  const hot = add("rect", { x: m.left, y: m.top, width: innerW, height: innerH }, "hot");
  hot.addEventListener("mousemove", move);
  hot.addEventListener("mouseleave", leave);
  hot.addEventListener("touchstart", move, { passive: true });
  hot.addEventListener("touchmove", move, { passive: true });
  hot.addEventListener("touchend", leave);
}

main();
