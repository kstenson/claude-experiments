/* Song Bird engine
 * Loads song.json and (1) renders the page, (2) builds a Tone.js arrangement
 * that is synthesized live in the browser. No audio files are used.
 *
 * song.json is regenerated daily; this engine never changes — it just
 * interprets whatever the day's data describes.
 */

let SONG = null;
let built = false;
let playing = false;

const $ = (id) => document.getElementById(id);

// Cache-bust so freshly regenerated files are picked up.
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

function applyTheme(song) {
  const p = (song.mood && song.mood.palette) || {};
  const root = document.documentElement.style;
  if (p.bg) root.setProperty("--bg", p.bg);
  if (p.bg2) root.setProperty("--bg2", p.bg2);
  if (p.accent) root.setProperty("--accent", p.accent);
  if (p.accent2) root.setProperty("--accent2", p.accent2);
  if (p.text) root.setProperty("--text", p.text);
}

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

  // Mood score is -1..1; map to 0..100% of the bar.
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
}

function renderHistory(index, currentDate) {
  const wrap = $("archive");
  const sel = $("history");
  if (!wrap || !sel) return;
  const days = (index && index.days) || [];
  // Only show the picker once there's more than one day to browse.
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
    // Navigate by date; a reload cleanly resets the audio engine.
    window.location.search = "?date=" + encodeURIComponent(sel.value);
  };
}

/* ---- Audio arrangement ---------------------------------------------- */

function buildArrangement(song) {
  const style = song.style || {};
  const fx = song.fx || {};

  Tone.Transport.bpm.value = style.bpm || 90;
  Tone.Transport.swing = style.swing || 0;
  Tone.Transport.swingSubdivision = "8n";

  // Master FX chain: gentle compression -> filter -> reverb -> out
  const reverb = new Tone.Reverb({ decay: 3.5, wet: clamp(fx.reverb, 0, 0.9, 0.3) }).toDestination();
  const filter = new Tone.Filter(clamp(fx.filter, 200, 12000, 3000), "lowpass").connect(reverb);
  const master = new Tone.Compressor(-18, 3).connect(filter);

  const parts = [];

  // Pad / chords
  if (song.chords && song.chords.steps && song.chords.steps.length) {
    const pad = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "fatsawtooth", count: 3, spread: 22 },
      envelope: { attack: 0.6, decay: 0.3, sustain: 0.7, release: 2.2 },
      volume: -16,
    }).connect(master);
    const seq = new Tone.Sequence(
      (time, chord) => { if (chord) pad.triggerAttackRelease(chord, "1m", time, 0.6); },
      song.chords.steps,
      song.chords.subdivision || "1m"
    );
    seq.start(0);
    parts.push(seq, pad);
  }

  // Bass
  if (song.bass && song.bass.steps && song.bass.steps.length) {
    const bass = new Tone.MonoSynth({
      oscillator: { type: "square" },
      filter: { Q: 2, type: "lowpass" },
      envelope: { attack: 0.02, decay: 0.2, sustain: 0.4, release: 0.4 },
      filterEnvelope: { attack: 0.02, decay: 0.2, baseFrequency: 120, octaves: 2.5 },
      volume: -14,
    }).connect(master);
    const seq = new Tone.Sequence(
      (time, note) => { if (note) bass.triggerAttackRelease(note, "8n", time); },
      song.bass.steps,
      song.bass.subdivision || "4n"
    );
    seq.start(0);
    parts.push(seq, bass);
  }

  // Melody / lead
  if (song.melody && song.melody.steps && song.melody.steps.length) {
    const lead = new Tone.Synth({
      oscillator: { type: "triangle" },
      envelope: { attack: 0.01, decay: 0.2, sustain: 0.3, release: 0.6 },
      volume: -10,
    }).connect(master);
    const seq = new Tone.Sequence(
      (time, note) => { if (note) lead.triggerAttackRelease(note, "8n", time, 0.8); },
      song.melody.steps,
      song.melody.subdivision || "8n"
    );
    seq.start(0);
    parts.push(seq, lead);
  }

  // Drums (optional)
  if (song.drums) {
    const sub = song.drums.subdivision || "8n";
    if (song.drums.kick) {
      const kick = new Tone.MembraneSynth({ volume: -8 }).connect(master);
      const seq = new Tone.Sequence(
        (time, hit) => { if (hit) kick.triggerAttackRelease("C1", "8n", time); },
        song.drums.kick, sub
      );
      seq.start(0);
      parts.push(seq, kick);
    }
    if (song.drums.hat) {
      const hat = new Tone.NoiseSynth({
        noise: { type: "white" },
        envelope: { attack: 0.001, decay: 0.05, sustain: 0 },
        volume: -22,
      }).connect(master);
      const seq = new Tone.Sequence(
        (time, hit) => { if (hit) hat.triggerAttackRelease("16n", time); },
        song.drums.hat, sub
      );
      seq.start(0);
      parts.push(seq, hat);
    }
  }

  return parts;
}

function clamp(v, lo, hi, fallback) {
  if (typeof v !== "number" || isNaN(v)) return fallback;
  return Math.min(hi, Math.max(lo, v));
}

/* ---- Wiring --------------------------------------------------------- */

async function togglePlay() {
  const btn = $("play");
  if (!playing) {
    await Tone.start();
    if (!built) { buildArrangement(SONG); built = true; }
    Tone.Transport.start();
    playing = true;
    btn.classList.add("playing");
    btn.querySelector(".play-icon").textContent = "❚❚";
    btn.querySelector(".play-label").textContent = "Pause";
  } else {
    Tone.Transport.pause();
    playing = false;
    btn.classList.remove("playing");
    btn.querySelector(".play-icon").textContent = "►";
    btn.querySelector(".play-label").textContent = "Resume today's song";
  }
}

(async function init() {
  try {
    const index = await loadIndex();
    const days = (index && index.days) || [];
    if (!days.length) throw new Error("No songs in the archive yet.");

    // Pick the requested day (?date=YYYY-MM-DD) if valid, else the newest.
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
