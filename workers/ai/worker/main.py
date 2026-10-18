"""Phase 0 worker readiness entry point. No media is processed yet."""

from __future__ import annotations

import shutil


def main() -> None:
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        raise SystemExit("FFmpeg was not found. Install it before starting media work.")
    print(f"KLIVEXA AI worker foundation ready (ffmpeg: {ffmpeg}).")
    print("Phase 0 only: queue consumption and media processing are intentionally disabled.")


if __name__ == "__main__":
    main()
