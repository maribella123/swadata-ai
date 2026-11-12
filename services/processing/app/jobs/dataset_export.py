"""Write a dataset release to CSV / JSON / JSONL / TXT / Parquet / WAV(zip) with a data card."""

from __future__ import annotations

import hashlib
import io
import json
import zipfile
from datetime import datetime, timezone

import pandas as pd

from ..db import chunked, download, get_db, upload
from ..extract.audio import to_wav_16k_mono

CONTENT_TYPES = {
    "csv": "text/csv", "json": "application/json", "jsonl": "application/x-ndjson",
    "txt": "text/plain", "parquet": "application/octet-stream", "wav": "application/zip",
}
SUFFIX = {"audio/wav": ".wav", "audio/x-wav": ".wav", "audio/wave": ".wav", "audio/mpeg": ".mp3", "audio/mp3": ".mp3", "audio/webm": ".webm", "audio/ogg": ".ogg", "audio/mp4": ".m4a", "audio/x-m4a": ".m4a", "audio/m4a": ".m4a", "audio/aac": ".aac"}


def _items(db, release_id: str) -> list[dict]:
    out, start = [], 0
    while True:
        batch = db.table("dataset_items").select("id, split, language_code, record").eq("release_id", release_id).order("created_at").range(start, start + 999).execute().data
        out += batch
        if len(batch) < 1000:
            return out
        start += 1000


def datacard(ds: dict, release: dict, count: int) -> dict:
    lic = ds.get("data_licenses") or {}
    return {
        "name": ds["name"],
        "slug": ds["slug"],
        "version": release["version"],
        "dataset_type": ds["dataset_type"],
        "languages": release["language_codes"],
        "collection_period": {"start": release.get("collection_start"), "end": release.get("collection_end")},
        "number_of_records": count,
        "splits": (release.get("stats") or {}).get("splits", {}),
        "licence": {"code": lic.get("code"), "name": lic.get("name"), "url": lic.get("url")},
        "access_level": ds["access_level"],
        "intended_use": ds.get("intended_use"),
        "limitations": ds.get("limitations"),
        "processing_methodology": ds.get("processing_methodology"),
        "quality": release.get("quality_summary") or {},
        "provenance": release.get("provenance") or {},
        "statistics": release.get("stats") or {},
        "is_benchmark": ds.get("is_benchmark", False),
        "citation": f"SwaData AI contributors ({datetime.now(timezone.utc).year}). {ds['name']} v{release['version']}. SwaData AI.",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "privacy": "Contributor and speaker identities are release-scoped pseudonyms. Do not attempt re-identification.",
    }


def datacard_markdown(card: dict) -> str:
    lines = [f"# {card['name']} — v{card['version']}", "", f"**Type:** {card['dataset_type']}  ", f"**Languages:** {', '.join(card['languages'])}  ",
             f"**Records:** {card['number_of_records']}  ", f"**Splits:** {json.dumps(card['splits'])}  ",
             f"**Collection period:** {card['collection_period']['start']} – {card['collection_period']['end']}  ",
             f"**Licence:** {card['licence'].get('name')} ({card['licence'].get('code')})", "",
             "## Intended use", card.get("intended_use") or "", "", "## Limitations", card.get("limitations") or "", "",
             "## Processing methodology", card.get("processing_methodology") or "", "", "## Quality", "```json", json.dumps(card["quality"], indent=2), "```", "",
             "## Provenance", "```json", json.dumps(card["provenance"], indent=2), "```", "", "## Privacy", card["privacy"], "", "## Citation", card["citation"], ""]
    return "\n".join(lines)


def _public(rec: dict) -> dict:
    return {k: v for k, v in rec.items() if not k.startswith("_")}


def _flat(items: list[dict]) -> pd.DataFrame:
    rows = []
    for it in items:
        r = {"id": it["id"], "split": it["split"], **_public(it["record"])}
        rows.append({k: (json.dumps(v, ensure_ascii=False) if isinstance(v, (list, dict)) else v) for k, v in r.items()})
    return pd.DataFrame(rows).convert_dtypes()


def _txt(items: list[dict], dtype: str) -> str:
    out = []
    for it in items:
        r = it["record"]
        if dtype == "parallel_text":
            out.append(f"{r['source_text']}\t{r['target_text']}".replace("\n", " "))
        elif dtype == "conversation":
            out.append("\n".join(f"{m['role']}: {m['text']}" for m in r["messages"]) + "\n")
        elif dtype == "instruction":
            out.append(f"{r['instruction']}\t{r['response']}".replace("\n", " "))
        elif dtype == "speech":
            out.append(f"{it['id']}\t{r['transcript']}".replace("\n", " "))
        else:
            out.append(str(r.get("text") or r.get("expression") or "").replace("\n", " / "))
    return "\n".join(out) + "\n"


def run_dataset_export(export_id: str) -> dict:
    db = get_db()
    exp = db.table("dataset_exports").select("*").eq("id", export_id).single().execute().data
    release = db.table("dataset_releases").select("*, datasets(*, data_licenses(code, name, url))").eq("id", exp["release_id"]).single().execute().data
    ds = release["datasets"]
    db.table("dataset_exports").update({"status": "processing", "error": None}).eq("id", export_id).execute()
    try:
        if release["build_status"] != "completed":
            raise RuntimeError("Release has not been built successfully.")
        items = _items(db, release["id"])
        if not items:
            raise RuntimeError("Release has no records to export.")
        card = datacard(ds, release, len(items))
        fmt = exp["format"]
        base = f"{ds['slug']}/v{release['version']}/{ds['slug']}-v{release['version']}"

        if fmt == "jsonl":
            data = "\n".join(json.dumps({"id": i["id"], "split": i["split"], **_public(i["record"])}, ensure_ascii=False) for i in items).encode() + b"\n"
        elif fmt == "json":
            data = json.dumps({"datacard": card, "records": [{"id": i["id"], "split": i["split"], **_public(i["record"])} for i in items]}, ensure_ascii=False, indent=1).encode()
        elif fmt == "csv":
            data = _flat(items).to_csv(index=False).encode("utf-8-sig")
        elif fmt == "parquet":
            buf = io.BytesIO()
            _flat(items).to_parquet(buf, index=False)
            data = buf.getvalue()
        elif fmt == "txt":
            data = _txt(items, ds["dataset_type"]).encode()
        elif fmt == "wav":
            if ds["dataset_type"] != "speech":
                raise RuntimeError("WAV export is only available for speech datasets.")
            buf = io.BytesIO()
            with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
                meta = []
                for i in items:
                    r = i["record"]
                    wav = to_wav_16k_mono(download("audio", r["_storage_path"]), SUFFIX.get(r["_mime_type"], ""))
                    path = f"audio/{i['split']}/{i['id']}.wav"
                    z.writestr(path, wav)
                    meta.append({"file": path, "id": i["id"], "split": i["split"], **_public(r)})
                z.writestr("metadata.jsonl", "\n".join(json.dumps(m, ensure_ascii=False) for m in meta) + "\n")
                z.writestr("README.md", datacard_markdown(card))
                z.writestr("datacard.json", json.dumps(card, ensure_ascii=False, indent=2))
            data = buf.getvalue()
        else:
            raise RuntimeError(f"Unsupported format {fmt}")

        path = f"{base}.{'zip' if fmt == 'wav' else fmt}"
        upload("dataset-exports", path, data, CONTENT_TYPES[fmt])
        upload("dataset-exports", f"{ds['slug']}/v{release['version']}/README.md", datacard_markdown(card).encode(), "text/markdown")
        checksum = hashlib.sha256(data).hexdigest()
        db.table("dataset_exports").update({
            "status": "completed", "storage_path": path, "file_size_bytes": len(data), "record_count": len(items),
            "checksum_sha256": checksum, "completed_at": datetime.now(timezone.utc).isoformat(), "error": None,
        }).eq("id", export_id).execute()
        ids = list({i["record"]["contribution_id"] for i in items})
        for chunk in chunked(ids, 200):
            db.table("contributions").update({"data_layer": "model_ready"}).in_("id", chunk).execute()
        return {"path": path, "bytes": len(data), "records": len(items), "sha256": checksum}
    except Exception as e:
        db.table("dataset_exports").update({"status": "failed", "error": str(e)[:500]}).eq("id", export_id).execute()
        raise
