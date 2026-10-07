"""All the ffmpeg work: download, cut clips, normalise, splice, encode.

Every piece is rendered to the same intermediate format (44.1 kHz mono
16-bit WAV, loudness-normalised to -16 LUFS — the podcast norm) so that the
final splice is a lossless concat followed by a single MP3 encode.
"""

from __future__ import annotations

import json
import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path

import requests

from .feeds import USER_AGENT

SAMPLE_RATE = 44100
LOUDNORM = "loudnorm=I=-16:TP=-1.5:LRA=11"


def _run(args: list[str]) -> None:
    proc = subprocess.run(args, capture_output=True, text=True)
    if proc.returncode != 0:
        raise RuntimeError(f"ffmpeg failed ({' '.join(args[:6])}…):\n{proc.stderr[-2000:]}")


def ffmpeg(*args: str) -> None:
    _run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", *args])


def require_ffmpeg() -> None:
    if not shutil.which("ffmpeg") or not shutil.which("ffprobe"):
        raise SystemExit("ffmpeg/ffprobe not found — install ffmpeg first.")


def duration(path: Path) -> float:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "json", str(path)],
        capture_output=True, text=True, check=True,
    ).stdout
    return float(json.loads(out)["format"]["duration"])


def download(url: str, dest: Path, timeout: int = 60) -> Path:
    if dest.exists() and dest.stat().st_size > 0:
        return dest
    tmp = dest.with_suffix(dest.suffix + ".part")
    with requests.get(url, stream=True, timeout=timeout, headers={"User-Agent": USER_AGENT}) as r:
        r.raise_for_status()
        with open(tmp, "wb") as f:
            for chunk in r.iter_content(1 << 16):
                f.write(chunk)
    tmp.rename(dest)
    return dest


def normalise(src: Path, dest: Path) -> Path:
    """Any audio → loudness-normalised mono WAV in the house format."""
    ffmpeg("-i", str(src), "-af", LOUDNORM, "-ar", str(SAMPLE_RATE), "-ac", "1",
           "-c:a", "pcm_s16le", str(dest))
    return dest


def cut_clip(src: Path, start: float, end: float, dest: Path,
             fade_in: float = 0.3, fade_out: float = 0.8) -> Path:
    """Cut [start, end] from an episode with short fades so it sits cleanly."""
    length = max(0.5, end - start)
    fade_out = min(fade_out, length / 3)
    af = (f"afade=t=in:d={fade_in},afade=t=out:st={length - fade_out:.3f}:d={fade_out:.3f},"
          f"{LOUDNORM}")
    ffmpeg("-ss", f"{start:.3f}", "-t", f"{length:.3f}", "-i", str(src), "-af", af,
           "-ar", str(SAMPLE_RATE), "-ac", "1", "-c:a", "pcm_s16le", str(dest))
    return dest


def silence(seconds: float, dest: Path) -> Path:
    ffmpeg("-f", "lavfi", "-i", f"anullsrc=r={SAMPLE_RATE}:cl=mono", "-t", f"{seconds:.3f}",
           "-c:a", "pcm_s16le", str(dest))
    return dest


@dataclass
class Chapter:
    title: str
    start: float
    end: float
    url: str = ""


def _escape_meta(value: str) -> str:
    for ch in ("\\", "=", ";", "#", "\n"):
        value = value.replace(ch, "\\" + ch)
    return value


def splice(pieces: list[Path], dest_mp3: Path, chapters: list[Chapter], tags: dict[str, str],
           workdir: Path, gap_seconds: float = 0.5, bitrate: str = "96k") -> float:
    """Concatenate WAV pieces (with a short breath between each) into a tagged MP3.

    Chapters are written as ID3 CHAP frames, which Apple Podcasts, Overcast,
    Pocket Casts etc. display as skip points. Returns the final duration.
    """
    gap = silence(gap_seconds, workdir / "_gap.wav") if gap_seconds > 0 else None
    listing = workdir / "_concat.txt"
    lines = []
    for i, p in enumerate(pieces):
        if gap is not None and i > 0:
            lines.append(f"file '{gap.resolve()}'")
        lines.append(f"file '{p.resolve()}'")
    listing.write_text("\n".join(lines) + "\n")

    meta = [";FFMETADATA1"] + [f"{k}={_escape_meta(v)}" for k, v in tags.items()]
    for ch in chapters:
        meta += ["[CHAPTER]", "TIMEBASE=1/1000", f"START={int(ch.start * 1000)}",
                 f"END={int(ch.end * 1000)}", f"title={_escape_meta(ch.title)}"]
    meta_file = workdir / "_meta.txt"
    meta_file.write_text("\n".join(meta) + "\n")

    dest_mp3.parent.mkdir(parents=True, exist_ok=True)
    ffmpeg("-f", "concat", "-safe", "0", "-i", str(listing), "-i", str(meta_file),
           "-map", "0:a", "-map_metadata", "1", "-map_chapters", "1",
           "-c:a", "libmp3lame", "-b:a", bitrate, "-ac", "1", "-id3v2_version", "3",
           str(dest_mp3))
    return duration(dest_mp3)
