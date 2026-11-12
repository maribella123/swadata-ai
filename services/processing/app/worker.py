"""Durable job worker: claims jobs from Postgres (FOR UPDATE SKIP LOCKED) and runs them.

Safe to run as several replicas. Failed jobs are retried up to max_attempts.
"""

from __future__ import annotations

import logging
import threading
import time
from datetime import datetime, timezone

from .config import get_settings
from .db import get_db
from .jobs.audio import run_audio_analyze, run_audio_transcribe
from .jobs.dataset_build import run_dataset_build
from .jobs.dataset_export import run_dataset_export
from .jobs.document import run_document_extract

log = logging.getLogger("swadata.worker")

HANDLERS = {
    "document_extract": run_document_extract,
    "audio_analyze": run_audio_analyze,
    "audio_transcribe": run_audio_transcribe,
    "dataset_build": run_dataset_build,
    "dataset_export": run_dataset_export,
}

wake = threading.Event()
_stop = threading.Event()


def process_one() -> dict | None:
    db = get_db()
    job = db.rpc("claim_next_job", {}).execute().data
    if not job or not job.get("id"):
        return None
    started = time.monotonic()
    log.info("job %s %s entity=%s attempt=%s", job["id"], job["job_type"], job["entity_id"], job["attempts"])
    try:
        result = HANDLERS[job["job_type"]](job["entity_id"]) or {}
        db.table("processing_jobs").update({
            "status": "completed", "result": {**result, "seconds": round(time.monotonic() - started, 2)},
            "error": None, "finished_at": datetime.now(timezone.utc).isoformat(), "locked_at": None,
        }).eq("id", job["id"]).execute()
        return {"id": job["id"], "status": "completed"}
    except Exception as e:  # noqa: BLE001 - record any failure on the job row
        final = job["attempts"] >= job["max_attempts"] or isinstance(e, (RuntimeError,)) and "not configured" in str(e)
        log.exception("job %s failed", job["id"])
        db.table("processing_jobs").update({
            "status": "failed" if final else "queued", "error": str(e)[:1000], "locked_at": None,
            "finished_at": datetime.now(timezone.utc).isoformat() if final else None,
        }).eq("id", job["id"]).execute()
        return {"id": job["id"], "status": "failed" if final else "retrying", "error": str(e)[:200]}


def run_pending(limit: int = 50) -> list[dict]:
    done = []
    for _ in range(limit):
        r = process_one()
        if r is None:
            break
        done.append(r)
    return done


def loop() -> None:
    s = get_settings()
    log.info("worker started (poll %.1fs)", s.worker_poll_seconds)
    while not _stop.is_set():
        try:
            if not run_pending():
                wake.wait(s.worker_poll_seconds)
                wake.clear()
        except Exception:  # noqa: BLE001 - keep the loop alive through transient DB outages
            log.exception("worker loop error")
            time.sleep(min(30, s.worker_poll_seconds * 3))


def start_background() -> threading.Thread:
    t = threading.Thread(target=loop, name="swadata-worker", daemon=True)
    t.start()
    return t


def stop() -> None:
    _stop.set()
    wake.set()


if __name__ == "__main__":  # standalone worker process (e.g. Render background worker)
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
    loop()
