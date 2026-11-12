"""LoRA / QLoRA fine-tuning of a small causal LM on an AfriLang release (run on a GPU machine)."""
import argparse

import torch
from datasets import load_from_disk
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig, DataCollatorForLanguageModeling, Trainer, TrainingArguments


def to_text(r: dict) -> str:
    if r.get("instruction"):
        return f"### Instruction:\n{r['instruction']}\n### Response:\n{r['response']}"
    return r.get("text") or r.get("target_text") or ""


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dataset", required=True)
    ap.add_argument("--base-model", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--qlora", action="store_true")
    ap.add_argument("--epochs", type=float, default=3)
    ap.add_argument("--lr", type=float, default=2e-4)
    ap.add_argument("--r", type=int, default=16)
    a = ap.parse_args()

    tok = AutoTokenizer.from_pretrained(a.base_model)
    tok.pad_token = tok.pad_token or tok.eos_token
    quant = BitsAndBytesConfig(load_in_4bit=True, bnb_4bit_compute_dtype=torch.bfloat16, bnb_4bit_quant_type="nf4") if a.qlora else None
    model = AutoModelForCausalLM.from_pretrained(a.base_model, quantization_config=quant, device_map="auto")
    if a.qlora:
        model = prepare_model_for_kbit_training(model)
    model = get_peft_model(model, LoraConfig(r=a.r, lora_alpha=2 * a.r, lora_dropout=0.05, task_type="CAUSAL_LM", target_modules="all-linear"))
    model.print_trainable_parameters()

    ds = load_from_disk(a.dataset)
    ds = ds.map(lambda r: tok(to_text(r), truncation=True, max_length=512), remove_columns=ds["train"].column_names)
    args = TrainingArguments(output_dir=a.out, num_train_epochs=a.epochs, learning_rate=a.lr, per_device_train_batch_size=8, gradient_accumulation_steps=4,
                             eval_strategy="epoch" if "validation" in ds else "no", save_strategy="epoch", logging_steps=20, bf16=torch.cuda.is_available(), report_to="none")
    Trainer(model=model, args=args, train_dataset=ds["train"], eval_dataset=ds.get("validation"), data_collator=DataCollatorForLanguageModeling(tok, mlm=False)).train()
    model.save_pretrained(a.out)
    print("Done. Record this run in Admin → AI Lab with the dataset release it used.")


if __name__ == "__main__":
    main()
