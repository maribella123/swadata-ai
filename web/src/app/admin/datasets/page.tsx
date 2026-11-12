import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox, Input, Select, Textarea } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/misc";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { ActionForm } from "@/components/admin/controls";
import { ACCESS_LABELS, DATASET_TYPE_LABELS } from "@/lib/datasets";
import { formatNumber } from "@/lib/utils";
import { createDataset } from "../actions";

export const metadata: Metadata = { title: "Datasets" };

export default async function AdminDatasets() {
  const supabase = await createClient();
  const [{ data }, { data: licences }] = await Promise.all([
    supabase.from("datasets").select("id, slug, name, dataset_type, access_level, is_active, is_benchmark, dataset_releases(id, version, status, record_count, build_status)").order("name"),
    supabase.from("data_licenses").select("id, name").eq("is_active", true),
  ]);
  return (
    <>
      <PageHeader eyebrow="Data" title="Datasets & releases" description="Build versioned releases from approved, permissioned data. Every release needs approval from a second administrator before publication." />
      <div className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-white">
        <Table>
          <THead><TR><TH>Dataset</TH><TH>Type</TH><TH>Access</TH><TH>Releases</TH><TH>Latest published</TH></TR></THead>
          <TBody>
            {(data ?? []).map((d) => {
              const pub = (d.dataset_releases ?? []).filter((r) => r.status === "published");
              const latest = pub.sort((a, b) => b.version.localeCompare(a.version, undefined, { numeric: true }))[0];
              const awaiting = (d.dataset_releases ?? []).filter((r) => r.status === "pending_approval").length;
              return (
                <TR key={d.id}>
                  <TD><Link href={`/admin/datasets/${d.id}`} className="font-medium text-navy-900 hover:underline">{d.name}</Link>{d.is_benchmark && <Badge tone="gold" className="ml-2">Benchmark</Badge>}{!d.is_active && <Badge className="ml-2">Inactive</Badge>}<p className="font-mono text-xs text-slate-400">{d.slug}</p></TD>
                  <TD>{DATASET_TYPE_LABELS[d.dataset_type]}</TD>
                  <TD><Badge tone={ACCESS_LABELS[d.access_level].tone}>{d.access_level}</Badge></TD>
                  <TD>{(d.dataset_releases ?? []).length}{awaiting > 0 && <Badge tone="warning" className="ml-2">{awaiting} awaiting approval</Badge>}</TD>
                  <TD>{latest ? `v${latest.version} · ${formatNumber(latest.record_count)} records` : <span className="text-slate-400">—</span>}</TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      </div>
      <Card className="mt-6">
        <CardHeader><CardTitle>Create a dataset</CardTitle></CardHeader>
        <CardContent>
          <ActionForm action={createDataset} success="Dataset created" className="grid gap-3 sm:grid-cols-2">
            <Input name="name" placeholder="Name" required aria-label="Name" />
            <Input name="slug" placeholder="slug-like-this" required aria-label="Slug" />
            <Select name="dataset_type" aria-label="Dataset type">{Object.entries(DATASET_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
            <Select name="access_level" defaultValue="restricted" aria-label="Access level"><option value="public">Public</option><option value="registered">Registered users</option><option value="restricted">Restricted (request access)</option></Select>
            <Select name="license_id" aria-label="Licence"><option value="">Licence…</option>{(licences ?? []).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</Select>
            <Input name="summary" placeholder="One-line summary" aria-label="Summary" />
            <Textarea name="intended_use" placeholder="Intended use" rows={2} aria-label="Intended use" />
            <Textarea name="limitations" placeholder="Known limitations" rows={2} aria-label="Limitations" />
            <Checkbox id="is_benchmark" label="Evaluation benchmark (never for training)" />
            <Button type="submit" className="sm:col-span-2">Create dataset</Button>
          </ActionForm>
        </CardContent>
      </Card>
    </>
  );
}
