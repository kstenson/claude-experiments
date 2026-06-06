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
  const container = $("historyNav");
  if (!container || !window.HistoryNav) return;
  const days = (index && index.days) || [];
  if (days.length < 2) { container.hidden = true; return; }
  container.hidden = false;
  // Switching songs reloads the page (Strudel playback can't be swapped live),
  // so the shared nav drives the ?date= query param rather than a #hash.
  HistoryNav.mount({
    container,
    label: "song",
    useHash: false,
    current: currentDate,
    days: days.map((d) => ({ date: d.date, label: d.title || "Untitled" })),
    onSelect: (date) => {
      if (date === currentDate) return;
      window.location.search = "?date=" + encodeURIComponent(date);
    },
  });
}

/* ---- Spoken word ---------------------------------------------------- */

const synth = window.speechSynthesis;
let speechQueue = [];
let speechTimer = null;
let currentUtterance = null;
let cachedVoices = [];

// User voice preferences, persisted across visits. rate/pitch are null when the
// listener wants the mood-derived "auto" value; voiceURI null means auto-pick.
const VOICE_KEY = "songbird.voice";
const voicePrefs = loadVoicePrefs();

function loadVoicePrefs() {
  const defaults = { enabled: true, voiceURI: null, rate: null, pitch: null };
  try {
    return Object.assign(defaults, JSON.parse(localStorage.getItem(VOICE_KEY) || "{}"));
  } catch (e) {
    return defaults;
  }
}

function saveVoicePrefs() {
  try {
    localStorage.setItem(VOICE_KEY, JSON.stringify(voicePrefs));
  } catch (e) {
    /* storage unavailable (private mode) — preferences just won't persist */
  }
}

// Resolve the SpeechSynthesisVoice to use: the user's pick if set and still
// present, otherwise a sensible default, otherwise the browser default.
function pickVoice() {
  const voices = cachedVoices.length ? cachedVoices : (synth ? synth.getVoices() : []);
  if (voicePrefs.voiceURI) {
    const chosen = voices.find((v) => v.voiceURI === voicePrefs.voiceURI);
    if (chosen) return chosen;
  }
  return voices.find((v) => /samantha|daniel|karen|google.*us/i.test(v.name)) || null;
}

// Voices populate asynchronously in most browsers — getVoices() is often empty
// on first call until the "voiceschanged" event fires. Cache them as they load.
function loadVoices() {
  cachedVoices = synth ? synth.getVoices() : [];
  populateVoiceSelect();
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

// The mood-derived "auto" speech characteristics — the default the sliders
// fall back to when the user hasn't overridden them.
function autoSpeechParams(song) {
  const score = (song.mood && typeof song.mood.score === "number") ? song.mood.score : 0;
  const bpm = (song.style && song.style.bpm) || 90;

  // Slower BPM → slower speech. Score affects pitch slightly.
  const rate = Math.max(0.6, Math.min(1.0, bpm / 120));
  const pitch = Math.max(0.7, Math.min(1.2, 0.95 + score * 0.15));

  return { rate, pitch };
}

function getSpeechParams(song) {
  const auto = autoSpeechParams(song);
  return {
    rate: voicePrefs.rate != null ? voicePrefs.rate : auto.rate,
    pitch: voicePrefs.pitch != null ? voicePrefs.pitch : auto.pitch,
  };
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

  const chosen = pickVoice();
  if (chosen) utt.voice = chosen;

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
  if (!voicePrefs.enabled) return;
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

/* ---- Voice controls ------------------------------------------------- */

function populateVoiceSelect() {
  const sel = $("voice-select");
  if (!sel) return;
  const voices = cachedVoices;
  // English voices first (most relevant), then the rest — both alphabetical.
  const sorted = [...voices].sort((a, b) => {
    const ae = /^en/i.test(a.lang) ? 0 : 1;
    const be = /^en/i.test(b.lang) ? 0 : 1;
    return ae - be || a.name.localeCompare(b.name);
  });
  sel.innerHTML = "";
  const auto = document.createElement("option");
  auto.value = "";
  auto.textContent = "Auto (best available)";
  sel.appendChild(auto);
  sorted.forEach((v) => {
    const opt = document.createElement("option");
    opt.value = v.voiceURI;
    opt.textContent = `${v.name} (${v.lang})`;
    sel.appendChild(opt);
  });
  sel.value = voicePrefs.voiceURI || "";
}

// Sync slider positions / labels to the effective values (override or auto).
function refreshVoiceUI() {
  const enabled = $("voice-enabled");
  const rate = $("voice-rate");
  const pitch = $("voice-pitch");
  if (!enabled || !rate || !pitch) return;
  const eff = getSpeechParams(SONG || {});
  enabled.checked = voicePrefs.enabled;
  rate.value = eff.rate;
  pitch.value = eff.pitch;
  $("rate-val").textContent = `${Number(eff.rate).toFixed(2)}×`;
  $("pitch-val").textContent = Number(eff.pitch).toFixed(2);
}

function initVoiceControls() {
  const panel = $("voice-panel");
  if (!panel) return;

  // No speech support at all — hide the panel rather than show dead controls.
  if (!synth) { panel.hidden = true; return; }

  populateVoiceSelect();
  refreshVoiceUI();

  $("voice-enabled").addEventListener("change", (e) => {
    voicePrefs.enabled = e.target.checked;
    saveVoicePrefs();
    // Apply immediately if a song is playing.
    if (playing) {
      if (voicePrefs.enabled) startSpeech(SONG);
      else stopSpeech();
    }
  });

  $("voice-select").addEventListener("change", (e) => {
    voicePrefs.voiceURI = e.target.value || null;
    saveVoicePrefs();
  });

  $("voice-rate").addEventListener("input", (e) => {
    voicePrefs.rate = Number(e.target.value);
    $("rate-val").textContent = `${voicePrefs.rate.toFixed(2)}×`;
    saveVoicePrefs();
  });

  $("voice-pitch").addEventListener("input", (e) => {
    voicePrefs.pitch = Number(e.target.value);
    $("pitch-val").textContent = voicePrefs.pitch.toFixed(2);
    saveVoicePrefs();
  });

  $("voice-reset").addEventListener("click", () => {
    voicePrefs.rate = null;
    voicePrefs.pitch = null;
    voicePrefs.voiceURI = null;
    saveVoicePrefs();
    $("voice-select").value = "";
    refreshVoiceUI();
  });
}

/* ---- Strudel playback ----------------------------------------------- */

// The same instrument library the official Strudel REPL loads: authentic drum
// machines, a multi-sampled piano, the VCSL orchestral set, EmuSP12, the classic
// Dirt-Samples, and mridangam. Without this, @strudel/web only registers bare
// oscillators — which is exactly why songs sounded like generic synth "tones".
// Loaded *after* init (never via initStrudel's prebake): a failed sample fetch
// must never abort init, or the core scope functions (stack, note, s) never get
// registered and every pattern dies with "Can't find variable: stack".
async function loadDefaultSamples() {
  const ds = "samples/";
  const files = [
    "tidal-drum-machines.json", "piano.json", "Dirt-Samples.json",
    "EmuSP12.json", "vcsl.json",
  ];
  // Load each independently so one bad fetch doesn't sink the rest.
  const results = await Promise.all(
    files.map((f) =>
      Promise.resolve(samples(ds + f))
        .then(() => { console.log("✓ Loaded:", f); return true; })
        .catch((e) => {
          console.warn("✗ Sample pack failed:", f, e);
          return false;
        })
    )
  );
  const loaded = results.filter(Boolean).length;
  console.log(`Sample loading: ${loaded}/${files.length} packs loaded`);
  if (loaded === 0) console.error("NO sample packs loaded — only oscillators will play");
}

async function ensureStrudel() {
  if (strudelReady) return;
  // Plain init first — this is what registers the Strudel globals (stack, note,
  // s, …) that the pattern eval depends on. Only then enrich with samples.
  await initStrudel();
  strudelReady = true;
  await loadDefaultSamples();
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
    console.log("Pattern playing at", bpm, "bpm (cpm=" + (bpm/4) + ")");
  } catch (e) {
    console.error("Pattern evaluation failed:", e);
    const info = $("sample-info");
    if (info) {
      info.textContent = "Pattern error: " + e.message;
      info.hidden = false;
    }
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
    initVoiceControls();
    $("play").addEventListener("click", togglePlay);
  } catch (e) {
    $("title").textContent = "Couldn't load today's song";
    $("summary").textContent = String(e);
  }
})();
