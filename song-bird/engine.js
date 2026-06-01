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

/* ---- Spoken word ---------------------------------------------------- */

const synth = window.speechSynthesis;
let speechQueue = [];
let speechTimer = null;
let currentUtterance = null;
let cachedVoices = [];

// Voices populate asynchronously in most browsers — getVoices() is often empty
// on first call until the "voiceschanged" event fires. Cache them as they load.
function loadVoices() {
  cachedVoices = synth ? synth.getVoices() : [];
}
if (synth) {
  loadVoices();
  synth.addEventListener("voiceschanged", loadVoices);
}

// Browsers only let speech begin from a user gesture. Our voice enters a few
// seconds *after* the play click (on a timer), which browsers treat as "not a
// gesture" and silently drop — that's why TTS appeared dead. Speaking a
// near-silent utterance synchronously inside the click unlocks the channel so
// the real, delayed lines play.
function primeSpeech() {
  if (!synth) return;
  try {
    synth.resume();
    const warm = new SpeechSynthesisUtterance(" ");
    warm.volume = 0;
    synth.speak(warm);
  } catch (e) {
    /* speech unsupported — fail quietly */
  }
}

function buildSpeechQueue(song) {
  const lines = [];
  (song.lyrics || []).forEach((sec) => {
    // Add a longer pause before each section
    lines.push({ pause: 2500 });
    (sec.lines || []).forEach((line) => {
      lines.push({ text: line });
    });
  });
  return lines;
}

function getSpeechParams(song) {
  // Map mood score (-1..1) to speech characteristics
  const score = (song.mood && typeof song.mood.score === "number") ? song.mood.score : 0;
  const bpm = (song.style && song.style.bpm) || 90;

  // Slower BPM → slower speech. Score affects pitch slightly.
  const rate = Math.max(0.6, Math.min(1.0, bpm / 120));
  const pitch = Math.max(0.7, Math.min(1.2, 0.95 + score * 0.15));

  return { rate, pitch };
}

function highlightLine(lineText) {
  const allLines = document.querySelectorAll(".lyric-line");
  allLines.forEach((el) => {
    if (el.textContent === lineText) {
      el.classList.add("speaking");
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      el.classList.remove("speaking");
    }
  });
}

function clearHighlights() {
  document.querySelectorAll(".lyric-line.speaking").forEach((el) => {
    el.classList.remove("speaking");
  });
}

function speakNext() {
  if (!playing || speechQueue.length === 0) {
    clearHighlights();
    return;
  }

  const item = speechQueue.shift();

  if (item.pause) {
    clearHighlights();
    speechTimer = setTimeout(speakNext, item.pause);
    return;
  }

  // Chrome quietly suspends the speech queue between utterances; nudge it awake.
  synth.resume();

  const params = getSpeechParams(SONG);
  const utt = new SpeechSynthesisUtterance(item.text);
  utt.rate = params.rate;
  utt.pitch = params.pitch;
  utt.volume = 0.85;

  // Try to pick a good voice
  const voices = cachedVoices.length ? cachedVoices : synth.getVoices();
  const preferred = voices.find((v) => /samantha|daniel|karen|google.*us/i.test(v.name));
  if (preferred) utt.voice = preferred;

  utt.onstart = () => highlightLine(item.text);
  utt.onend = () => {
    // Pause between lines — proportional to line length for natural pacing
    const gap = Math.min(1800, 400 + item.text.length * 12);
    speechTimer = setTimeout(speakNext, gap);
  };
  utt.onerror = () => {
    speechTimer = setTimeout(speakNext, 500);
  };

  currentUtterance = utt;
  synth.speak(utt);
}

function startSpeech(song) {
  stopSpeech();
  speechQueue = buildSpeechQueue(song);
  // Let the instrumental establish for a few seconds before voice enters
  speechTimer = setTimeout(speakNext, 4000);
}

function stopSpeech() {
  synth.cancel();
  clearTimeout(speechTimer);
  speechQueue = [];
  currentUtterance = null;
  clearHighlights();
}

/* ---- Strudel playback ----------------------------------------------- */

// The same instrument library the official Strudel REPL loads: authentic drum
// machines, a multi-sampled piano, the VCSL orchestral set, EmuSP12, the classic
// Dirt-Samples, and mridangam. Without this, @strudel/web only registers bare
// oscillators — which is exactly why songs sounded like generic synth "tones".
// Loading it here unlocks real sampled instruments and makes .bank() work.
function loadDefaultSamples() {
  const ds = "https://raw.githubusercontent.com/felixroos/dough-samples/main/";
  return Promise.all([
    samples(`${ds}tidal-drum-machines.json`),
    samples(`${ds}piano.json`),
    samples(`${ds}Dirt-Samples.json`),
    samples(`${ds}EmuSP12.json`),
    samples(`${ds}vcsl.json`),
    samples(`${ds}mridangam.json`),
  ]);
}

async function ensureStrudel() {
  if (strudelReady) return;
  await initStrudel({ prebake: loadDefaultSamples });
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
    primeSpeech();
    await buildAndPlay(SONG);
    startSpeech(SONG);
    playing = true;
    btn.classList.add("playing");
    btn.querySelector(".play-icon").textContent = "❚❚";
    btn.querySelector(".play-label").textContent = "Pause";
  } else {
    hush();
    stopSpeech();
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
