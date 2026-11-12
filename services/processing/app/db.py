"""Supabase access using the service role (server-side only; bypasses RLS).

The service only acts on job rows that the database itself enqueued, and
it never exposes data to callers — results are written back to Postgres,
where RLS governs who can read them.
"""

from __future__ import annotations

from functools import lru_cache

from supabase import Client, create_client

from .config import get_settings


@lru_cache
def get_db() -> Client:
    s = get_settings()
    if not s.supabase_service_role_key:
        raise RuntimeError("SUPABASE_SERVICE_ROLE_KEY is not configured")
    return create_client(s.supabase_url, s.supabase_service_role_key)


def download(bucket: str, path: str) -> bytes:
    return get_db().storage.from_(bucket).download(path)


def upload(bucket: str, path: str, data: bytes, content_type: str) -> None:
    get_db().storage.from_(bucket).upload(path, data, {"content-type": content_type, "upsert": "true"})


def chunked(seq, n):
    for i in range(0, len(seq), n):
        yield seq[i : i + n]
