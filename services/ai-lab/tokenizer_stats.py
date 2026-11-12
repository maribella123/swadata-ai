"""Tokenizer fertility on a SwaData release: lower tokens-per-word generally means less fragmentation."""
import argparse
import re

from datasets import load_from_disk
from transformers import AutoTokenizer

WORD = re.compile(r"[\ẁ-ͯ'’-]+", re.UNICODE)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dataset", required=True)
    ap.add_argument("--tokenizers", required=True, help="Comma-separated HF tokenizer ids")
    ap.add_argument("--field", default="text")
    a = ap.parse_args()
    ds = load_from_disk(a.dataset)["train"]
    texts = [t for t in ds[a.field] if t][:5000]
    words = [w for t in texts for w in WORD.findall(t)]
    for name in a.tokenizers.split(","):
        tok = AutoTokenizer.from_pretrained(name)
        pieces = [len(tok.tokenize(w)) for w in words]
        fert = sum(pieces) / max(1, len(words))
        frag = sum(1 for p in pieces if p >= 3) / max(1, len(words))
        print(f"{name:40s} fertility={fert:.2f} tokens/word  words_split_3plus={frag:.1%}")


if __name__ == "__main__":
    main()
