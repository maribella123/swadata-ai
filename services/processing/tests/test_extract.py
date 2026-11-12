import io

import pytest

from app.extract.documents import ExtractionError, extract_document


def _pdf(text_pages):
    import fitz

    doc = fitz.open()
    for t in text_pages:
        page = doc.new_page()
        page.insert_text((72, 72), t, fontsize=11)
    return doc.tobytes()


def test_pdf_pages_and_paragraphs():
    data = _pdf(["First paragraph on page one.\n\nSecond paragraph here.", "Page two text continues."])
    r = extract_document(data, "pdf")
    assert r.pages == 2
    assert {b.page for b in r.blocks} == {1, 2}
    assert any("Page two" in b.text for b in r.blocks)


def test_docx_headings_and_poetry():
    import docx

    d = docx.Document()
    d.add_heading("Inkondlo", level=1)
    for line in ["Lilanga liyaphuma", "Tinyoni tiyacula", "", "Umoya uyavunguta", "Sonkhe siyajabula"]:
        d.add_paragraph(line)
    buf = io.BytesIO()
    d.save(buf)
    prose = extract_document(buf.getvalue(), "docx")
    assert prose.blocks[0].kind == "heading"
    poem = extract_document(buf.getvalue(), "docx", poetry=True)
    stanzas = [b for b in poem.blocks if b.kind == "stanza"]
    assert len(stanzas) == 2 and stanzas[0].text.count("\n") >= 1


def test_txt_encodings():
    assert extract_document("Sawubona\n\nUnjani".encode("utf-16"), "txt").blocks[0].text == "Sawubona"
    assert len(extract_document("Ḓuvha ḽavhuḓi\n\nNdi a livhuwa".encode("utf-8"), "txt").blocks) == 2


@pytest.mark.skipif(__import__("shutil").which("tesseract") is None, reason="tesseract not installed")
def test_ocr_image():
    from PIL import Image, ImageDraw, ImageFont

    img = Image.new("RGB", (1400, 300), "white")
    d = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype("DejaVuSans.ttf", 48)
    except OSError:
        font = ImageFont.load_default(size=48)
    d.text((40, 100), "Preserving African Languages", fill="black", font=font)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    r = extract_document(buf.getvalue(), "image")
    assert r.ocr_pages == 1
    assert "African" in " ".join(b.text for b in r.blocks)


def test_bad_pdf():
    with pytest.raises(ExtractionError):
        extract_document(b"not a pdf", "pdf")
