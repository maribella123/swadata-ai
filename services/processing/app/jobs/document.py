"""Document extraction job: extract → segment → deduplicate → store → queue for review."""

from __future__ import annotations

import hashlib
from datetime import datetime, timezone

from ..db import chunked, download, get_db
from ..extract.documents import ExtractionError, extract_document
from ..nlp.dedupe import mark_duplicates
from ..nlp.text import looks_like_poetry, split_sentences, split_stanzas, text_stats


def run_document_extract(document_id: str) -> dict:
    db = get_db()
    doc = db.table("documents").select("*").eq("id", document_id).single().execute().data
    db.table("documents").update({"extraction_status": "processing", "extraction_error": None}).eq("id", document_id).execute()
    try:
        data = download(doc["storage_bucket"], doc["storage_path"])
        checksum = hashlib.sha256(data).hexdigest()
        if doc.get("checksum_sha256") and doc["checksum_sha256"] != checksum:
            raise ExtractionError("Checksum mismatch: the stored file differs from the uploaded file.")

        result = extract_document(data, doc["file_type"], poetry=doc["is_poetry"], scanned=doc["is_scanned"])
        all_text = "\n\n".join(b.text for b in result.blocks)
        poetry = doc["is_poetry"] or (doc["genre"] in ("poetry",)) or looks_like_poetry(all_text)

        # Segment: poetry keeps stanzas (line breaks preserved); prose → sentences
        # tagged with page and paragraph index so boundaries are recoverable.
        segments: list[dict] = []
        for p_idx, block in enumerate(result.blocks):
            if block.kind == "heading":
                segments.append({"page": block.page, "para": p_idx, "kind": "heading", "text": block.text, "conf": block.ocr_confidence})
            elif poetry:
                for stanza in split_stanzas(block.text) if block.kind != "stanza" else [block.text]:
                    segments.append({"page": block.page, "para": p_idx, "kind": "stanza", "text": stanza, "conf": block.ocr_confidence, "lines": stanza.count("\n") + 1})
            else:
                for s in split_sentences(block.text):
                    segments.append({"page": block.page, "para": p_idx, "kind": "sentence", "text": s, "conf": block.ocr_confidence})
        segments = [s for s in segments if s["text"].strip()]
        if not segments:
            raise ExtractionError("No text could be extracted. If this is a scan, mark it as scanned so OCR is applied.")

        # Duplicates: against approved/pending extractions of OTHER documents and existing text contributions.
        from ..nlp.text import content_hash

        hashes = list({content_hash(s["text"]) for s in segments})
        existing: set[str] = set()
        for chunk in chunked(hashes, 150):
            r1 = db.table("document_extractions").select("normalized_hash").in_("normalized_hash", chunk).neq("document_id", document_id).neq("status", "rejected").execute().data
            r2 = db.table("text_content").select("normalized_hash").in_("normalized_hash", chunk).execute().data
            existing |= {r["normalized_hash"] for r in r1 + r2}
        dups = mark_duplicates([s["text"] for s in segments], existing)

        db.table("document_extractions").delete().eq("document_id", document_id).execute()
        rows = [
            {
                "document_id": document_id,
                "seq": i + 1,
                "page_number": s["page"],
                "paragraph_index": s["para"],
                "kind": s["kind"],
                "text": s["text"],
                "is_duplicate": d["is_duplicate"],
                "ocr_confidence": round(s["conf"], 2) if s["conf"] is not None else None,
                "metadata": {k: v for k, v in {"duplicate_reason": d["reason"], "duplicate_of_seq": (d["duplicate_of_index"] + 1) if d["duplicate_of_index"] is not None else None, "lines": s.get("lines")}.items() if v is not None},
            }
            for i, (s, d) in enumerate(zip(segments, dups))
        ]
        for chunk in chunked(rows, 500):
            db.table("document_extractions").insert(chunk).execute()

        st = text_stats(all_text)
        stats = {
            "pages": result.pages,
            "segments": len(rows),
            "paragraphs": len([b for b in result.blocks if b.kind != "heading"]),
            "headings": sum(1 for s in segments if s["kind"] == "heading"),
            "sentences": sum(1 for s in segments if s["kind"] == "sentence"),
            "stanzas": sum(1 for s in segments if s["kind"] == "stanza"),
            "words": st.words,
            "characters": st.characters,
            "unique_words": st.unique_words,
            "duplicates": sum(1 for d in dups if d["is_duplicate"]),
            "ocr_pages": result.ocr_pages,
            "mean_ocr_confidence": result.mean_ocr_confidence,
            "poetry_detected": poetry,
            "scripts": st.scripts,
            "warnings": result.warnings,
        }
        db.table("documents").update({
            "extraction_status": "completed",
            "extraction_stats": stats,
            "page_count": result.pages,
            "is_poetry": poetry,
            "checksum_sha256": checksum,
            "extracted_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", document_id).execute()
        db.table("quality_checks").insert({
            "contribution_id": doc["contribution_id"], "check_type": "document_extraction", "passed": True,
            "score": stats["segments"], "details": {k: stats[k] for k in ("segments", "duplicates", "ocr_pages", "mean_ocr_confidence")},
        }).execute()
        return stats
    except ExtractionError as e:
        db.table("documents").update({"extraction_status": "failed", "extraction_error": str(e)}).eq("id", document_id).execute()
        raise
    except Exception as e:
        db.table("documents").update({"extraction_status": "failed", "extraction_error": "Extraction failed unexpectedly. An administrator can retry."}).eq("id", document_id).execute()
        raise e
