# SwaData AI — African Language AI Lab

Model work runs **outside** the web platform, on GPU infrastructure, using
**published** SwaData dataset releases only. Results are recorded back in the
admin portal (Admin → AI Lab) so every model is traceable to a release.

> These scripts are infrastructure scaffolding. They have not been run to train
> a model as part of the MVP (no GPU training is performed by the platform).

| Script | Purpose |
|---|---|
| `prepare_hf.py` | Load a SwaData JSONL/Parquet export into a Hugging Face `DatasetDict` using the release's contributor-aware `split` column; optionally push to a private Hub repo. |
| `tokenizer_stats.py` | Compare tokenizers on a release (fertility = tokens per word, % of words split into ≥3 pieces) — a quick signal of how badly a tokenizer fragments Bantu morphology. |
| `finetune_lora.py` | LoRA / QLoRA fine-tuning of a small causal LM on monolingual or instruction data with `transformers` + `peft`. |
| `evaluate_mt.py` | chrF / BLEU on the held-out SwaData translation benchmark (`sacrebleu`). |

```bash
pip install -r requirements.txt
python prepare_hf.py --file swadata-monolingual-text-v1.0.0.jsonl --out ./hf/monolingual
python tokenizer_stats.py --dataset ./hf/monolingual --tokenizers google/byt5-small,xlm-roberta-base
python finetune_lora.py --dataset ./hf/monolingual --base-model <small-causal-lm> --qlora --out ./runs/ss-lora-1
python evaluate_mt.py --predictions preds.txt --benchmark swadata-mt-benchmark-v1.0.0.jsonl
```

Rules: never train on `is_benchmark` datasets; respect each release's licence
(SwaData Community Research Licence = non-commercial research only); never
attempt to re-identify pseudonymised contributors or speakers.
