# 🎧 Podcast Digest

Turns a week of podcast subscriptions into **one short episode of its own**.
Claude goes through every new episode, says what each show covered and
whether it's worth your time, and splices in the best moments in the original
hosts' own voices. The result is a real podcast feed, with chapters, that you
can subscribe to in any app.

**Page:** `index.html` · **Feed:** `feed.xml`

```
subscriptions.opml ─▶ RSS feeds ─▶ this week's episodes
                                        │
             publisher transcript ◀─────┤ (or local Whisper)
                                        ▼
                    Claude: summary · verdict · clip picks   (per episode)
                                        ▼
                    Claude: run-sheet — narration ⇄ clips     (whole week)
                                        ▼
         TTS narration + ffmpeg-cut clips ─▶ loudness-matched splice ─▶ MP3 + chapters
                                        ▼
                     feed.xml · chapters/*.json · data/episodes.json
```

## How a week is made

1. **Collect.** Read `subscriptions.opml` (export it from your podcast app),
   fetch each feed, and keep episodes from the last 7 days (capped per show).
2. **Transcribe.** Use the publisher's own transcript when the feed ships one
   (`<podcast:transcript>`: VTT, SRT or JSON). Otherwise run
   [faster-whisper](https://github.com/SYSTRAN/faster-whisper) locally.
   With no transcript at all, the episode is summarised from its show notes
   and contributes no clips.
3. **Analyse** (one Claude call per episode). Summary, key points, a
   *must listen / worth a listen / skippable* verdict, and up to two clips.
   Claude picks clips **by transcript segment number**, never raw times, so it
   can only point at audio that exists. Code converts the picks to timestamps,
   caps each clip (45 s by default) and drops overlaps.
4. **Write** (one Claude call). The run-sheet: a cold open, a chapter per
   story (grouping related ones across shows), an intro before each clip and a
   line after it, an outro, and the show notes.
5. **Produce.** Narration goes through TTS and clips are cut with short fades.
   Every piece is normalised to −16 LUFS so the voices match, then ffmpeg
   splices them into a mono MP3 with ID3 chapters.
6. **Publish.** Writes `feed.xml` (RSS + iTunes + Podcasting 2.0 chapters),
   `chapters/<date>.json` and `data/episodes.json`, which drives the web page.

Everything is cached per episode under `.cache/`, so re-running a week only
pays for what changed.

## Run it locally

```bash
cd podcast-digest
pip install -r requirements.txt          # add faster-whisper for local transcription
export ANTHROPIC_API_KEY=…
python -m digest list                    # which episodes this week would cover
python -m digest build --plan-only       # analyse + write the script, no audio
python -m digest build                   # the full episode → episodes/<date>.mp3
python -m digest build --date 2026-10-04 # a specific week
```

Needs `ffmpeg`, built with `libflite` for the offline voice (Ubuntu/Debian builds have it).

## Configure (`config.toml`)

| Section | What you'd change |
|---|---|
| `[show]` | Name, host, description, site URL. `private = true` adds `itunes:block`. |
| `[digest]` | Look-back window, episodes per show, clips per episode, max clip length, target minutes. |
| `[claude]` | Model (default `claude-opus-5-5`) and effort. |
| `[transcribe]` | Use publisher transcripts; Whisper on/off and model size. |
| `[tts]` | `flite` (offline, robotic, free), `openai` (`OPENAI_API_KEY`) or `elevenlabs` (`ELEVENLABS_API_KEY`), plus voice. |
| `[audio]` | Bitrate, gap between pieces, and where the MP3 is served from. |

To use your own subscriptions, replace `subscriptions.opml` with your app's export.

## The weekly run

`.github/workflows/podcast-digest.yml` runs every Sunday at 06:17 UTC, or on
demand via *Run workflow*. It needs an **`ANTHROPIC_API_KEY`** repository
secret, plus `OPENAI_API_KEY` or `ELEVENLABS_API_KEY` if you pick that voice.
It builds the episode and uploads the MP3 as a **GitHub Release asset**, so
audio never bloats the git history. Then it commits the updated feed and data
for GitHub Pages to serve. On pushes and PRs it runs the test suite instead.

## Tests

```bash
python -m unittest discover -s tests -v
```

The tests cover feed, OPML and transcript parsing, clip validation, the feed
XML, and the Claude request shape (with a stub client). They also run an
end-to-end build against a local HTTP "podcast host", with real ffmpeg, real
TTS and a real splice, and only Claude stubbed.

## Caveats

- **Copyright.** The digest re-uses short excerpts of other people's shows.
  Clips are capped and always introduced with attribution, but treat the feed
  as personal: keep `private = true` and don't submit it to directories.
- **Dynamic ad insertion.** Some hosts stitch different ads into each download,
  so a publisher transcript's timestamps can drift from the audio you got.
  If clips land in the wrong place for a show, set `[transcribe] published = false`
  to transcribe the downloaded file itself.
- **Transcripts are untrusted input.** The prompt tells Claude to treat them as
  content, never as instructions, and clip IDs are validated in code.
