"""Build a dataset release from approved, consented contributions.

Inclusion rules (also documented on the public governance page):
* contribution status = approved (validated by a reviewer who is not the contributor)
* permissions: research use AND AI training; + public publication for public
  datasets; + commercial use when the dataset licence allows commercial use
* sensitivity != restricted
* documents: segment approved, not a duplicate, document rights VERIFIED with
  permission to digitise and to use for AI training
* speech: explicit AI-training consent on the recording and a transcript
* exact duplicates removed by normalised hash before splitting
Contributor identities are replaced with release-scoped pseudonyms.
"""

from __future__ import annotations

import hashlib
from collections import Counter
from datetime import datetime, timezone

from ..db import chunked, get_db
from ..nlp.text import content_hash, tokenize_words
from .splitter import assign_splits

BUILDER_VERSION = "swadata-builder/1.0"

BASE_SELECT = (
    "id, type, contributor_id, language_id, variety_id, created_at, source_type, is_original, sensitivity, "
    "languages(code), language_varieties(code), content_categories(key), data_licenses(code), metadata, "
    "contribution_permissions(allow_research, allow_ai_training, allow_public_release, allow_commercial), "
    "text_content(version, body, context), reviews(decision, scores)"
)
TYPE_SELECT = {
    "text": "",
    "translation": ", translations(source_text, target_text, source_language_id, target_language_id, source_hash, domain, source_id)",
    "conversation": ", conversation_messages(seq, speaker_role, speaker_label, text, gloss_en)",
    "cultural": ", cultural_metadata(kind, meaning, literal_translation, usage_context, region_origin)",
    "audio": ", audio_assets(id, storage_path, mime_type, duration_seconds, sample_rate, speaker_pseudonym, speaker_age_band, speaker_gender, recording_environment, prompt_text, transcript, transcript_source, consent_ai_training)",
    "document": ", documents(id, title, author, publication_year, rights_status, permission_to_digitise, permission_ai_training, copyright_status, genre)",
}


def _pseudo(release_id: str, contributor_id: str, prefix: str = "ctr") -> str:
    return f"{prefix}_{hashlib.sha256(f'{release_id}:{contributor_id}'.encode()).hexdigest()[:12]}"


def _latest(versions: list[dict]) -> dict | None:
    return max(versions, key=lambda v: v["version"]) if versions else None


def _fetch(db, ctype: str, lang_ids: list[str]) -> list[dict]:
    rows, start = [], 0
    while True:
        q = (
            db.table("contributions")
            .select(BASE_SELECT + TYPE_SELECT[ctype])
            .eq("status", "approved")
            .eq("type", ctype)
            .neq("sensitivity", "restricted")
            .order("created_at")
            .range(start, start + 999)
        )
        if ctype != "translation":
            q = q.in_("language_id", lang_ids)
        batch = q.execute().data
        rows += batch
        if len(batch) < 1000:
            return rows
        start += 1000


def run_dataset_build(release_id: str) -> dict:
    db = get_db()
    release = db.table("dataset_releases").select("*, datasets(*, data_licenses(code, allows_commercial))").eq("id", release_id).single().execute().data
    ds = release["datasets"]
    db.table("dataset_releases").update({"build_status": "processing", "build_error": None}).eq("id", release_id).execute()
    try:
        langs = db.table("languages").select("id, code").execute().data
        code_of = {l["id"]: l["code"] for l in langs}
        lang_ids = [l["id"] for l in langs if l["code"] in release["language_codes"]]
        commercial_licence = bool((ds.get("data_licenses") or {}).get("allows_commercial"))
        excluded: Counter = Counter()

        def permitted(c: dict) -> bool:
            p = c.get("contribution_permissions") or {}
            ok = p.get("allow_research") and p.get("allow_ai_training")
            if ds["access_level"] == "public":
                ok = ok and p.get("allow_public_release")
            if commercial_licence:
                ok = ok and p.get("allow_commercial")
            if not ok:
                excluded["permissions"] += 1
            return bool(ok)

        def base(c: dict) -> dict:
            scores = [v for r in c.get("reviews") or [] if r["decision"] == "approve" for v in (r.get("scores") or {}).values()]
            return {
                "contribution_id": c["id"],
                "language": (c.get("languages") or {}).get("code"),
                "variety": (c.get("language_varieties") or {}).get("code"),
                "category": (c.get("content_categories") or {}).get("key"),
                "source_type": c["source_type"],
                "is_original": c["is_original"],
                "licence": (c.get("data_licenses") or {}).get("code"),
                "contributor": _pseudo(release_id, c["contributor_id"]),
                "collected_at": c["created_at"][:10],
                "review_score": round(sum(scores) / len(scores), 2) if scores else None,
                "_contributor_raw": c["contributor_id"],
            }

        items: list[dict] = []  # {record, key(hash), groups, contribution_id, item_ref, lang}
        t = ds["dataset_type"]

        if t in ("monolingual_text",):
            for c in _fetch(db, "text", lang_ids):
                if not permitted(c):
                    continue
                v = _latest(c.get("text_content") or [])
                if not v:
                    continue
                rec = {**base(c), "text": v["body"], "text_version": v["version"]}
                items.append({"record": rec, "key": content_hash(v["body"]), "groups": [], "item_ref": ""})
            for c in _fetch(db, "document", lang_ids):
                if not permitted(c):
                    continue
                d = c.get("documents") or {}
                if not (d.get("rights_status") == "verified" and d.get("permission_to_digitise") and d.get("permission_ai_training")):
                    excluded["document_rights_not_verified"] += 1
                    continue
                segs, start = [], 0
                while True:
                    batch = db.table("document_extractions").select("id, seq, page_number, paragraph_index, kind, text, is_duplicate").eq("document_id", d["id"]).eq("status", "approved").order("seq").range(start, start + 999).execute().data
                    segs += batch
                    if len(batch) < 1000:
                        break
                    start += 1000
                for s in segs:
                    if s["kind"] == "heading" or s["is_duplicate"]:
                        excluded["document_headings_or_duplicates"] += 1
                        continue
                    rec = {**base(c), "text": s["text"], "segment_kind": s["kind"], "document_title": d.get("title"), "document_author": d.get("author"),
                           "publication_year": d.get("publication_year"), "page": s["page_number"], "paragraph": s["paragraph_index"], "segment_seq": s["seq"]}
                    items.append({"record": rec, "key": content_hash(s["text"]), "groups": [f"doc:{d['id']}"], "item_ref": s["id"]})

        elif t == "parallel_text":
            for c in _fetch(db, "translation", lang_ids):
                tr = c.get("translations") or {}
                if not tr or (tr["source_language_id"] not in lang_ids and tr["target_language_id"] not in lang_ids):
                    continue
                if c.get("sensitivity") == "restricted" or not permitted(c):
                    continue
                v = _latest(c.get("text_content") or [])
                target = v["body"] if v else tr["target_text"]
                rec = {**base(c), "source_language": code_of.get(tr["source_language_id"]), "target_language": code_of.get(tr["target_language_id"]),
                       "source_text": tr["source_text"], "target_text": target, "domain": tr.get("domain"), "language": code_of.get(tr["target_language_id"])}
                items.append({"record": rec, "key": content_hash(tr["source_text"] + "␞" + target), "groups": [f"src:{tr['source_hash']}"], "item_ref": ""})

        elif t in ("conversation", "instruction"):
            for c in _fetch(db, "conversation", lang_ids):
                if not permitted(c):
                    continue
                msgs = sorted(c.get("conversation_messages") or [], key=lambda m: m["seq"])
                if t == "conversation":
                    rec = {**base(c), "conversation_type": (c.get("metadata") or {}).get("conversation_type"),
                           "messages": [{"role": m["speaker_role"], "text": m["text"], **({"gloss_en": m["gloss_en"]} if m["gloss_en"] else {})} for m in msgs]}
                    items.append({"record": rec, "key": content_hash("\n".join(m["text"] for m in msgs)), "groups": [], "item_ref": ""})
                else:
                    asker = {"user", "learner", "speaker_a"}
                    answerer = {"assistant", "teacher", "speaker_b"}
                    for i in range(len(msgs) - 1):
                        a, b = msgs[i], msgs[i + 1]
                        if a["speaker_role"] in asker and b["speaker_role"] in answerer:
                            rec = {**base(c), "instruction": a["text"], "response": b["text"], "context": [m["text"] for m in msgs[:i]][-4:], "turn": i + 1}
                            items.append({"record": rec, "key": content_hash(a["text"] + "␞" + b["text"]), "groups": [f"conv:{c['id']}"], "item_ref": f"turn-{i + 1}"})

        elif t == "cultural":
            for c in _fetch(db, "cultural", lang_ids):
                if not permitted(c):
                    continue
                cm = c.get("cultural_metadata") or {}
                v = _latest(c.get("text_content") or [])
                if not v:
                    continue
                rec = {**base(c), "kind": cm.get("kind"), "expression": v["body"], "meaning": cm.get("meaning"), "literal_translation": cm.get("literal_translation"),
                       "usage_context": cm.get("usage_context"), "region": cm.get("region_origin"), "sensitivity": c["sensitivity"]}
                items.append({"record": rec, "key": content_hash(v["body"]), "groups": [], "item_ref": ""})

        elif t == "speech":
            for c in _fetch(db, "audio", lang_ids):
                if not permitted(c):
                    continue
                a = c.get("audio_assets") or {}
                if not a.get("consent_ai_training"):
                    excluded["no_recording_ai_consent"] += 1
                    continue
                v = _latest(c.get("text_content") or [])
                transcript = (v or {}).get("body") or a.get("transcript")
                if not transcript or a.get("transcript_source") == "automatic":
                    excluded["no_human_transcript"] += 1
                    continue
                rec = {**base(c), "transcript": transcript, "duration_seconds": float(a["duration_seconds"]) if a.get("duration_seconds") else None, "sample_rate": a.get("sample_rate"),
                       "speaker": _pseudo(release_id, c["contributor_id"] + a["speaker_pseudonym"], "spk"), "speaker_age_band": a.get("speaker_age_band"),
                       "speaker_gender": a.get("speaker_gender"), "recording_environment": a.get("recording_environment"), "prompt_text": a.get("prompt_text"),
                       "_storage_path": a["storage_path"], "_mime_type": a["mime_type"], "audio_asset_id": a["id"]}
                items.append({"record": rec, "key": content_hash(transcript + a["id"]), "groups": [], "item_ref": a["id"]})

        restricted = db.table("contributions").select("id", count="exact", head=True).eq("status", "approved").eq("sensitivity", "restricted").in_("language_id", lang_ids).execute().count or 0
        if restricted:
            excluded["restricted_sensitivity"] = restricted

        # Deduplicate (keep earliest), then split.
        seen, unique = set(), []
        for it in items:
            if it["key"] in seen:
                excluded["duplicates"] += 1
                continue
            seen.add(it["key"])
            unique.append(it)

        cfg = release.get("split_config") or {}
        ratios = {"train": float(cfg.get("train", 0.8)), "validation": float(cfg.get("validation", 0.1)), "test": float(cfg.get("test", 0.1))}
        if ds.get("is_benchmark"):
            ratios = {"train": 0.0, "validation": 0.0, "test": 1.0}
        splits = assign_splits([{"contributor": it["record"]["_contributor_raw"], "groups": it["groups"]} for it in unique], ratios, int(cfg.get("seed", 42))) if unique else []
        if ds.get("is_benchmark"):
            splits = ["test"] * len(unique)

        db.table("dataset_items").delete().eq("release_id", release_id).execute()
        rows = []
        for it, split in zip(unique, splits):
            rec = {k: v for k, v in it["record"].items() if k != "_contributor_raw"}
            rows.append({"release_id": release_id, "contribution_id": rec["contribution_id"], "item_ref": it["item_ref"], "split": split, "language_code": rec.get("language") or "und", "record": rec})
        for chunk in chunked(rows, 500):
            db.table("dataset_items").insert(chunk).execute()

        contrib_ids = list({r["contribution_id"] for r in rows})
        for chunk in chunked(contrib_ids, 200):
            db.table("contributions").update({"data_layer": "curated"}).in_("id", chunk).in_("data_layer", ["validated", "raw"]).execute()

        text_fields = ("text", "target_text", "transcript", "expression", "response")
        words = sum(len(tokenize_words(str(r["record"].get(f) or ""))) for r in rows for f in text_fields)
        scores = [r["record"]["review_score"] for r in rows if r["record"].get("review_score") is not None]
        dates = sorted(r["record"]["collected_at"] for r in rows)
        stats = {
            "splits": dict(Counter(r["split"] for r in rows)),
            "languages": dict(Counter(r["language_code"] for r in rows)),
            "contributors": len({r["record"]["contributor"] for r in rows}),
            "words": words,
            "excluded": dict(excluded),
            **({"audio_hours": round(sum(r["record"].get("duration_seconds") or 0 for r in rows) / 3600, 3)} if t == "speech" else {}),
        }
        update = {
            "record_count": len(rows),
            "stats": stats,
            "quality_summary": {
                "human_reviewed_share": "100%",
                "items_with_reviewer_scores": len(scores),
                "mean_reviewer_score_1_to_5": round(sum(scores) / len(scores), 2) if scores else "n/a",
                "split_strategy": "contributor-aware and duplicate-aware (union-find over contributor and source groups)",
            },
            "provenance": {
                "builder": BUILDER_VERSION,
                "built_at": datetime.now(timezone.utc).isoformat(),
                "source": "SwaData AI contributions (approved layer)",
                "inclusion_rules": ["status=approved", "research+ai_training consent", "sensitivity!=restricted", "document rights verified", "exact-duplicate removal"],
                "access_level_at_build": ds["access_level"],
                "contributions": len(contrib_ids),
            },
            "build_status": "completed",
            "build_error": None,
        }
        if not release.get("collection_start") and dates:
            update["collection_start"] = dates[0]
        if not release.get("collection_end") and dates:
            update["collection_end"] = dates[-1]
        db.table("dataset_releases").update(update).eq("id", release_id).execute()
        return {"records": len(rows), **stats}
    except Exception as e:
        db.table("dataset_releases").update({"build_status": "failed", "build_error": str(e)[:500]}).eq("id", release_id).execute()
        raise
