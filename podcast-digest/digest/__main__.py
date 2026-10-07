"""CLI: python -m digest build [--date YYYY-MM-DD] [--plan-only]"""

from __future__ import annotations

import argparse
import logging
from datetime import datetime, time, timezone
from pathlib import Path

from . import pipeline


def main() -> None:
    p = argparse.ArgumentParser(prog="digest", description=__doc__)
    sub = p.add_subparsers(dest="cmd", required=True)
    b = sub.add_parser("build", help="build this week's digest episode")
    b.add_argument("--config", type=Path, default=pipeline.ROOT / "config.toml")
    b.add_argument("--date", help="week ending on this date (default: now)")
    b.add_argument("--plan-only", action="store_true",
                   help="stop after writing the script (no TTS, no audio)")
    ls = sub.add_parser("list", help="show which episodes would be included")
    ls.add_argument("--config", type=Path, default=pipeline.ROOT / "config.toml")
    ls.add_argument("--date")
    args = p.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(message)s")

    end = None
    if args.date:
        end = datetime.combine(datetime.fromisoformat(args.date).date(), time(23, 59, 59), timezone.utc)

    if args.cmd == "list":
        cfg = pipeline.load_config(args.config)
        for ep in pipeline.collect_episodes(cfg, end or datetime.now(timezone.utc),
                                             args.config.resolve().parent):
            t = "transcript" if ep.transcripts else "no transcript"
            print(f"{ep.published:%a %d %b}  {ep.show} — {ep.title}  [{t}]")
        return
    pipeline.build(args.config, end, plan_only=args.plan_only)


if __name__ == "__main__":
    main()
