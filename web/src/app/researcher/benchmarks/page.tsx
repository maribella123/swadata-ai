import Link from "next/link";
import type { Metadata } from "next";
import { Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Benchmarks & models" };

export default async function Benchmarks() {
  const supabase = await createClient();
  const [{ data: benches }, { data: evals }, { data: models }] = await Promise.all([
    supabase.from("datasets").select("id, slug, name, summary, dataset_releases(version, status, record_count)").eq("is_benchmark", true).eq("is_active", true),
    supabase.from("evaluations").select("id, benchmark_name, language_code, metrics, created_at, models(name, base_model)").order("created_at", { ascending: false }).limit(100),
    supabase.from("models").select("id, name, base_model, status, language_codes, hf_repo").order("created_at", { ascending: false }),
  ]);
  return (
    <>
      <PageHeader eyebrow="Researcher portal" title="Benchmarks & models" description="Held-out evaluation sets, registered models and reported results." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Evaluation benchmarks</CardTitle></CardHeader>
          <CardContent>
            {!benches?.length ? <EmptyState icon={Trophy} title="No benchmarks yet" /> : (
              <ul className="space-y-3">{benches.map((b) => { const pub = (b.dataset_releases ?? []).filter((r) => r.status === "published"); return <li key={b.id}><Link href={`/researcher/datasets/${b.slug}`} className="block rounded-xl border border-line p-4 hover:bg-ivory/60"><p className="font-semibold text-navy-900">{b.name}</p><p className="text-sm text-slate-600">{b.summary}</p><p className="mt-1 text-xs text-slate-500">{pub.length ? `Latest v${pub[pub.length - 1].version}` : "Not yet released"}</p></Link></li>; })}</ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Model registry</CardTitle></CardHeader>
          <CardContent>
            {!models?.length ? <p className="text-sm text-slate-500">No models registered yet. Models are trained outside the platform and registered with links to the dataset releases they used.</p> : (
              <ul className="divide-y divide-line">{models.map((m) => <li key={m.id} className="flex items-center justify-between py-2.5 text-sm"><span><span className="font-semibold text-navy-900">{m.name}</span><span className="block text-xs text-slate-500">{m.base_model} · {m.language_codes.join(", ")}</span></span><Badge className="capitalize">{m.status}</Badge></li>)}</ul>
            )}
          </CardContent>
        </Card>
      </div>
      <Card className="mt-6">
        <CardHeader><CardTitle>Reported evaluations</CardTitle></CardHeader>
        <CardContent>
          {!evals?.length ? <p className="text-sm text-slate-500">No evaluation results yet.</p> : (
            <Table className="min-w-0"><THead><TR><TH>Model</TH><TH>Benchmark</TH><TH>Language</TH><TH>Metrics</TH><TH>Date</TH></TR></THead>
              <TBody>{evals.map((e) => <TR key={e.id}><TD>{e.models?.name}</TD><TD>{e.benchmark_name}</TD><TD>{e.language_code}</TD><TD className="font-mono text-xs">{Object.entries(e.metrics as Record<string, number>).map(([k, v]) => `${k}: ${v}`).join(" · ")}</TD><TD className="text-slate-500">{formatDate(e.created_at)}</TD></TR>)}</TBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
