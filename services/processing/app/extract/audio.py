"""Audio metadata extraction (ffprobe preferred, mutagen fallback) and WAV conversion."""

from __future__ import annotations

import json
import shutil
import subprocess
import tempfile
from pathlib import Path


def probe_audio(data: bytes, suffix: str = "") -> dict:
    """Return duration_seconds, sample_rate, channels, codec where determinable."""
    with tempfile.NamedTemporaryFile(suffix=suffix) as f:
        f.write(data)
        f.flush()
        if shutil.which("ffprobe"):
            proc = subprocess.run(
                ["ffprobe", "-v", "error", "-print_format", "json", "-show_format", "-show_streams", f.name],
                capture_output=True, text=True, timeout=60,
            )
            if proc.returncode == 0:
                info = json.loads(proc.stdout or "{}")
                stream = next((s for s in info.get("streams", []) if s.get("codec_type") == "audio"), {})
                duration = info.get("format", {}).get("duration") or stream.get("duration")
                if duration in (None, "N/A"):
                    # WebM from MediaRecorder often lacks a duration header: decode to count.
                    duration = _duration_from_ffmpeg(f.name)
                return {
                    "duration_seconds": round(float(duration), 3) if duration not in (None, "N/A") else None,
                    "sample_rate": int(stream["sample_rate"]) if stream.get("sample_rate") else None,
                    "channels": stream.get("channels"),
                    "codec": stream.get("codec_name"),
                    "probe": "ffprobe",
                }
        import mutagen

        m = mutagen.File(f.name)
        if m is None or m.info is None:
            raise ValueError("Unrecognised or corrupted audio file")
        return {
            "duration_seconds": round(float(getattr(m.info, "length", 0) or 0), 3) or None,
            "sample_rate": getattr(m.info, "sample_rate", None),
            "channels": getattr(m.info, "channels", None),
            "codec": type(m).__name__.lower(),
            "probe": "mutagen",
        }


def _duration_from_ffmpeg(path: str) -> float | None:
    proc = subprocess.run(["ffmpeg", "-v", "info", "-i", path, "-f", "null", "-"], capture_output=True, text=True, timeout=300)
    import re

    times = re.findall(r"time=(\d+):(\d+):(\d+\.\d+)", proc.stderr)
    if not times:
        return None
    h, m, s = times[-1]
    return int(h) * 3600 + int(m) * 60 + float(s)


def to_wav_16k_mono(data: bytes, suffix: str = "") -> bytes:
    """Convert any supported audio to 16 kHz mono PCM WAV (standard for ASR datasets)."""
    if not shutil.which("ffmpeg"):
        raise RuntimeError("ffmpeg is required for WAV export")
    with tempfile.TemporaryDirectory() as d:
        src = Path(d) / f"in{suffix}"
        dst = Path(d) / "out.wav"
        src.write_bytes(data)
        proc = subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-ac", "1", "-ar", "16000", "-sample_fmt", "s16", str(dst)], capture_output=True, text=True, timeout=600)
        if proc.returncode != 0:
            raise RuntimeError(f"ffmpeg failed: {proc.stderr[:300]}")
        return dst.read_bytes()
