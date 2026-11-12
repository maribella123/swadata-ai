"""Document text extraction preserving page, paragraph and stanza structure.

Returns a list of Block(page, text, kind, ocr_confidence). Blocks are later
segmented into sentences (prose) or kept as stanzas (poetry).
"""

from __future__ import annotations

import io
import re
import zipfile
from dataclasses import dataclass

from charset_normalizer import from_bytes

from ..config import get_settings
from ..nlp.text import normalize_text


class ExtractionError(Exception):
    pass


@dataclass
class Block:
    page: int | None
    text: str
    kind: str = "paragraph"  # paragraph | heading | stanza
    ocr_confidence: float | None = None


@dataclass
class ExtractionResult:
    blocks: list[Block]
    pages: int | None
    ocr_pages: int
    mean_ocr_confidence: float | None
    warnings: list[str]


def _ocr_image(img) -> tuple[str, float | None]:
    import pytesseract

    s = get_settings()
    try:
        data = pytesseract.image_to_data(img, lang=s.ocr_lang, output_type=pytesseract.Output.DICT)
    except pytesseract.TesseractNotFoundError as e:  # pragma: no cover - environment specific
        raise ExtractionError("Tesseract OCR is not installed on the processing server.") from e
    confs = [float(c) for c, w in zip(data["conf"], data["text"]) if w.strip() and float(c) >= 0]
    # Rebuild text with paragraph structure from Tesseract's block/par/line ids.
    lines: dict[tuple[int, int, int], list[str]] = {}
    for i, word in enumerate(data["text"]):
        if word.strip():
            key = (data["block_num"][i], data["par_num"][i], data["line_num"][i])
            lines.setdefault(key, []).append(word)
    out, last_par = [], None
    for (b, p, _l), words in sorted(lines.items()):
        if last_par is not None and (b, p) != last_par:
            out.append("")
        out.append(" ".join(words))
        last_par = (b, p)
    return "\n".join(out), (sum(confs) / len(confs) if confs else None)


def _blocks_from_text(text: str, page: int | None, poetry: bool, conf: float | None = None) -> list[Block]:
    t = normalize_text(text)
    chunks = [c.strip() for c in re.split(r"\n\s*\n", t) if c.strip()]
    blocks = []
    for c in chunks:
        if poetry:
            blocks.append(Block(page, c, "stanza", conf))
        else:
            joined = normalize_text(c, keep_newlines=False)
            is_heading = len(joined) < 80 and "\n" not in c and not joined.endswith((".", ",", ";", ":", "?", "!")) and len(joined.split()) <= 10
            blocks.append(Block(page, joined, "heading" if is_heading else "paragraph", conf))
    return blocks


def extract_pdf(data: bytes, poetry: bool, force_ocr: bool) -> ExtractionResult:
    import fitz  # PyMuPDF
    from PIL import Image

    s = get_settings()
    try:
        doc = fitz.open(stream=data, filetype="pdf")
    except Exception as e:
        raise ExtractionError("The PDF could not be opened. It may be corrupted or password-protected.") from e
    if doc.needs_pass:
        raise ExtractionError("The PDF is password-protected.")
    blocks: list[Block] = []
    ocr_pages, confs, warnings = 0, [], []
    for pno, page in enumerate(doc, start=1):
        text = ""
        if not force_ocr:
            # "blocks" keeps the PDF's own paragraph grouping; sort reading order.
            raw = page.get_text("blocks", sort=True)
            parts = [b[4] for b in raw if b[6] == 0 and b[4].strip()]
            text = "\n\n".join(p if poetry else p.replace("\n", " ") for p in parts)
        if force_ocr or len(text.strip()) < s.ocr_min_text_chars:
            pix = page.get_pixmap(dpi=s.ocr_dpi)
            img = Image.open(io.BytesIO(pix.tobytes("png")))
            text, conf = _ocr_image(img)
            ocr_pages += 1
            if conf is not None:
                confs.append(conf)
            blocks.extend(_blocks_from_text(text, pno, poetry, conf))
        else:
            blocks.extend(_blocks_from_text(text, pno, poetry))
    if ocr_pages:
        warnings.append(f"{ocr_pages} page(s) processed with OCR ({s.ocr_lang}); review carefully, especially diacritics.")
    return ExtractionResult(blocks, doc.page_count, ocr_pages, round(sum(confs) / len(confs), 2) if confs else None, warnings)


def extract_docx(data: bytes, poetry: bool) -> ExtractionResult:
    import docx

    try:
        d = docx.Document(io.BytesIO(data))
    except Exception as e:
        raise ExtractionError("The Word document could not be read.") from e
    blocks: list[Block] = []
    stanza: list[str] = []
    for p in d.paragraphs:
        text = p.text.strip()
        style = (p.style.name or "").lower() if p.style is not None else ""
        if poetry:
            if text:
                stanza.append(text)
            elif stanza:
                blocks.append(Block(None, normalize_text("\n".join(stanza)), "stanza"))
                stanza = []
            continue
        if not text:
            continue
        kind = "heading" if style.startswith("heading") or style == "title" else "paragraph"
        blocks.append(Block(None, normalize_text(text, keep_newlines=False), kind))
    if stanza:
        blocks.append(Block(None, normalize_text("\n".join(stanza)), "stanza"))
    for table in d.tables:
        for row in table.rows:
            cells = [c.text.strip() for c in row.cells if c.text.strip()]
            if cells:
                blocks.append(Block(None, normalize_text(" | ".join(cells), keep_newlines=False), "paragraph"))
    return ExtractionResult(blocks, None, 0, None, [])


def extract_txt(data: bytes, poetry: bool) -> ExtractionResult:
    if data[:2] in (b"\xff\xfe", b"\xfe\xff"):
        text = data.decode("utf-16")
    else:
        try:
            text = data.decode("utf-8-sig")
        except UnicodeDecodeError:
            best = from_bytes(data).best()
            if best is None:
                raise ExtractionError("Could not detect the text encoding.")
            text = str(best)
    return ExtractionResult(_blocks_from_text(text, None, poetry), None, 0, None, [])


def extract_epub(data: bytes, poetry: bool) -> ExtractionResult:
    from bs4 import BeautifulSoup
    import ebooklib
    from ebooklib import epub

    try:
        zipfile.ZipFile(io.BytesIO(data)).testzip()
        import tempfile, os

        with tempfile.NamedTemporaryFile(suffix=".epub", delete=False) as f:
            f.write(data)
            path = f.name
        try:
            book = epub.read_epub(path)
        finally:
            os.unlink(path)
    except Exception as e:
        raise ExtractionError("The EPUB could not be read (DRM-protected EPUBs are not supported).") from e
    blocks: list[Block] = []
    chapter = 0
    for item in book.get_items_of_type(ebooklib.ITEM_DOCUMENT):
        chapter += 1
        soup = BeautifulSoup(item.get_content(), "html.parser")
        for el in soup.find_all(["h1", "h2", "h3", "h4", "p", "div", "li"]):
            if el.name == "div" and el.find(["p", "div"]):
                continue
            if poetry:
                text = el.get_text("\n", strip=True)
            else:
                text = el.get_text(" ", strip=True)
            if text:
                kind = "heading" if el.name.startswith("h") else ("stanza" if poetry else "paragraph")
                blocks.append(Block(chapter, normalize_text(text, keep_newlines=poetry), kind))
    return ExtractionResult(blocks, chapter, 0, None, ["EPUB chapters are recorded in the page field."])


def extract_image(data: bytes, poetry: bool) -> ExtractionResult:
    from PIL import Image, ImageOps

    try:
        img = Image.open(io.BytesIO(data))
        img = ImageOps.exif_transpose(img).convert("L")
    except Exception as e:
        raise ExtractionError("The image could not be opened.") from e
    text, conf = _ocr_image(img)
    s = get_settings()
    return ExtractionResult(_blocks_from_text(text, 1, poetry, conf), 1, 1, round(conf, 2) if conf else None, [f"Processed with OCR ({s.ocr_lang})."])


def extract_document(data: bytes, file_type: str, poetry: bool = False, scanned: bool = False) -> ExtractionResult:
    if file_type == "pdf":
        return extract_pdf(data, poetry, force_ocr=scanned)
    if file_type == "docx":
        return extract_docx(data, poetry)
    if file_type == "txt":
        return extract_txt(data, poetry)
    if file_type == "epub":
        return extract_epub(data, poetry)
    if file_type == "image":
        return extract_image(data, poetry)
    raise ExtractionError(f"Unsupported file type: {file_type}")
