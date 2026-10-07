"""Read subscriptions (OPML) and RSS feeds; pick out this week's episodes.

Only the standard library is used so feeds parse anywhere. Supports the
iTunes namespace (duration, image) and the Podcasting 2.0 namespace
(<podcast:transcript>, which lets us skip speech-to-text entirely).
"""

from __future__ import annotations

import hashlib
import re
import xml.etree.ElementTree as ET
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path

import requests

NS = {
    "itunes": "http://www.itunes.com/dtds/podcast-1.0.dtd",
    "podcast": "https://podcastindex.org/namespace/1.0",
    "content": "http://purl.org/rss/1.0/modules/content/",
}

USER_AGENT = "PodcastDigest/0.1 (+https://github.com/kstenson/claude-experiments)"


@dataclass
class Transcript:
    url: str
    type: str  # mime type, e.g. text/vtt, application/x-subrip, application/json


@dataclass
class Episode:
    show: str
    title: str
    published: datetime
    audio_url: str
    guid: str
    description: str = ""
    duration_seconds: int | None = None
    link: str = ""
    image: str = ""
    transcripts: list[Transcript] = field(default_factory=list)

    @property
    def id(self) -> str:
        """Short stable id — used for cache folders and clip references."""
        return hashlib.sha1(self.guid.encode()).hexdigest()[:10]


def read_opml(path: str | Path) -> list[dict]:
    """Return [{title, url}] for every feed in an OPML export.

    Every podcast app (Apple Podcasts, Pocket Casts, Overcast, AntennaPod…)
    can export subscriptions as OPML, so this is the import format.
    """
    root = ET.parse(path).getroot()
    feeds = []
    for outline in root.iter("outline"):
        url = outline.get("xmlUrl")
        if url:
            feeds.append({"title": outline.get("title") or outline.get("text") or url, "url": url})
    return feeds


def parse_duration(value: str | None) -> int | None:
    """itunes:duration may be '3600', '60:00' or '1:00:00'."""
    if not value:
        return None
    value = value.strip()
    try:
        parts = [int(float(p)) for p in value.split(":")]
    except ValueError:
        return None
    seconds = 0
    for p in parts:
        seconds = seconds * 60 + p
    return seconds


def _strip_html(text: str) -> str:
    text = re.sub(r"<br\s*/?>|</p>", "\n", text, flags=re.I)
    text = re.sub(r"<[^>]+>", "", text)
    return re.sub(r"\n{3,}", "\n\n", text).strip()


def _parse_date(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        dt = parsedate_to_datetime(value.strip())
    except (TypeError, ValueError):
        try:
            dt = datetime.fromisoformat(value.strip().replace("Z", "+00:00"))
        except ValueError:
            return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def parse_feed(xml_text: str | bytes, fallback_title: str = "") -> list[Episode]:
    root = ET.fromstring(xml_text)
    channel = root.find("channel")
    if channel is None:
        return []
    show = (channel.findtext("title") or fallback_title).strip()
    show_image = ""
    img = channel.find("itunes:image", NS)
    if img is not None:
        show_image = img.get("href", "")

    episodes = []
    for item in channel.findall("item"):
        enclosure = item.find("enclosure")
        if enclosure is None or not enclosure.get("url"):
            continue  # not an audio episode
        published = _parse_date(item.findtext("pubDate"))
        if published is None:
            continue
        description = (
            item.findtext("content:encoded", namespaces=NS)
            or item.findtext("description")
            or item.findtext("itunes:summary", namespaces=NS)
            or ""
        )
        ep_img = item.find("itunes:image", NS)
        episodes.append(
            Episode(
                show=show,
                title=(item.findtext("title") or "Untitled").strip(),
                published=published,
                audio_url=enclosure.get("url"),
                guid=(item.findtext("guid") or enclosure.get("url")).strip(),
                description=_strip_html(description),
                duration_seconds=parse_duration(item.findtext("itunes:duration", namespaces=NS)),
                link=(item.findtext("link") or "").strip(),
                image=ep_img.get("href", "") if ep_img is not None else show_image,
                transcripts=[
                    Transcript(url=t.get("url"), type=t.get("type", ""))
                    for t in item.findall("podcast:transcript", NS)
                    if t.get("url")
                ],
            )
        )
    return episodes


def fetch_feed(url: str, fallback_title: str = "", timeout: int = 30) -> list[Episode]:
    resp = requests.get(url, timeout=timeout, headers={"User-Agent": USER_AGENT})
    resp.raise_for_status()
    return parse_feed(resp.content, fallback_title)


def week_window(end: datetime, days: int = 7) -> tuple[datetime, datetime]:
    return end - timedelta(days=days), end


def episodes_in_window(
    episodes: list[Episode], start: datetime, end: datetime, max_per_show: int = 3
) -> list[Episode]:
    """Episodes published in [start, end), newest first, capped per show."""
    picked = [e for e in episodes if start <= e.published < end]
    picked.sort(key=lambda e: e.published, reverse=True)
    return picked[:max_per_show]
