"""Run with:  python -m unittest discover -s tests   (from podcast-digest/)"""

from __future__ import annotations

import functools
import http.server
import json
import shutil
import subprocess
import tempfile
import threading
import unittest
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path
from types import SimpleNamespace

from digest import audio, feeds, pipeline, publish, transcripts
from digest.writer import Writer, validate_clips

FEED = """<?xml version="1.0"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"
     xmlns:podcast="https://podcastindex.org/namespace/1.0">
<channel>
  <title>Test Show</title>
  <itunes:image href="https://example.com/show.jpg"/>
  <item>
    <title>New one</title><guid>ep-2</guid><link>https://example.com/2</link>
    <pubDate>Mon, 05 Oct 2026 10:00:00 +0000</pubDate>
    <description><![CDATA[<p>Hello <b>world</b></p>]]></description>
    <itunes:duration>1:02:03</itunes:duration>
    <enclosure url="{base}/episode.mp3" type="audio/mpeg" length="1"/>
    <podcast:transcript url="{base}/transcript.vtt" type="text/vtt"/>
  </item>
  <item>
    <title>Old one</title><guid>ep-1</guid>
    <pubDate>Mon, 14 Sep 2026 10:00:00 +0000</pubDate>
    <enclosure url="{base}/old.mp3" type="audio/mpeg" length="1"/>
  </item>
  <item><title>No audio</title><pubDate>Mon, 05 Oct 2026 10:00:00 +0000</pubDate></item>
</channel></rss>"""

VTT = """WEBVTT

00:00:00.000 --> 00:00:04.000
<v Alice>Welcome to the show.

00:00:04.000 --> 00:00:09.500
<v Alice>Today we talk about tides.

00:00:09.500 --> 00:00:16.000
<v Bob>The moon pulls the oceans, and that is the whole trick.

00:00:16.000 --> 00:00:22.000
<v Bob>Twice a day, everywhere, forever.
"""


def segs(*spans):
    return [transcripts.Segment(a, b, f"s{i}") for i, (a, b) in enumerate(spans)]


class FeedTests(unittest.TestCase):
    def test_parse_feed(self):
        eps = feeds.parse_feed(FEED.format(base="http://x"))
        self.assertEqual([e.title for e in eps], ["New one", "Old one"])
        new = eps[0]
        self.assertEqual(new.show, "Test Show")
        self.assertEqual(new.duration_seconds, 3723)
        self.assertEqual(new.description, "Hello world")
        self.assertEqual(new.image, "https://example.com/show.jpg")
        self.assertEqual(new.transcripts[0].type, "text/vtt")

    def test_window_and_cap(self):
        eps = feeds.parse_feed(FEED.format(base="http://x"))
        end = datetime(2026, 10, 7, tzinfo=timezone.utc)
        start, end = feeds.week_window(end)
        self.assertEqual([e.title for e in feeds.episodes_in_window(eps, start, end)], ["New one"])

    def test_duration_formats(self):
        self.assertEqual(feeds.parse_duration("3600"), 3600)
        self.assertEqual(feeds.parse_duration("61:00"), 3660)
        self.assertIsNone(feeds.parse_duration("soon"))

    def test_opml(self):
        root = Path(__file__).resolve().parent.parent
        subs = feeds.read_opml(root / "subscriptions.opml")
        self.assertTrue(subs and all(s["url"].startswith("http") for s in subs))


class TranscriptTests(unittest.TestCase):
    def test_vtt(self):
        s = transcripts.parse_vtt_or_srt(VTT)
        self.assertEqual(len(s), 4)
        self.assertEqual((s[1].start, s[1].end, s[1].speaker), (4.0, 9.5, "Alice"))
        self.assertEqual(s[2].text, "The moon pulls the oceans, and that is the whole trick.")

    def test_srt(self):
        s = transcripts.parse_vtt_or_srt("1\n00:01:02,500 --> 00:01:05,000\nHi there\n")
        self.assertEqual((s[0].start, s[0].end, s[0].text), (62.5, 65.0, "Hi there"))

    def test_json(self):
        s = transcripts.parse_json_transcript(
            {"segments": [{"startTime": 1, "endTime": 2, "body": "a", "speaker": "X"},
                          {"startTime": 2, "endTime": 3, "body": " "}]})
        self.assertEqual(len(s), 1)

    def test_merge_respects_speaker(self):
        merged = transcripts.merge_segments(transcripts.parse_vtt_or_srt(VTT))
        self.assertEqual([m.speaker for m in merged], ["Alice", "Bob"])
        self.assertEqual(merged[1].end, 22.0)


class ClipValidationTests(unittest.TestCase):
    ep = feeds.Episode("S", "T", datetime.now(timezone.utc), "u", "g")

    def pick(self, a, b):
        return {"start_segment": a, "end_segment": b, "why": "", "speaker": ""}

    def test_rejects_out_of_range_and_short(self):
        s = segs((0, 10), (10, 12))
        out = validate_clips(self.ep, s, [self.pick(0, 5), self.pick(1, 1)], 3, 45)
        self.assertEqual(out, [])

    def test_trims_to_cap(self):
        s = segs((0, 20), (20, 40), (40, 60))
        [c] = validate_clips(self.ep, s, [self.pick(0, 2)], 3, 45)
        self.assertEqual((c.start, c.end), (0, 40))

    def test_single_long_segment_is_hard_capped(self):
        [c] = validate_clips(self.ep, segs((100, 200)), [self.pick(0, 0)], 3, 45)
        self.assertEqual((c.start, c.end), (100, 145))

    def test_drops_overlaps_and_respects_max(self):
        s = segs((0, 10), (10, 20), (20, 30), (30, 40))
        out = validate_clips(self.ep, s, [self.pick(0, 1), self.pick(1, 2), self.pick(3, 3), self.pick(2, 2)], 2, 45)
        self.assertEqual([(c.start, c.end) for c in out], [(0, 20), (30, 40)])


class PublishTests(unittest.TestCase):
    def test_feed_is_valid_xml(self):
        show = {"name": "A & B", "author": "me", "description": "<desc>", "site_url": "https://x/y"}
        ep = {"date": "2026-10-07", "guid": "g", "title": "T & U", "description": "d",
              "published": "2026-10-07T10:00:00+00:00", "audio_url": "https://x/a.mp3?a=1&b=2",
              "bytes": 10, "duration": 3725.4}
        root = ET.fromstring(publish.build_feed(show, [ep]))
        item = root.find("channel/item")
        self.assertEqual(item.find("enclosure").get("url"), "https://x/a.mp3?a=1&b=2")
        self.assertEqual(item.findtext("{http://www.itunes.com/dtds/podcast-1.0.dtd}duration"), "01:02:05")
        self.assertEqual(root.findtext("channel/title"), "A & B")


class FakeStream:
    def __init__(self, msg):
        self.msg = msg

    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False

    def get_final_message(self):
        return self.msg


class FakeClient:
    """Stands in for anthropic.Anthropic; records requests, replays responses."""

    def __init__(self, responses):
        self.responses = list(responses)
        self.requests = []
        self.beta = SimpleNamespace(messages=SimpleNamespace(stream=self._stream))

    def _stream(self, **kw):
        self.requests.append(kw)
        r = self.responses.pop(0)
        if isinstance(r, SimpleNamespace):
            return FakeStream(r)
        return FakeStream(SimpleNamespace(stop_reason="end_turn",
                                          content=[SimpleNamespace(type="text", text=json.dumps(r))]))


class WriterTests(unittest.TestCase):
    def test_refusal_raises(self):
        w = Writer(client=FakeClient([SimpleNamespace(stop_reason="refusal", content=[])]))
        with self.assertRaises(RuntimeError):
            w._call("x", {})

    def test_analysis_and_script_roundtrip(self):
        ep = feeds.parse_feed(FEED.format(base="http://x"))[0]
        s = transcripts.merge_segments(transcripts.parse_vtt_or_srt(VTT), 6)
        client = FakeClient([
            {"summary": "Tides.", "key_points": ["moon"], "worth_it": "must_listen",
             "clips": [{"start_segment": 2, "end_segment": 3, "why": "core idea", "speaker": "Bob"}]},
            {"title": "Week 1", "description": "notes", "items": [
                {"kind": "narration", "text": "Hello.", "clip_id": "", "chapter": "Intro"},
                {"kind": "clip", "text": "", "clip_id": "bogus", "chapter": ""},
                {"kind": "clip", "text": "", "clip_id": f"{ep.id}-0", "chapter": ""},
                {"kind": "narration", "text": "  ", "clip_id": "", "chapter": ""}]},
        ])
        w = Writer(client=client)
        a = w.analyse_episode(ep, s)
        self.assertEqual(len(a.clips), 1)
        self.assertIn("[2]", client.requests[0]["messages"][0]["content"])
        self.assertEqual(client.requests[0]["fallbacks"], "default")
        script = w.compose_script([a], "Show", "Host", "this week")
        self.assertEqual([i.kind for i in script.items], ["narration", "clip"])  # bogus/blank dropped


def _ffmpeg_flite_available() -> bool:
    if not shutil.which("ffmpeg"):
        return False
    out = subprocess.run(["ffmpeg", "-hide_banner", "-filters"], capture_output=True, text=True).stdout
    return " flite " in out


@unittest.skipUnless(_ffmpeg_flite_available(), "needs ffmpeg built with flite")
class EndToEndTests(unittest.TestCase):
    """Full pipeline against a local HTTP 'podcast host', with Claude stubbed."""

    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        host = self.tmp / "host"
        host.mkdir()
        audio.ffmpeg("-f", "lavfi", "-i", "sine=frequency=330:duration=30", "-ac", "1",
                     str(host / "episode.mp3"))
        (host / "transcript.vtt").write_text(VTT)
        class Quiet(http.server.SimpleHTTPRequestHandler):
            def log_message(self, *a):
                pass

        handler = functools.partial(Quiet, directory=str(host))
        self.server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
        threading.Thread(target=self.server.serve_forever, daemon=True).start()
        base = f"http://127.0.0.1:{self.server.server_port}"
        (host / "feed.xml").write_text(FEED.format(base=base))
        site = self.tmp / "site"
        site.mkdir()
        (site / "subs.opml").write_text(
            f'<opml version="2.0"><body><outline text="Test" xmlUrl="{base}/feed.xml"/></body></opml>')
        cfg = (Path(__file__).resolve().parent.parent / "config.toml").read_text()
        cfg = cfg.replace('subscriptions = "subscriptions.opml"', 'subscriptions = "subs.opml"')
        cfg = cfg.replace("whisper = true", "whisper = false")
        (site / "config.toml").write_text(cfg)
        self.site = site

    def tearDown(self):
        self.server.shutdown()
        shutil.rmtree(self.tmp)

    def test_build(self):
        ep_id = feeds.parse_feed(FEED.format(base="x"))[0].id
        client = FakeClient([
            {"summary": "Tides.", "key_points": ["moon"], "worth_it": "must_listen",
             # after merging, the VTT is two segments: Alice 0–9.5s, Bob 9.5–22s
             "clips": [{"start_segment": 1, "end_segment": 1, "why": "core", "speaker": "Bob"}]},
            {"title": "Tides Week", "description": "notes", "items": [
                {"kind": "narration", "text": "Welcome to the digest.", "clip_id": "", "chapter": "Intro"},
                {"kind": "narration", "text": "Here is Bob on tides.", "clip_id": "", "chapter": "Tides"},
                {"kind": "clip", "text": "", "clip_id": f"{ep_id}-0", "chapter": ""},
                {"kind": "narration", "text": "That's all.", "clip_id": "", "chapter": "Outro"}]},
        ])
        end = datetime(2026, 10, 7, 12, tzinfo=timezone.utc)
        rec = pipeline.build(self.site / "config.toml", end, writer=Writer(client=client))

        mp3 = self.site / "episodes" / "2026-10-07.mp3"
        self.assertTrue(mp3.exists())
        # 12.5s clip (merged segments 9.5→22) + three narrations + gaps
        self.assertGreater(rec["duration"], 14)
        self.assertEqual([c["title"] for c in rec["chapters"]], ["Intro", "Tides", "Outro"])
        self.assertEqual(rec["chapters"][1]["url"], "https://example.com/2")
        probe = json.loads(subprocess.run(
            ["ffprobe", "-v", "error", "-show_chapters", "-of", "json", str(mp3)],
            capture_output=True, text=True, check=True).stdout)
        self.assertEqual(len(probe["chapters"]), 3)
        ET.parse(self.site / "feed.xml")
        self.assertTrue((self.site / "chapters" / "2026-10-07.json").exists())
        self.assertEqual(json.loads((self.site / "data" / "episodes.json").read_text())
                         ["episodes"][0]["sources"][0]["worth_it"], "must_listen")

        # Re-running uses the cache: no further Claude calls for analysis.
        client.responses.append({"title": "Again", "description": "", "items": [
            {"kind": "narration", "text": "Hi.", "clip_id": "", "chapter": "Intro"}]})
        pipeline.build(self.site / "config.toml", end, writer=Writer(client=client))
        self.assertEqual(len(client.requests), 3)
        self.assertEqual(len(json.loads((self.site / "data" / "episodes.json").read_text())["episodes"]), 1)


if __name__ == "__main__":
    unittest.main()
