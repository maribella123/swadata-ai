"""Language-agnostic text utilities.

Design rules (see docs/ARCHITECTURE.md):
* Never "correct" spelling or grammar — African languages must not be forced
  through English-centric NLP assumptions.
* Normalisation is limited to Unicode NFC, control-character removal and
  whitespace normalisation, so the raw meaning is preserved exactly.
* content_hash() must stay byte-for-byte compatible with the SQL function
  public.content_hash() so duplicates are detected consistently.
"""

from __future__ import annotations

import hashlib
import re
import unicodedata
from dataclasses import dataclass, field

_CONTROL = re.compile(r"[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​﻿]")
_WS = re.compile(r"\s+")
_ASCII_WS = re.compile(r"[ \t\n\r\f\v]+")
_HSPACE = re.compile(r"[ \t  -   　]+")


def normalize_text(text: str, keep_newlines: bool = True) -> str:
    """NFC + strip control/zero-width characters + normalise whitespace."""
    t = unicodedata.normalize("NFC", text or "")
    t = _CONTROL.sub("", t)
    t = t.replace("\r\n", "\n").replace("\r", "\n")
    if keep_newlines:
        t = _HSPACE.sub(" ", t)
        t = "\n".join(line.strip() for line in t.split("\n"))
        t = re.sub(r"\n{3,}", "\n\n", t)
        return t.strip()
    return _WS.sub(" ", t).strip()


def content_hash(text: str) -> str:
    """sha256(lower(trim(collapse_ascii_ws(NFC(text))))) — mirrors public.content_hash() exactly."""
    t = unicodedata.normalize("NFC", text or "")
    t = _ASCII_WS.sub(" ", t).strip(" ").lower()
    return hashlib.sha256(t.encode("utf-8")).hexdigest()


# Sentence segmentation ----------------------------------------------------
# Rule-based and conservative: split after . ! ? (and the Ethiopic ። ፧ ፨)
# when followed by whitespace and an opening character. A short abbreviation
# list avoids common false splits; we deliberately avoid language models
# that encode English-specific rules.
_ABBREV = {"dr", "mr", "mrs", "ms", "prof", "st", "no", "nr", "vol", "pp", "p", "e.g", "i.e", "etc", "vs", "jan", "feb", "mar", "apr", "jun", "jul", "aug", "sep", "sept", "oct", "nov", "dec", "mnu", "nkk", "nks"}
_SENT_END = re.compile(r"([.!?]+[\"'”’)\]]*|[።፧፨])(\s+)(?=[\"'“‘(\[]?[^\s])")


def split_sentences(paragraph: str) -> list[str]:
    text = normalize_text(paragraph, keep_newlines=False)
    if not text:
        return []
    out: list[str] = []
    start = 0
    for m in _SENT_END.finditer(text):
        end = m.end(1)
        candidate = text[start:end].strip()
        last_word = re.split(r"\s+", candidate)[-1].rstrip(".!?\"'”’)]").lower() if candidate else ""
        if last_word in _ABBREV or re.fullmatch(r"\d+|[a-z]", last_word or "x"):
            continue  # abbreviation, list number or initial — keep going
        out.append(candidate)
        start = m.end()
    tail = text[start:].strip()
    if tail:
        out.append(tail)
    return [s for s in out if s]


def split_paragraphs(text: str) -> list[str]:
    """Paragraphs are separated by blank lines; single newlines inside are joined."""
    t = normalize_text(text)
    paras = [p for p in re.split(r"\n\s*\n", t) if p.strip()]
    return [normalize_text(p, keep_newlines=False) for p in paras]


def split_stanzas(text: str) -> list[str]:
    """For poetry: stanzas separated by blank lines; line breaks preserved."""
    t = normalize_text(text)
    return [s.strip() for s in re.split(r"\n\s*\n", t) if s.strip()]


def looks_like_poetry(text: str) -> bool:
    """Heuristic: many short lines, few sentence-final marks, repeated stanza breaks."""
    lines = [l for l in normalize_text(text).split("\n") if l.strip()]
    if len(lines) < 4:
        return False
    avg = sum(len(l) for l in lines) / len(lines)
    ended = sum(1 for l in lines if l.rstrip().endswith((".", "?", "!"))) / len(lines)
    return avg < 55 and ended < 0.5


def tokenize_words(text: str) -> list[str]:
    """Unicode-aware word tokens (letters, marks, digits, apostrophes/hyphens inside words)."""
    return re.findall(r"[\ẁ-ͯ'’-]+", unicodedata.normalize("NFC", text or ""), flags=re.UNICODE)


@dataclass
class TextStats:
    characters: int = 0
    characters_no_spaces: int = 0
    utf8_bytes: int = 0
    words: int = 0
    unique_words: int = 0
    type_token_ratio: float = 0.0
    avg_word_length: float = 0.0
    sentences: int = 0
    paragraphs: int = 0
    non_ascii_ratio: float = 0.0
    scripts: dict[str, int] = field(default_factory=dict)
    tokenizer: dict | None = None


def _script_of(ch: str) -> str:
    try:
        name = unicodedata.name(ch)
    except ValueError:
        return "Unknown"
    for s in ("LATIN", "ETHIOPIC", "ARABIC", "TIFINAGH", "VAI", "NKO", "ADLAM", "CYRILLIC", "GREEK"):
        if name.startswith(s):
            return s.title()
    return "Other"


def text_stats(text: str, tokenizer=None) -> TextStats:
    t = normalize_text(text)
    words = tokenize_words(t)
    lowered = [w.lower() for w in words]
    paras = split_paragraphs(t)
    sents = sum(len(split_sentences(p)) for p in paras)
    letters = [c for c in t if c.isalpha()]
    scripts: dict[str, int] = {}
    for c in letters:
        s = _script_of(c)
        scripts[s] = scripts.get(s, 0) + 1
    st = TextStats(
        characters=len(t),
        characters_no_spaces=len(re.sub(r"\s", "", t)),
        utf8_bytes=len(t.encode("utf-8")),
        words=len(words),
        unique_words=len(set(lowered)),
        type_token_ratio=round(len(set(lowered)) / len(words), 4) if words else 0.0,
        avg_word_length=round(sum(len(w) for w in words) / len(words), 2) if words else 0.0,
        sentences=sents,
        paragraphs=len(paras),
        non_ascii_ratio=round(sum(1 for c in t if ord(c) > 127) / len(t), 4) if t else 0.0,
        scripts=scripts,
    )
    if tokenizer is not None and t:
        ids = tokenizer.encode(t)
        st.tokenizer = {"tokens": len(ids), "tokens_per_word": round(len(ids) / max(1, len(words)), 3)}
    return st


def identify_language(text: str) -> dict:
    """Optional language identification.

    Uses lingua (if installed) only for the languages it actually supports.
    siSwati, isiNdebele, Sepedi and Tshivenda are NOT supported by common
    detectors, so the result must never be used to auto-label or reject data.
    """
    try:
        from lingua import LanguageDetectorBuilder  # type: ignore
    except Exception:
        return {"supported": False, "reason": "No language identifier installed (see requirements-optional.txt)."}
    detector = LanguageDetectorBuilder.from_all_languages().with_preloaded_language_models().build()
    results = detector.compute_language_confidence_values(text)[:3]
    return {
        "supported": True,
        "candidates": [{"language": r.language.iso_code_639_3.name.lower(), "confidence": round(r.value, 4)} for r in results],
        "warning": "Detector does not cover siSwati, isiNdebele, Sepedi or Tshivenda; treat as advisory only.",
    }
