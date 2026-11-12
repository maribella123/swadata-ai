from app.nlp.dedupe import mark_duplicates
from app.nlp.text import content_hash, looks_like_poetry, normalize_text, split_paragraphs, split_sentences, text_stats


def test_normalize_preserves_diacritics_and_nfc():
    decomposed = "Tshivenda: ḓ"  # d + combining circumflex below
    out = normalize_text(decomposed)
    assert out == "Tshivenda: ḓ"  # composed ḓ
    assert normalize_text("  a​ b\t\tc \r\n\r\n\r\n d ") == "a b c\n\nd"


def test_normalize_never_changes_spelling():
    text = "Ngiyabonga kakhulu, umngani wami!"
    assert normalize_text(text) == text


def test_content_hash_is_whitespace_and_case_insensitive():
    assert content_hash("Sawubona  Mngani") == content_hash(" sawubona\nmngani ")
    assert content_hash("a") != content_hash("b")


def test_sentence_split_conservative_with_abbreviations():
    s = split_sentences("Dr. Dlamini wafika. Watsi: \"Sawubona!\" Kwase kuhamba kahle. 3. Item")
    assert s[0] == "Dr. Dlamini wafika."
    assert any(x.startswith('Watsi') for x in s)
    assert len(s) >= 3


def test_ethiopic_sentence_marks():
    assert len(split_sentences("ሰላም ነው። እንዴት ነህ፧")) == 2


def test_paragraphs():
    assert split_paragraphs("one\nline\n\ntwo") == ["one line", "two"]


def test_poetry_detection():
    poem = "Lilanga liyaphuma\nTinyoni tiyacula\nUmoya uyavunguta\nSonkhe siyajabula\n\nInkhosi yami\nSiyabonga"
    prose = "This is a long paragraph of prose that keeps going with full sentences. It ends properly with punctuation. Another sentence follows here."
    assert looks_like_poetry(poem)
    assert not looks_like_poetry(prose)


def test_text_stats():
    st = text_stats("Sawubona mngani. Unjani?\n\nNgikhona.")
    assert st.words == 4 and st.sentences == 3 and st.paragraphs == 2
    assert st.scripts.get("Latin")


def test_mark_duplicates_exact_and_near():
    texts = [
        "Lena ngumusho wekucala lomudze kakhulu lokuhlola kuphindvwa.",
        "lena ngumusho wekucala lomudze kakhulu lokuhlola kuphindvwa.",
        "Lena ngumusho wekucala lomudze kakhulu lokuhlola kuphindvwa!",
        "Something completely different and unrelated to the others.",
    ]
    r = mark_duplicates(texts, existing_hashes={content_hash("already in db")})
    assert [x["is_duplicate"] for x in r] == [False, True, True, False]
    assert r[1]["reason"] == "exact_in_document" and r[2]["reason"] == "near_in_document"
    assert mark_duplicates(["Already in DB"], {content_hash("already in db")})[0]["reason"] == "exact_existing"
