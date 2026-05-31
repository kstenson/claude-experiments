#!/usr/bin/env node
/* Build the Song Bird archive index.
 *
 * Scans songs/YYYY-MM-DD.json, writes songs/index.json (a lightweight
 * manifest, newest first), and copies the newest day to ./song.json for
 * backward compatibility. Run this after dropping a new day's file:
 *
 *   node build-index.js
 *
 * No dependencies — plain Node.
 */

const fs = require("fs");
const path = require("path");

const songsDir = path.join(__dirname, "songs");
const datePattern = /^(\d{4}-\d{2}-\d{2})\.json$/;

const days = fs
  .readdirSync(songsDir)
  .map((f) => datePattern.exec(f))
  .filter(Boolean)
  .map((m) => {
    const date = m[1];
    const song = JSON.parse(fs.readFileSync(path.join(songsDir, date + ".json"), "utf8"));
    return {
      date,
      title: song.title || "Untitled",
      genre: (song.style && song.style.genre) || "",
      mood: {
        label: (song.mood && song.mood.label) || "",
        score: song.mood && typeof song.mood.score === "number" ? song.mood.score : 0,
      },
    };
  })
  .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)); // newest first

if (!days.length) {
  console.error("No songs/YYYY-MM-DD.json files found — nothing to index.");
  process.exit(1);
}

const index = {
  generatedBy: "world-mode-score",
  updated: days[0].date,
  count: days.length,
  days,
};

fs.writeFileSync(path.join(songsDir, "index.json"), JSON.stringify(index, null, 2) + "\n");

// Backward compat: ./song.json mirrors the newest day.
const newest = days[0].date;
fs.copyFileSync(path.join(songsDir, newest + ".json"), path.join(__dirname, "song.json"));

console.log(`Indexed ${days.length} day(s); newest = ${newest}.`);
