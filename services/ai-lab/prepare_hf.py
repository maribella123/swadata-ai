"""Convert a SwaData export (JSONL or Parquet) into a Hugging Face DatasetDict."""
import argparse

from datasets import DatasetDict, load_dataset


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--file", required=True, help="SwaData .jsonl or .parquet export")
    ap.add_argument("--out", required=True, help="Directory for save_to_disk")
    ap.add_argument("--push", help="Optional private Hub repo id, e.g. org/swadata-ss-mono")
    a = ap.parse_args()
    kind = "parquet" if a.file.endswith(".parquet") else "json"
    full = load_dataset(kind, data_files=a.file, split="train")
    splits = {s: full.filter(lambda r, s=s: r["split"] == s) for s in ("train", "validation", "test")}
    dd = DatasetDict({k: v for k, v in splits.items() if len(v)})
    print(dd)
    dd.save_to_disk(a.out)
    if a.push:
        dd.push_to_hub(a.push, private=True)


if __name__ == "__main__":
    main()
