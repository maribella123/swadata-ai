"""Exact and near-duplicate detection (language-agnostic)."""

from __future__ import annotations

from .text import content_hash, normalize_text


def shingles(text: str, k: int = 5) -> set[str]:
    t = normalize_text(text, keep_newlines=False).lower()
    if len(t) <= k:
        return {t}
    return {t[i : i + k] for i in range(len(t) - k + 1)}


def jaccard(a: set[str], b: set[str]) -> float:
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)


def mark_duplicates(texts: list[str], existing_hashes: set[str] | None = None, near_threshold: float = 0.92) -> list[dict]:
    """Return per-item duplicate info.

    * exact duplicates against `existing_hashes` (database) and earlier items
    * near duplicates (character 5-gram Jaccard) within the batch, for items
      long enough for the measure to be meaningful
    """
    existing_hashes = existing_hashes or set()
    seen: dict[str, int] = {}
    sigs: list[tuple[int, set[str]]] = []
    out: list[dict] = []
    for i, text in enumerate(texts):
        h = content_hash(text)
        info = {"hash": h, "is_duplicate": False, "duplicate_of_index": None, "reason": None}
        if h in existing_hashes:
            info.update(is_duplicate=True, reason="exact_existing")
        elif h in seen:
            info.update(is_duplicate=True, duplicate_of_index=seen[h], reason="exact_in_document")
        elif len(text) >= 40:
            sh = shingles(text)
            for j, other in sigs[-300:]:
                if jaccard(sh, other) >= near_threshold:
                    info.update(is_duplicate=True, duplicate_of_index=j, reason="near_in_document")
                    break
            sigs.append((i, sh))
        seen.setdefault(h, i)
        out.append(info)
    return out
