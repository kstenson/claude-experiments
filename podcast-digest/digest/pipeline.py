"""Fetch → transcribe → analyse → write → voice → splice → publish."""

from __future__ import annotations

import json
import logging
import tomllib
from dataclasses import asdict
from datetime import datetime, timezone
from pathlib import Path

from . import audio, feeds, publish, transcripts, tts
from .writer import Analysis, Clip, Script, Writer

log = logging.getLogger("digest")

ROOT = Path(__file__).resolve().parent.parent


def load_config(path: Path) -> dict:
    with open(path, "rb") as f:
        return tomllib.load(f)


def collect_episodes(cfg: dict, end: datetime, root: Path = ROOT) -> list[feeds.Episode]:
    d = cfg["digest"]
    start, end = feeds.week_window(end, d.get("days", 7))
    picked: list[feeds.Episode] = []
    for sub in feeds.read_opml(root / cfg["subscriptions"]):
        try:
            eps = feeds.fetch_feed(sub["url"], sub["title"])
        except Exception as exc:  # one broken feed shouldn't sink the week
            log.warning("skipping %s: %s", sub["title"], exc)
            continue
        week = feeds.episodes_in_window(eps, start, end, d.get("max_episodes_per_show", 2))
        log.info("%-40s %d episode(s) this week", sub["title"][:40], len(week))
        picked += week
    picked.sort(key=lambda e: e.published)
    return picked[-d.get("max_episodes", 10):]


def _episode_audio(ep: feeds.Episode, cache: Path) -> Path:
    suffix = Path(ep.audio_url.split("?")[0]).suffix or ".mp3"
    return audio.download(ep.audio_url, cache / f"episode{suffix}")


def get_segments(ep: feeds.Episode, cfg: dict, cache: Path) -> list[transcripts.Segment] | None:
    cached = cache / "segments.json"
    if cached.exists():
        return transcripts.load_segments(cached) or None
    segs = transcripts.fetch_published_transcript(ep) if cfg["transcribe"].get("published", True) else None
    source = "published"
    if segs is None and cfg["transcribe"].get("whisper", True):
        log.info("  transcribing with whisper: %s", ep.title)
        segs = transcripts.whisper_transcribe(_episode_audio(ep, cache),
                                              cfg["transcribe"].get("whisper_model", "base"))
        source = "whisper"
    if segs is None:
        log.info("  no transcript for %s — show notes only", ep.title)
        transcripts.save_segments(cached, [])
        return None
    segs = transcripts.merge_segments(segs)
    log.info("  %d segments (%s)", len(segs), source)
    transcripts.save_segments(cached, segs)
    return segs


def analyse(ep: feeds.Episode, segs, writer: Writer, cfg: dict, cache: Path) -> Analysis:
    cached = cache / "analysis.json"
    if cached.exists():
        data = json.loads(cached.read_text())
        return Analysis(ep, data["summary"], data["key_points"], data["worth_it"],
                        [Clip(**c) for c in data["clips"]])
    d = cfg["digest"]
    a = writer.analyse_episode(ep, segs, d.get("max_clips_per_episode", 2),
                               d.get("max_clip_seconds", 45))
    cached.write_text(json.dumps({"summary": a.summary, "key_points": a.key_points,
                                  "worth_it": a.worth_it, "clips": [asdict(c) for c in a.clips]},
                                 indent=1))
    return a


def render(script: Script, analyses: list[Analysis], cfg: dict, work: Path, cache_root: Path,
           out_mp3: Path) -> tuple[float, list[dict]]:
    """Voice the narration, cut the clips, splice. Returns (duration, chapters)."""
    clips = {c.id: (a.episode, c) for a in analyses for c in a.clips}
    gap = cfg["audio"].get("gap_seconds", 0.5)
    pieces: list[Path] = []
    chapters: list[dict] = []
    t = 0.0
    for n, item in enumerate(script.items):
        dest = work / f"{n:03d}.wav"
        if item.kind == "narration":
            tts.speak(item.text, dest, cfg["tts"].get("backend", "flite"), cfg["tts"].get("voice") or None)
            url = ""
        else:
            ep, clip = clips[item.clip_id]
            src = _episode_audio(ep, cache_root / ep.id)
            audio.cut_clip(src, clip.start, clip.end, dest)
            url = ep.link
        if item.chapter:
            chapters.append({"title": item.chapter, "start": t, "url": url})
        elif url and chapters and not chapters[-1].get("url"):
            chapters[-1]["url"] = url
        pieces.append(dest)
        t += audio.duration(dest) + gap
    total = t - gap
    for i, ch in enumerate(chapters):
        ch["end"] = chapters[i + 1]["start"] if i + 1 < len(chapters) else total
    tags = {"title": script.title, "artist": cfg["show"]["host"], "album": cfg["show"]["name"],
            "genre": "Podcast", "comment": script.description[:500]}
    final = audio.splice(pieces, out_mp3, [audio.Chapter(c["title"], c["start"], c["end"]) for c in chapters],
                         tags, work, gap_seconds=gap, bitrate=cfg["audio"].get("bitrate", "96k"))
    return final, chapters


def build(config_path: Path, end: datetime | None = None, plan_only: bool = False,
          writer: Writer | None = None) -> dict | None:
    cfg = load_config(config_path)
    root = config_path.resolve().parent  # all paths are relative to the config file
    audio.require_ffmpeg()
    end = end or datetime.now(timezone.utc)
    date = end.strftime("%Y-%m-%d")
    cache_root = root / ".cache"
    work = cache_root / "_render" / date
    work.mkdir(parents=True, exist_ok=True)

    episodes = collect_episodes(cfg, end, root)
    if not episodes:
        log.warning("No new episodes this week — nothing to do.")
        return None

    writer = writer or Writer(model=cfg.get("claude", {}).get("model", "claude-opus-5-5"),
                              effort=cfg.get("claude", {}).get("effort", "high"))
    analyses = []
    for ep in episodes:
        cache = cache_root / ep.id
        cache.mkdir(parents=True, exist_ok=True)
        log.info("%s — %s", ep.show, ep.title)
        segs = get_segments(ep, cfg, cache)
        analyses.append(analyse(ep, segs, writer, cfg, cache))

    show = cfg["show"]
    week_label = f"the week ending {end:%A %-d %B %Y}"
    script = writer.compose_script(analyses, show["name"], show["host"], week_label,
                                   cfg["digest"].get("target_minutes", 15))
    (work / "script.json").write_text(json.dumps(asdict(script), indent=1, ensure_ascii=False))
    log.info("Script: %s (%d items) → %s", script.title, len(script.items), work / "script.json")
    if plan_only:
        return {"script": asdict(script)}

    out_mp3 = root / "episodes" / f"{date}.mp3"
    seconds, chapters = render(script, analyses, cfg, work, cache_root, out_mp3)
    audio_url = cfg["audio"]["url_template"].format(date=date, site_url=show["site_url"])
    record = {
        "date": date,
        "guid": f"podcast-digest-{date}",
        "title": script.title,
        "description": script.description,
        "published": end.isoformat(),
        "audio_url": audio_url,
        "bytes": out_mp3.stat().st_size,
        "duration": round(seconds, 1),
        "chapters": chapters,
        "sources": [
            {"show": a.episode.show, "title": a.episode.title, "link": a.episode.link,
             "published": a.episode.published.isoformat(), "summary": a.summary,
             "worth_it": a.worth_it, "clips": len(a.clips)}
            for a in analyses
        ],
        "script": [asdict(i) for i in script.items],
    }
    all_eps = publish.save_episode(root / "data" / "episodes.json", record)
    publish.write_chapters(root / "chapters" / f"{date}.json", chapters)
    (root / "feed.xml").write_text(publish.build_feed(show, all_eps))
    log.info("Done: %s (%.1f min) → %s", out_mp3.name, seconds / 60, audio_url)
    return record
