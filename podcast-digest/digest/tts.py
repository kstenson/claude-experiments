"""Text-to-speech for the host's narration.

Backends:
  flite       — offline, free, robotic; uses ffmpeg's built-in flite filter.
                The zero-config default so the pipeline always runs.
  openai      — OpenAI TTS (needs OPENAI_API_KEY). Natural, cheap.
  elevenlabs  — ElevenLabs (needs ELEVENLABS_API_KEY). Most natural.

Each backend writes an audio file; audio.normalise() then brings it to the
house format so all voices splice together at the same loudness.
"""

from __future__ import annotations

import os
import re
from pathlib import Path

import requests

from . import audio


def _chunks(text: str, limit: int) -> list[str]:
    """Split on sentence boundaries so each request stays under the API limit."""
    sentences = re.split(r"(?<=[.!?])\s+", text.strip())
    out, cur = [], ""
    for s in sentences:
        if cur and len(cur) + len(s) + 1 > limit:
            out.append(cur)
            cur = s
        else:
            cur = f"{cur} {s}".strip()
    if cur:
        out.append(cur)
    return out


def _join(parts: list[Path], dest: Path) -> Path:
    if len(parts) == 1:
        parts[0].rename(dest)
        return dest
    listing = dest.with_suffix(".txt")
    listing.write_text("".join(f"file '{p.resolve()}'\n" for p in parts))
    audio.ffmpeg("-f", "concat", "-safe", "0", "-i", str(listing), "-c", "copy", str(dest))
    return dest


def flite(text: str, dest: Path, voice: str = "slt") -> Path:
    txt = dest.with_suffix(".txt")
    txt.write_text(text)
    # textfile= avoids having to escape the narration for the filtergraph.
    path = str(txt.resolve()).replace("\\", "/").replace(":", "\\:").replace("'", "\\'")
    audio.ffmpeg("-f", "lavfi", "-i", f"flite=textfile='{path}':voice={voice}", str(dest))
    return dest


def openai_tts(text: str, dest: Path, voice: str = "alloy", model: str = "gpt-4o-mini-tts") -> Path:
    key = os.environ["OPENAI_API_KEY"]
    parts = []
    for i, chunk in enumerate(_chunks(text, 4000)):
        r = requests.post(
            "https://api.openai.com/v1/audio/speech",
            headers={"Authorization": f"Bearer {key}"},
            json={"model": model, "voice": voice, "input": chunk, "response_format": "mp3"},
            timeout=120,
        )
        r.raise_for_status()
        p = dest.with_name(f"{dest.stem}.{i}.mp3")
        p.write_bytes(r.content)
        parts.append(p)
    return _join(parts, dest)


def elevenlabs_tts(text: str, dest: Path, voice: str = "21m00Tcm4TlvDq8ikWAM",
                   model: str = "eleven_multilingual_v2") -> Path:
    key = os.environ["ELEVENLABS_API_KEY"]
    parts = []
    for i, chunk in enumerate(_chunks(text, 4500)):
        r = requests.post(
            f"https://api.elevenlabs.io/v1/text-to-speech/{voice}",
            headers={"xi-api-key": key, "accept": "audio/mpeg"},
            json={"text": chunk, "model_id": model},
            timeout=120,
        )
        r.raise_for_status()
        p = dest.with_name(f"{dest.stem}.{i}.mp3")
        p.write_bytes(r.content)
        parts.append(p)
    return _join(parts, dest)


def speak(text: str, dest_wav: Path, backend: str = "flite", voice: str | None = None) -> Path:
    """Synthesise `text` and return a normalised WAV at `dest_wav`."""
    raw_ext = ".wav" if backend == "flite" else ".mp3"
    raw = dest_wav.with_name(dest_wav.stem + ".raw" + raw_ext)
    kwargs = {"voice": voice} if voice else {}
    if backend == "flite":
        flite(text, raw, **kwargs)
    elif backend == "openai":
        openai_tts(text, raw, **kwargs)
    elif backend == "elevenlabs":
        elevenlabs_tts(text, raw, **kwargs)
    else:
        raise ValueError(f"unknown TTS backend: {backend}")
    return audio.normalise(raw, dest_wav)
