"""SwaData AI processing service (FastAPI).

Internal service called by the Next.js server with a shared bearer token.
It never serves user data directly; results are written to Postgres where
Row Level Security controls access.
"""

from __future__ import annotations

import hmac
import logging
import shutil
import time
from collections import defaultdict, deque
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from . import worker
from .config import get_settings
from .nlp.dedupe import mark_duplicates
from .nlp.text import content_hash, identify_language, normalize_text, split_paragraphs, split_sentences, text_stats

VERSION = "1.0.0"
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")


@asynccontextmanager
async def lifespan(app: FastAPI):
    s = get_settings()
    if s.worker_enabled and s.supabase_service_role_key:
        worker.start_background()
    yield
    worker.stop()


app = FastAPI(
    title="SwaData AI Processing Service",
    version=VERSION,
    description="Document extraction, OCR, segmentation, deduplication, audio analysis, optional transcription and dataset export for SwaData AI.",
    lifespan=lifespan,
)
app.add_middleware(CORSMiddleware, allow_origins=get_settings().cors_origins.split(","), allow_methods=["GET", "POST"], allow_headers=["Authorization", "Content-Type"])


def require_token(authorization: str = Header(default="")) -> None:
    """Fail closed: if no token is configured, every protected call is rejected."""
    expected = get_settings().processing_service_token
    supplied = authorization.removeprefix("Bearer ").strip()
    if not expected or not hmac.compare_digest(supplied.encode(), expected.encode()):
        raise HTTPException(status_code=401, detail="Invalid or missing service token")


_hits: dict[str, deque] = defaultdict(deque)


def rate_limit(request: Request, per_minute: int = 120) -> None:
    key = request.client.host if request.client else "unknown"
    now = time.monotonic()
    q = _hits[key]
    while q and now - q[0] > 60:
        q.popleft()
    if len(q) >= per_minute:
        raise HTTPException(status_code=429, detail="Too many requests")
    q.append(now)


class TextIn(BaseModel):
    text: str = Field(..., min_length=1, max_length=200_000)
    language: str | None = Field(default=None, description="BCP-47 code supplied by the contributor (never inferred)")
    identify_language: bool = False


class DedupeIn(BaseModel):
    texts: list[str] = Field(..., min_length=1, max_length=5000)


@app.get("/health")
def health() -> dict:
    s = get_settings()
    return {
        "status": "ok",
        "version": VERSION,
        "env": s.app_env,
        "worker_enabled": s.worker_enabled,
        "ocr": {"tesseract": bool(shutil.which("tesseract")), "lang": s.ocr_lang},
        "ffmpeg": bool(shutil.which("ffmpeg")),
        "transcription": {"configured": bool(s.whisper_model), "model": s.whisper_model or None},
    }


@app.post("/v1/jobs/kick", dependencies=[Depends(require_token)])
def kick() -> dict:
    """Wake the background worker immediately (jobs are durable in Postgres)."""
    worker.wake.set()
    return {"ok": True}


@app.post("/v1/jobs/run", dependencies=[Depends(require_token)])
def run_jobs(limit: int = 20) -> dict:
    """Synchronously process up to `limit` queued jobs (useful for cron or tests)."""
    return {"processed": worker.run_pending(min(max(limit, 1), 100))}


@app.post("/v1/text/analyze", dependencies=[Depends(require_token), Depends(rate_limit)])
def analyze(body: TextIn) -> dict:
    normalized = normalize_text(body.text)
    paragraphs = split_paragraphs(normalized)
    return {
        "language": body.language,
        "normalized": normalized,
        "content_hash": content_hash(body.text),
        "paragraphs": paragraphs,
        "sentences": [s for p in paragraphs for s in split_sentences(p)],
        "stats": text_stats(normalized).__dict__,
        "language_identification": identify_language(normalized) if body.identify_language else None,
        "note": "Text is normalised (Unicode NFC, whitespace) only. No spelling or grammar correction is applied.",
    }


@app.post("/v1/text/dedupe", dependencies=[Depends(require_token), Depends(rate_limit)])
def dedupe(body: DedupeIn) -> dict:
    return {"results": mark_duplicates(body.texts)}
