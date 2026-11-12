"""Audio analysis and optional Whisper-compatible transcription."""

from __future__ import annotations

import hashlib
import tempfile

from ..config import get_settings
from ..db import download, get_db
from ..extract.audio import probe_audio

_SUFFIX = {"audio/wav": ".wav", "audio/x-wav": ".wav", "audio/wave": ".wav", "audio/mpeg": ".mp3", "audio/mp3": ".mp3", "audio/webm": ".webm", "audio/ogg": ".ogg", "audio/mp4": ".m4a", "audio/x-m4a": ".m4a", "audio/m4a": ".m4a", "audio/aac": ".aac"}

# Languages a Whisper-family model was trained on, among those in our registry.
# siSwati, isiZulu, isiXhosa, isiNdebele, Sesotho, Setswana, Sepedi, Tshivenda
# and Xitsonga are NOT in Whisper's language list — output for them is a rough
# draft at best and is always flagged for human correction.
WHISPER_LANGS = {"en", "af", "sw", "yo", "sn", "so", "am", "ha", "ln", "mg"}


def run_audio_analyze(audio_id: str) -> dict:
    db = get_db()
    a = db.table("audio_assets").select("*").eq("id", audio_id).single().execute().data
    db.table("audio_assets").update({"analysis_status": "processing"}).eq("id", audio_id).execute()
    try:
        data = download(a["storage_bucket"], a["storage_path"])
        checksum = hashlib.sha256(data).hexdigest()
        meta = probe_audio(data, _SUFFIX.get(a["mime_type"], ""))
        update = {
            "analysis_status": "completed",
            "sample_rate": meta.get("sample_rate"),
            "channels": meta.get("channels"),
            "codec": meta.get("codec"),
            "checksum_sha256": a.get("checksum_sha256") or checksum,
        }
        if meta.get("duration_seconds"):
            update["duration_seconds"] = meta["duration_seconds"]
        db.table("audio_assets").update(update).eq("id", audio_id).execute()
        issues = []
        if meta.get("duration_seconds") and meta["duration_seconds"] < 1:
            issues.append("very_short")
        if meta.get("sample_rate") and meta["sample_rate"] < 16000:
            issues.append("low_sample_rate")
        db.table("quality_checks").insert({
            "contribution_id": a["contribution_id"], "check_type": "audio_metadata", "passed": not issues,
            "score": meta.get("duration_seconds"), "details": {**meta, "issues": issues, "checksum_match": a.get("checksum_sha256") in (None, checksum)},
        }).execute()
        return meta
    except Exception:
        db.table("audio_assets").update({"analysis_status": "failed"}).eq("id", audio_id).execute()
        raise


def run_audio_transcribe(audio_id: str) -> dict:
    s = get_settings()
    db = get_db()
    if not s.whisper_model:
        raise RuntimeError("Transcription is not configured on the processing service (WHISPER_MODEL is empty).")
    try:
        from faster_whisper import WhisperModel  # type: ignore
    except ImportError as e:
        raise RuntimeError("faster-whisper is not installed (see requirements-optional.txt).") from e

    a = db.table("audio_assets").select("*, contributions(language_id, languages(code))").eq("id", audio_id).single().execute().data
    code = ((a.get("contributions") or {}).get("languages") or {}).get("code")
    db.table("audio_assets").update({"transcription_status": "processing"}).eq("id", audio_id).execute()
    try:
        data = download(a["storage_bucket"], a["storage_path"])
        model = WhisperModel(s.whisper_model, device=s.whisper_device, compute_type="int8")
        with tempfile.NamedTemporaryFile(suffix=_SUFFIX.get(a["mime_type"], "")) as f:
            f.write(data)
            f.flush()
            segments, info = model.transcribe(f.name, language=code if code in WHISPER_LANGS else None, vad_filter=True)
            text = " ".join(seg.text.strip() for seg in segments).strip()
        supported = code in WHISPER_LANGS
        db.table("audio_assets").update({
            "transcription_status": "completed",
            "transcription_model": s.whisper_model,
            **({"transcript": text, "transcript_source": "automatic"} if a["transcript_source"] == "none" and text else {}),
        }).eq("id", audio_id).execute()
        db.table("quality_checks").insert({
            "contribution_id": a["contribution_id"], "check_type": "automatic_transcription", "passed": supported,
            "details": {"model": s.whisper_model, "language_supported": supported, "detected_language": info.language, "detected_probability": round(info.language_probability, 3),
                        "note": None if supported else f"'{code}' is not a Whisper training language; transcript is an unreliable draft requiring full human correction."},
        }).execute()
        return {"chars": len(text), "language_supported": supported}
    except Exception:
        db.table("audio_assets").update({"transcription_status": "failed"}).eq("id", audio_id).execute()
        raise
