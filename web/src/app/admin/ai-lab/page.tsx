import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/misc";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { ActionForm } from "@/components/admin/controls";
import { formatDate } from "@/lib/utils";
import { createEvaluation, createModel, createRun } from "../actions";

export const metadata: Metadata = { title: "AI Lab" };

export default async function AiLab() {
  const supabase = await createClient();
  const [{ data: models }, { data: runs }, { data: evals }, { data: releases }, { data: langs }] = await Promise.all([
    supabase.from("models").select("*").order("created_at", { ascending: false }),
    supabase.from("training_runs").select("*, models(name), dataset_releases(version, datasets(name))").order("created_at", { ascending: false }).limit(50),
    supabase.from("evaluations").select("*, models(name)").order("created_at", { ascending: false }).limit(50),
    supabase.from("dataset_releases").select("id, version, datasets(name)").eq("status", "published"),
    supabase.from("languages").select("code, name").eq("is_active", true).order("sort_order"),
  ]);
  return (
    <>
      <PageHeader eyebrow="African Language AI Lab" title="Model registry & experiments" description="Tracks models, training runs and evaluations. Training itself runs outside the web platform (see services/ai-lab) — e.g. tokenizer experiments and LoRA/QLoRA fine-tuning with Hugging Face and PyTorch on GPU infrastructure." />
      <Alert tone="info" className="mb-6">No model training runs inside AfriLang Datasets. Record runs here after executing them with the scripts in <code>services/ai-lab</code>, so every model is traceable to a published dataset release.</Alert>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Models</CardTitle></CardHeader>
          <CardContent>
            {!models?.length ? <p className="text-sm text-slate-500">No models registered.</p> : (
              <Table className="min-w-0"><THead><TR><TH>Model</TH><TH>Base</TH><TH>Languages</TH><TH>Status</TH></TR></THead>
                <TBody>{models.map((m) => <TR key={m.id}><TD><p className="font-medium text-navy-900">{m.name}</p><p className="text-xs text-slate-500">{m.hf_repo || m.slug}</p></TD><TD className="text-xs">{m.base_model}</TD><TD className="text-xs">{m.language_codes.join(", ")}</TD><TD><Badge className="capitalize">{m.status}</Badge></TD></TR>)}</TBody>
              </Table>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Register model</CardTitle></CardHeader>
          <CardContent>
            <ActionForm action={createModel} success="Model registered" className="space-y-2">
              <Input name="name" placeholder="Name" required aria-label="Model name" />
              <Input name="slug" placeholder="slug" required aria-label="Slug" />
              <Input name="base_model" placeholder="Base model (HF id)" aria-label="Base model" />
              <Input name="architecture" placeholder="Architecture" aria-label="Architecture" />
              <Input name="hf_repo" placeholder="Hugging Face repo (optional)" aria-label="Hugging Face repo" />
              <div className="flex flex-wrap gap-2 text-xs">{(langs ?? []).map((l) => <label key={l.code} className="flex items-center gap-1"><input type="checkbox" name="language_codes" value={l.code} className="accent-forest-700" />{l.code}</label>)}</div>
              <Textarea name="description" rows={2} placeholder="Description" aria-label="Description" />
              <Button type="submit" size="sm" className="w-full">Register</Button>
            </ActionForm>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Training runs</CardTitle></CardHeader>
          <CardContent>
            {!runs?.length ? <p className="text-sm text-slate-500">No runs recorded.</p> : (
              <Table className="min-w-0"><THead><TR><TH>Model</TH><TH>Method</TH><TH>Dataset</TH><TH>Status</TH><TH>Created</TH></TR></THead>
                <TBody>{runs.map((r) => <TR key={r.id}><TD>{r.models?.name}</TD><TD className="uppercase">{r.method}</TD><TD className="text-xs">{r.dataset_releases ? `${r.dataset_releases.datasets?.name} v${r.dataset_releases.version}` : "—"}</TD><TD><Badge className="capitalize">{r.status}</Badge></TD><TD className="text-slate-500">{formatDate(r.created_at)}</TD></TR>)}</TBody>
              </Table>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Record a training run</CardTitle></CardHeader>
          <CardContent>
            <ActionForm action={createRun} success="Run recorded" className="space-y-2">
              <Select name="model_id" required aria-label="Model">{(models ?? []).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</Select>
              <Select name="method" aria-label="Method"><option value="lora">LoRA</option><option value="qlora">QLoRA</option><option value="full">Full fine-tune</option><option value="tokenizer">Tokenizer experiment</option><option value="other">Other</option></Select>
              <Select name="dataset_release_id" aria-label="Dataset release"><option value="">Dataset release…</option>{(releases ?? []).map((r) => <option key={r.id} value={r.id}>{r.datasets?.name} v{r.version}</option>)}</Select>
              <Textarea name="config" rows={3} placeholder='{"r": 16, "alpha": 32, "lr": 2e-4}' aria-label="Config JSON" className="font-mono text-xs" />
              <Input name="compute_notes" placeholder="Compute notes" aria-label="Compute notes" />
              <Button type="submit" size="sm" className="w-full" disabled={!models?.length}>Record run</Button>
            </ActionForm>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Evaluations</CardTitle></CardHeader>
          <CardContent>
            {!evals?.length ? <p className="text-sm text-slate-500">No evaluations recorded.</p> : (
              <Table className="min-w-0"><THead><TR><TH>Model</TH><TH>Benchmark</TH><TH>Language</TH><TH>Metrics</TH></TR></THead>
                <TBody>{evals.map((e) => <TR key={e.id}><TD>{e.models?.name}</TD><TD>{e.benchmark_name}</TD><TD>{e.language_code}</TD><TD className="font-mono text-xs">{JSON.stringify(e.metrics)}</TD></TR>)}</TBody>
              </Table>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Record an evaluation</CardTitle></CardHeader>
          <CardContent>
            <ActionForm action={createEvaluation} success="Evaluation recorded" className="space-y-2">
              <Select name="model_id" required aria-label="Model">{(models ?? []).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</Select>
              <Input name="benchmark_name" placeholder="Benchmark (e.g. AfriLang MT v1.0.0)" required aria-label="Benchmark" />
              <Input name="language_code" placeholder="Language code (e.g. ss)" required aria-label="Language code" />
              <Textarea name="metrics" rows={2} placeholder='{"chrF": 41.2, "BLEU": 12.3}' aria-label="Metrics JSON" className="font-mono text-xs" />
              <Input name="notes" placeholder="Notes" aria-label="Notes" />
              <Button type="submit" size="sm" className="w-full" disabled={!models?.length}>Record evaluation</Button>
            </ActionForm>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
