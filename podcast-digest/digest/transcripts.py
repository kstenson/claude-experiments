"""Get a timestamped transcript for an episode.

Order of preference:
1. A transcript the publisher already ships via <podcast:transcript>
   (VTT, SRT or Podcasting 2.0 JSON) — free, fast and accurate.
2. Local speech-to-text with faster-whisper (optional dependency).
3. Nothing — the episode is still summarised from its show notes, it just
   can't contribute audio clips.

Timestamps matter: they're what lets us cut real clips from the episode.
"""

from __future__ import annotations

import json
import re
from dataclasses import asdict, dataclass
from pathlib import Path

import requests

from .feeds import USER_AGENT, Episode


@dataclass
class Segment:
    start: float
    end: float
    text: str
    speaker: str = ""


_TS = re.compile(r"(?:(\d+):)?(\d{1,2}):(\d{2})[.,](\d{1,3})")


def _ts(value: str) -> float:
    m = _TS.search(value)
    if not m:
        raise ValueError(f"bad timestamp: {value!r}")
    h, mnt, s, frac = m.groups()
    return int(h or 0) * 3600 + int(mnt) * 60 + int(s) + int(frac.ljust(3, "0")) / 1000


def parse_vtt_or_srt(text: str) -> list[Segment]:
    """Handles WebVTT and SRT (they differ only in header and ms separator)."""
    segments = []
    for block in re.split(r"\n\s*\n", text.replace("\r\n", "\n").strip()):
        lines = [ln for ln in block.split("\n") if ln.strip()]
        arrow = next((i for i, ln in enumerate(lines) if "-->" in ln), None)
        if arrow is None:
            continue
        start_s, end_s = lines[arrow].split("-->", 1)
        body = " ".join(lines[arrow + 1 :])
        speaker = ""
        voice = re.match(r"<v\s+([^>]+)>", body)
        if voice:
            speaker = voice.group(1).strip()
        body = re.sub(r"<[^>]+>", "", body).strip()
        if body:
            segments.append(Segment(_ts(start_s), _ts(end_s.strip().split(" ")[0]), body, speaker))
    return segments


def parse_json_transcript(data: dict) -> list[Segment]:
    """Podcasting 2.0 JSON transcript format."""
    return [
        Segment(float(s["startTime"]), float(s["endTime"]), s.get("body", "").strip(), s.get("speaker", ""))
        for s in data.get("segments", [])
        if s.get("body", "").strip()
    ]


def merge_segments(segments: list[Segment], target_seconds: float = 15.0) -> list[Segment]:
    """Group tiny caption cues into ~15s chunks.

    Caption files often have 2–3 second cues. Chunking keeps the prompt
    small while still giving clip boundaries at sentence-ish granularity.
    """
    merged: list[Segment] = []
    for seg in segments:
        if (
            merged
            and seg.end - merged[-1].start <= target_seconds
            and seg.speaker == merged[-1].speaker
        ):
            merged[-1].end = seg.end
            merged[-1].text += " " + seg.text
        else:
            merged.append(Segment(seg.start, seg.end, seg.text, seg.speaker))
    return merged


def fetch_published_transcript(episode: Episode, timeout: int = 30) -> list[Segment] | None:
    # Prefer formats with timestamps.
    rank = {"application/json": 0, "text/vtt": 1, "application/x-subrip": 2, "application/srt": 2}
    for t in sorted(episode.transcripts, key=lambda t: rank.get(t.type, 9)):
        if t.type not in rank:
            continue
        try:
            resp = requests.get(t.url, timeout=timeout, headers={"User-Agent": USER_AGENT})
            resp.raise_for_status()
            if t.type == "application/json":
                segs = parse_json_transcript(resp.json())
            else:
                segs = parse_vtt_or_srt(resp.text)
        except (requests.RequestException, ValueError, KeyError):
            continue
        if segs:
            return segs
    return None


def whisper_transcribe(audio_path: Path, model_size: str = "base") -> list[Segment] | None:
    try:
        from faster_whisper import WhisperModel  # optional dependency
    except ImportError:
        return None
    import numpy as np
    import subprocess

    # Decode with ffmpeg ourselves (16 kHz mono float) rather than via PyAV,
    # whose API drifts between versions.
    pcm = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", str(audio_path), "-f", "f32le", "-ac", "1", "-ar", "16000", "-"],
        capture_output=True, check=True,
    ).stdout
    model = WhisperModel(model_size, device="auto", compute_type="int8")
    segments, _info = model.transcribe(np.frombuffer(pcm, dtype=np.float32), vad_filter=True)
    return [Segment(s.start, s.end, s.text.strip()) for s in segments if s.text.strip()]


def save_segments(path: Path, segments: list[Segment]) -> None:
    path.write_text(json.dumps([asdict(s) for s in segments], indent=1))


def load_segments(path: Path) -> list[Segment]:
    return [Segment(**s) for s in json.loads(path.read_text())]
