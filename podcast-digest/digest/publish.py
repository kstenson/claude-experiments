"""Publish the digest as a real podcast: an RSS feed any app can subscribe to.

State lives in data/episodes.json (one record per weekly digest); feed.xml
and chapters/<date>.json are regenerated from it every run.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from email.utils import format_datetime
from pathlib import Path
from xml.sax.saxutils import escape


def load_episodes(path: Path) -> list[dict]:
    if not path.exists():
        return []
    return json.loads(path.read_text())["episodes"]


def save_episode(path: Path, record: dict) -> list[dict]:
    """Insert or replace the record for this date; newest first."""
    episodes = [e for e in load_episodes(path) if e["date"] != record["date"]]
    episodes.append(record)
    episodes.sort(key=lambda e: e["date"], reverse=True)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps({"episodes": episodes}, indent=2, ensure_ascii=False) + "\n")
    return episodes


def write_chapters(path: Path, chapters: list[dict]) -> None:
    """Podcasting 2.0 JSON chapters (podcast:chapters)."""
    path.parent.mkdir(parents=True, exist_ok=True)
    doc = {
        "version": "1.2.0",
        "chapters": [
            {k: v for k, v in {"startTime": round(c["start"], 2), "title": c["title"],
                               "url": c.get("url") or None}.items() if v is not None}
            for c in chapters
        ],
    }
    path.write_text(json.dumps(doc, indent=2, ensure_ascii=False) + "\n")


def _hms(seconds: float) -> str:
    s = int(round(seconds))
    return f"{s // 3600:02d}:{s % 3600 // 60:02d}:{s % 60:02d}"


def build_feed(show: dict, episodes: list[dict]) -> str:
    site = show["site_url"].rstrip("/") + "/"
    e = lambda s: escape(str(s))  # noqa: E731
    items = []
    for ep in episodes:
        pub = datetime.fromisoformat(ep["published"])
        items.append(f"""    <item>
      <title>{e(ep['title'])}</title>
      <description>{e(ep['description'])}</description>
      <guid isPermaLink="false">{e(ep['guid'])}</guid>
      <pubDate>{format_datetime(pub)}</pubDate>
      <enclosure url="{e(ep['audio_url'])}" length="{ep['bytes']}" type="audio/mpeg"/>
      <itunes:duration>{_hms(ep['duration'])}</itunes:duration>
      <itunes:episodeType>full</itunes:episodeType>
      <podcast:chapters url="{e(site + 'chapters/' + ep['date'] + '.json')}" type="application/json+chapters"/>
      <link>{e(site + '#' + ep['date'])}</link>
    </item>""")
    now = format_datetime(datetime.now(timezone.utc))
    image = f'\n    <itunes:image href="{e(show["image"])}"/>' if show.get("image") else ""
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:podcast="https://podcastindex.org/namespace/1.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>{e(show['name'])}</title>
    <link>{e(site)}</link>
    <atom:link href="{e(site + 'feed.xml')}" rel="self" type="application/rss+xml"/>
    <description>{e(show['description'])}</description>
    <language>{e(show.get('language', 'en'))}</language>
    <lastBuildDate>{now}</lastBuildDate>
    <itunes:author>{e(show['author'])}</itunes:author>
    <itunes:explicit>false</itunes:explicit>
    <itunes:block>{'Yes' if show.get('private', True) else 'No'}</itunes:block>{image}
{chr(10).join(items)}
  </channel>
</rss>
"""
