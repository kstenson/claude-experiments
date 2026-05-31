/* Song Bird engine — Strudel edition
 *
 * Loads a daily song JSON and builds a live Strudel pattern from it.
 * Samples are loaded from the internet on demand; no audio files ship
 * with the site.
 *
 * The JSON schema carries a `pattern` string (Strudel code) plus metadata
 * (mood, lyrics, palette). This engine evaluates the pattern and wires up
 * play/pause and the day picker.
 */

let SONG = null;
let playing = false;
let strudelReady = false;

const $ = (id) => document.getElementById(id);

/* ---- Data loading --------------------------------------------------- */

async function loadJSON(url) {
  const res = await fetch(url + (url.includes("?") ? "&" : "?") + "t=" + Date.now());
  if (!res.ok) throw new Error("Could not load " + url);
  return res.json();
}

async function loadIndex() {
  return loadJSON("songs/index.json");
}

async function loadSong(date) {
  return loadJSON("songs/" + date + ".json");
}

/* ---- Theme ---------------------------------------------------------- */

function applyTheme(song) {
  const p = (song.mood && song.mood.palette) || {};
  const root = document.documentElement.style;
  if (p.bg) root.setProperty("--bg", p.bg);
  if (p.bg2) root.setProperty("--bg2", p.bg2);
  if (p.accent) root.setProperty("--accent", p.accent);
  if (p.accent2) root.setProperty("--accent2", p.accent2);
  if (p.text) root.setProperty("--text", p.text);
}

/* ---- Render --------------------------------------------------------- */

function render(song) {
  $("title").textContent = song.title || "Untitled";
  const d = song.date
    ? new Date(song.date + "T00:00:00").toLocaleDateString(undefined, {
        weekday: "long", year: "numeric", month: "long", day: "numeric",
      })
    : "";
  $("date").textContent = d;
  $("genre").textContent = (song.style && song.style.genre) || "";
  $("mood-label").textContent = (song.mood && song.mood.label) || "";
  $("summary").textContent = (song.mood && song.mood.summary) || "";

  const score = (song.mood && typeof song.mood.score === "number") ? song.mood.score : 0;
  $("mood-fill").style.width = Math.round(((score + 1) / 2) * 100) + "%";

  const src = $("source");
  if (song.source) src.href = song.source;

  $("genby").textContent = song.generatedBy ? "source: " + song.generatedBy : "";

  const wrap = $("lyrics");
  wrap.innerHTML = "";
  (song.lyrics || []).forEach((sec) => {
    const block = document.createElement("div");
    block.className = "lyric-section";
    if (sec.section) {
      const h = document.createElement("h3");
      h.textContent = sec.section;
      block.appendChild(h);
    }
    (sec.lines || []).forEach((line) => {
      const p = document.createElement("p");
      p.className = "lyric-line";
      p.textContent = line;
      block.appendChild(p);
    });
    wrap.appendChild(block);
  });

  // Show sample sources if present
  const sampleInfo = $("sample-info");
  if (sampleInfo && song.sampleSources && song.sampleSources.length) {
    sampleInfo.textContent = "samples: " + song.sampleSources.join(", ");
    sampleInfo.hidden = false;
  }
}

function renderHistory(index, currentDate) {
  const wrap = $("archive");
  const sel = $("history");
  if (!wrap || !sel) return;
  const days = (index && index.days) || [];
  if (days.length < 2) { wrap.hidden = true; return; }
  wrap.hidden = false;
  sel.innerHTML = "";
  days.forEach((d) => {
    const opt = document.createElement("option");
    opt.value = d.date;
    const label = new Date(d.date + "T00:00:00").toLocaleDateString(undefined, {
      month: "short", day: "numeric", year: "numeric",
    });
    opt.textContent = label + " — " + (d.title || "Untitled");
    if (d.date === currentDate) opt.selected = true;
    sel.appendChild(opt);
  });
  sel.onchange = () => {
    window.location.search = "?date=" + encodeURIComponent(sel.value);
  };
}

/* ---- Strudel playback ----------------------------------------------- */

async function ensureStrudel() {
  if (strudelReady) return;
  await initStrudel();
  strudelReady = true;
}

async function buildAndPlay(song) {
  await ensureStrudel();

  // Load any sample packs declared in the song
  if (song.samples) {
    for (const src of song.samples) {
      if (typeof src === "string") {
        // GitHub shorthand or strudel.json URL
        await samples(src);
      } else if (typeof src === "object" && src.map && src.url) {
        // Explicit mapping: { map: { kick: "path.wav" }, url: "https://..." }
        await samples(src.map, src.url);
      }
    }
  }

  // Set tempo — Strudel uses cycles per minute; 1 cycle = 1 bar = 4 beats
  const bpm = (song.style && song.style.bpm) || 90;

  // Evaluate the pattern string.
  // song.pattern is a JS expression that uses Strudel globals (note, s, stack, etc.)
  // and returns a Pattern. We eval it in the global scope where initStrudel() has
  // already registered all functions.
  try {
    const pat = (0, eval)(song.pattern);
    pat.cpm(bpm / 4).play();
  } catch (e) {
    console.error("Pattern evaluation failed:", e);
    $("summary").textContent = "Could not play pattern: " + e.message;
  }
}

async function togglePlay() {
  const btn = $("play");

  if (!playing) {
    await buildAndPlay(SONG);
    playing = true;
    btn.classList.add("playing");
    btn.querySelector(".play-icon").textContent = "❚❚";
    btn.querySelector(".play-label").textContent = "Pause";
  } else {
    hush();
    playing = false;
    btn.classList.remove("playing");
    btn.querySelector(".play-icon").textContent = "►";
    btn.querySelector(".play-label").textContent = "Resume today's song";
  }
}

/* ---- Init ----------------------------------------------------------- */

(async function init() {
  try {
    const index = await loadIndex();
    const days = (index && index.days) || [];
    if (!days.length) throw new Error("No songs in the archive yet.");

    const want = new URLSearchParams(window.location.search).get("date");
    const date = days.some((d) => d.date === want) ? want : days[0].date;

    SONG = await loadSong(date);
    applyTheme(SONG);
    render(SONG);
    renderHistory(index, date);
    $("play").addEventListener("click", togglePlay);
  } catch (e) {
    $("title").textContent = "Couldn't load today's song";
    $("summary").textContent = String(e);
  }
})();
