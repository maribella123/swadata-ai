"""chrF and BLEU on a SwaData translation benchmark export (JSONL)."""
import argparse
import json

import sacrebleu


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--predictions", required=True, help="One prediction per line, same order as the benchmark")
    ap.add_argument("--benchmark", required=True)
    a = ap.parse_args()
    refs = [json.loads(l)["target_text"] for l in open(a.benchmark, encoding="utf-8") if l.strip()]
    hyps = [l.rstrip("\n") for l in open(a.predictions, encoding="utf-8")]
    assert len(refs) == len(hyps), "prediction count must match benchmark"
    print(json.dumps({"chrF": round(sacrebleu.corpus_chrf(hyps, [refs]).score, 2), "BLEU": round(sacrebleu.corpus_bleu(hyps, [refs]).score, 2), "n": len(refs)}))


if __name__ == "__main__":
    main()
