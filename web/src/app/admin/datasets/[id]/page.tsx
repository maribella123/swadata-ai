import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { getSessionUser, hasAnyRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/misc";
import { ActionButton, ActionForm } from "@/components/admin/controls";
import { DATASET_TYPE_LABELS } from "@/lib/datasets";
import { formatBytes, formatDate, formatNumber } from "@/lib/utils";
import { approveRelease, createRelease, rebuildRelease, retireRelease, submitReleaseForApproval, updateDataset } from "../../actions";
import { ExportRequester } from "./export-requester";

export const metadata: Metadata = { title: "Dataset" };
const STATUS_TONE = { draft: "neutral", pending_approval: "warning", approved: "info", published: "success", retired: "neutral" } as const;

export default async function AdminDatasetDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await getSessionUser();
  const supabase = await createClient();
  const [{ data: d }, { data: langs }] = await Promise.all([
    supabase.from("datasets").select("*, data_licenses(name), dataset_releases(*, dataset_exports(id, format, status, file_size_bytes, record_count, error, completed_at), creator:users!dataset_releases_created_by_fkey(display_name), approver:users!dataset_releases_approved_by_fkey(display_name))").eq("id", id).maybeSingle(),
    supabase.from("languages").select("code, name").eq("is_active", true).order("sort_order"),
  ]);
  if (!d) notFound();
  const releases = [...(d.dataset_releases ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const nextVersion = (() => {
    const v = releases[0]?.version.split(".").map(Number);
    return v ? `${v[0]}.${v[1] + 1}.0` : "1.0.0";
  })();
  const isSuper = hasAnyRole(me, ["super_admin"]);
  const exportFormats = d.dataset_type === "speech" ? ["csv", "jsonl", "parquet", "wav"] : ["csv", "json", "jsonl", "txt", "parquet"];

  return (
    <>
      <Link href="/admin/datasets" className="inline-flex items-center gap-1 text-sm font-semibold text-forest-700"><ArrowLeft className="size-4" /> Datasets</Link>
      <div className="mt-4"><PageHeader eyebrow={DATASET_TYPE_LABELS[d.dataset_type]} title={d.name} description={d.summary} actions={<Button asChild variant="outline"><Link href={`/datasets/${d.slug}`}>Public data card</Link></Button>} /></div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-5">
          {releases.length === 0 && <Alert tone="info">No releases yet. Create the first one — the processing service will select eligible items, deduplicate them and compute contributor-aware splits.</Alert>}
          {releases.map((r) => {
            const stats = r.stats as { splits?: Record<string, number>; excluded?: Record<string, number>; contributors?: number; languages?: Record<string, number> };
            const mine = r.created_by === me?.id;
            return (
              <Card key={r.id}>
                <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
                  <CardTitle>v{r.version}</CardTitle>
                  <div className="flex gap-2"><Badge tone={STATUS_TONE[r.status]} className="capitalize">{r.status.replace("_", " ")}</Badge><Badge tone={r.build_status === "completed" ? "success" : r.build_status === "failed" ? "danger" : "info"}>build: {r.build_status}</Badge></div>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <p className="text-slate-600">Languages: {r.language_codes.join(", ")} · collection {formatDate(r.collection_start)} – {formatDate(r.collection_end)} · created by {r.creator?.display_name}{r.approver ? ` · approved by ${r.approver.display_name} ${formatDate(r.approved_at)}` : ""}</p>
                  {r.build_error && <Alert tone="danger">{r.build_error}</Alert>}
                  {r.build_status === "completed" && (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <div className="rounded-lg bg-mist p-2.5"><p className="text-xs text-slate-500">Records</p><p className="font-semibold tabular-nums">{formatNumber(r.record_count)}</p></div>
                      {Object.entries(stats?.splits ?? {}).map(([k, v]) => <div key={k} className="rounded-lg bg-mist p-2.5"><p className="text-xs capitalize text-slate-500">{k}</p><p className="font-semibold tabular-nums">{formatNumber(v)}</p></div>)}
                      {stats?.contributors !== undefined && <div className="rounded-lg bg-mist p-2.5"><p className="text-xs text-slate-500">Contributors</p><p className="font-semibold tabular-nums">{stats.contributors}</p></div>}
                      {Object.entries(stats?.excluded ?? {}).filter(([, v]) => v).map(([k, v]) => <div key={k} className="rounded-lg bg-gold-100 p-2.5"><p className="text-xs text-gold-700">Excluded: {k.replaceAll("_", " ")}</p><p className="font-semibold tabular-nums">{formatNumber(v)}</p></div>)}
                    </div>
                  )}
                  <div>
                    <p className="mb-2 font-semibold text-navy-900">Exports</p>
                    <div className="flex flex-wrap gap-2">
                      {(r.dataset_exports ?? []).map((e) => (
                        <span key={e.id} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1 text-xs">
                          <strong className="uppercase">{e.format}</strong>
                          <Badge tone={e.status === "completed" ? "success" : e.status === "failed" ? "danger" : "info"}>{e.status}</Badge>
                          {e.status === "completed" && <><span className="text-slate-500">{formatBytes(e.file_size_bytes)}</span><a className="font-semibold text-forest-700" href={`/api/datasets/download?export=${e.id}`}>Download</a></>}
                          {e.error && <span className="text-danger">{e.error}</span>}
                        </span>
                      ))}
                    </div>
                    {r.build_status === "completed" && r.status !== "retired" && <ExportRequester releaseId={r.id} formats={exportFormats} />}
                  </div>
                  <div className="flex flex-wrap gap-2 border-t border-line pt-4">
                    {["draft", "pending_approval"].includes(r.status) && <ActionButton size="sm" variant="outline" action={rebuildRelease.bind(null, r.id)} success="Rebuild queued">Rebuild</ActionButton>}
                    {r.status === "draft" && r.build_status === "completed" && <ActionButton size="sm" action={submitReleaseForApproval.bind(null, r.id)} success="Submitted for approval">Submit for approval</ActionButton>}
                    {r.status === "pending_approval" && (mine && !isSuper ? <Badge tone="warning">Awaiting approval by another administrator</Badge> : <ActionButton size="sm" action={approveRelease.bind(null, r.id)} success="Release approved and published" confirmText={`Publish v${r.version}? Published releases are immutable.`}>Approve & publish</ActionButton>)}
                    {r.status !== "retired" && r.status !== "draft" && <ActionButton size="sm" variant="ghost" className="text-danger" action={retireRelease.bind(null, r.id)} success="Release retired" confirmText="Retire this release? It will no longer be downloadable.">Retire</ActionButton>}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>New release</CardTitle></CardHeader>
            <CardContent>
              <ActionForm action={createRelease} success="Release created — build queued" className="space-y-3 text-sm">
                <input type="hidden" name="dataset_id" value={d.id} />
                <label className="block"><span className="font-semibold text-navy-900">Version</span><Input name="version" defaultValue={nextVersion} className="mt-1" /></label>
                <fieldset><legend className="font-semibold text-navy-900">Languages</legend><div className="mt-1 grid grid-cols-2 gap-1">{(langs ?? []).map((l) => <label key={l.code} className="flex items-center gap-1.5"><input type="checkbox" name="language_codes" value={l.code} defaultChecked={l.code === "ss"} className="accent-forest-700" /> {l.name}</label>)}</div></fieldset>
                <div className="grid grid-cols-2 gap-2"><label><span className="text-xs text-slate-500">Collected from</span><Input type="date" name="collection_start" /></label><label><span className="text-xs text-slate-500">Collected to</span><Input type="date" name="collection_end" /></label></div>
                <div className="grid grid-cols-3 gap-2"><label><span className="text-xs text-slate-500">Train</span><Input name="train" type="number" step="0.01" defaultValue="0.8" /></label><label><span className="text-xs text-slate-500">Validation</span><Input name="validation" type="number" step="0.01" defaultValue="0.1" /></label><label><span className="text-xs text-slate-500">Seed</span><Input name="seed" type="number" defaultValue="42" /></label></div>
                <Textarea name="notes" placeholder="Release notes" rows={2} aria-label="Release notes" />
                <Button type="submit" className="w-full">Create & build</Button>
              </ActionForm>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Settings</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>Access: <strong className="capitalize">{d.access_level}</strong></p>
              <div className="flex flex-wrap gap-2">
                {(["public", "registered", "restricted"] as const).filter((a) => a !== d.access_level).map((a) => <ActionButton key={a} size="sm" variant="outline" action={updateDataset.bind(null, d.id, { access_level: a })} success="Access level updated" confirmText={a === "public" ? "Make this dataset public? Only items with public-publication permission are included in public releases built after this change." : undefined}>Make {a}</ActionButton>)}
              </div>
              <ActionButton size="sm" variant="ghost" action={updateDataset.bind(null, d.id, { is_active: !d.is_active })} success="Updated">{d.is_active ? "Deactivate dataset" : "Activate dataset"}</ActionButton>
              <p className="text-xs text-slate-500">Licence: {d.data_licenses?.name ?? "—"}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
