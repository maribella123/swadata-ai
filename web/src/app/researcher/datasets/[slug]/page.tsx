import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, Download } from "lucide-react";
import { requireResearcher } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ACCESS_LABELS, DATASET_TYPE_LABELS, getDataset } from "@/lib/datasets";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/misc";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { ActionForm } from "@/components/admin/controls";
import { formatBytes, formatDate, formatNumber, truncate } from "@/lib/utils";
import { requestAccess } from "../../actions";

export const metadata: Metadata = { title: "Dataset" };

export default async function ResearcherDataset({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ v?: string }> }) {
  const { slug } = await params;
  const sp = await searchParams;
  const user = await requireResearcher();
  const d = await getDataset(slug);
  if (!d) notFound();
  const supabase = await createClient();
  const release = d.releases.find((r) => r.version === sp.v) ?? d.releases[0];
  const [{ data: myReq }, items] = await Promise.all([
    supabase.from("dataset_access_requests").select("status, expires_at, decision_note, created_at").eq("dataset_id", d.id).eq("requester_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    release && d.canAccess
      ? supabase.from("dataset_items").select("id, contribution_id, item_ref, split, language_code, record").eq("release_id", release.id).order("created_at").limit(25)
      : Promise.resolve({ data: null }),
  ]);
  const stats = (release?.stats ?? {}) as { splits?: Record<string, number>; languages?: Record<string, number>; contributors?: number; excluded?: Record<string, number>; words?: number; audio_hours?: number };
  const quality = (release?.quality_summary ?? {}) as Record<string, number | string>;

  return (
    <>
      <Link href="/researcher" className="inline-flex items-center gap-1 text-sm font-semibold text-forest-700"><ArrowLeft className="size-4" /> Datasets</Link>
      <div className="mt-4"><PageHeader eyebrow={DATASET_TYPE_LABELS[d.dataset_type]} title={d.name} description={d.summary} /></div>
      <div className="mb-6 flex flex-wrap gap-2"><Badge tone={ACCESS_LABELS[d.access_level].tone}>{ACCESS_LABELS[d.access_level].label}</Badge>{d.data_licenses && <Badge>{d.data_licenses.name}</Badge>}{d.is_benchmark && <Badge tone="gold">Evaluation only — do not train on this</Badge>}</div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Documentation</CardTitle></CardHeader>
            <CardContent className="prose-swa text-sm">
              <h3>Intended use</h3><p>{d.intended_use}</p>
              <h3>Limitations</h3><p>{d.limitations}</p>
              <h3>Processing methodology</h3><p>{d.processing_methodology}</p>
              {release && (
                <>
                  <h3>Quality information</h3>
                  <ul>{Object.entries(quality).map(([k, v]) => <li key={k}><strong className="capitalize">{k.replaceAll("_", " ")}:</strong> {String(v)}</li>)}{!Object.keys(quality).length && <li>All items were approved by at least one native-speaker reviewer who is not the contributor.</li>}</ul>
                </>
              )}
            </CardContent>
          </Card>

          {release && d.canAccess && (
            <Card>
              <CardHeader><CardTitle>Provenance sample — v{release.version}</CardTitle></CardHeader>
              <CardContent>
                <p className="mb-3 text-sm text-slate-600">Every record links back to a contribution ID, its review history and its consent record. Contributor identities are pseudonymised in exports.</p>
                <Table className="min-w-0">
                  <THead><TR><TH>Record</TH><TH>Split</TH><TH>Lang</TH><TH>Source contribution</TH></TR></THead>
                  <TBody>
                    {(items.data ?? []).map((i) => {
                      const rec = i.record as Record<string, unknown>;
                      const text = String(rec.text ?? rec.target_text ?? rec.transcript ?? rec.expression ?? JSON.stringify(rec.messages ?? rec).slice(0, 120));
                      return <TR key={i.id}><TD className="max-w-xs text-xs">{truncate(text, 120)}</TD><TD><Badge className="capitalize">{i.split}</Badge></TD><TD>{i.language_code}</TD><TD className="font-mono text-xs">{i.contribution_id.slice(0, 8)}{i.item_ref ? `/${i.item_ref.slice(0, 6)}` : ""}</TD></TR>;
                    })}
                  </TBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Versions</CardTitle></CardHeader>
            <CardContent>
              {!d.releases.length ? <p className="text-sm text-slate-500">No published releases yet.</p> : (
                <ul className="space-y-2 text-sm">{d.releases.map((r) => <li key={r.id}><Link href={`?v=${r.version}`} className={`flex justify-between rounded-lg px-3 py-2 ${r.id === release?.id ? "bg-navy-900 text-white" : "bg-mist hover:bg-navy-50"}`}><span>v{r.version}</span><span>{formatNumber(r.record_count)} records · {formatDate(r.published_at)}</span></Link></li>)}</ul>
              )}
            </CardContent>
          </Card>
          {release && (
            <Card>
              <CardHeader><CardTitle>Statistics — v{release.version}</CardTitle></CardHeader>
              <CardContent>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between"><dt className="text-slate-500">Records</dt><dd className="font-semibold tabular-nums">{formatNumber(release.record_count)}</dd></div>
                  {stats.contributors !== undefined && <div className="flex justify-between"><dt className="text-slate-500">Contributors</dt><dd className="font-semibold tabular-nums">{stats.contributors}</dd></div>}
                  {stats.words !== undefined && <div className="flex justify-between"><dt className="text-slate-500">Words</dt><dd className="font-semibold tabular-nums">{formatNumber(stats.words)}</dd></div>}
                  {stats.audio_hours !== undefined && <div className="flex justify-between"><dt className="text-slate-500">Audio hours</dt><dd className="font-semibold tabular-nums">{stats.audio_hours}</dd></div>}
                  {Object.entries(stats.splits ?? {}).map(([k, v]) => <div key={k} className="flex justify-between"><dt className="capitalize text-slate-500">{k}</dt><dd className="font-semibold tabular-nums">{formatNumber(v)}</dd></div>)}
                  {Object.entries(stats.languages ?? {}).map(([k, v]) => <div key={k} className="flex justify-between"><dt className="text-slate-500">Language {k}</dt><dd className="font-semibold tabular-nums">{formatNumber(v)}</dd></div>)}
                  <div className="flex justify-between"><dt className="text-slate-500">Collection period</dt><dd className="font-semibold">{formatDate(release.collection_start)} – {formatDate(release.collection_end)}</dd></div>
                </dl>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader><CardTitle>Access & downloads</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {d.canAccess ? (
                release ? (
                  <div className="flex flex-wrap gap-2">
                    {(release.dataset_exports ?? []).filter((e) => e.status === "completed").map((e) => <Button key={e.id} asChild size="sm" variant="outline"><a href={`/api/datasets/download?export=${e.id}`}><Download /> {e.format.toUpperCase()} · {formatBytes(e.file_size_bytes)}</a></Button>)}
                    {!(release.dataset_exports ?? []).some((e) => e.status === "completed") && <p className="text-sm text-slate-500">Exports for this version are being prepared.</p>}
                  </div>
                ) : <p className="text-sm text-slate-500">You have access; downloads appear once a release is published.</p>
              ) : myReq?.status === "pending" ? (
                <Alert tone="info">Your access request is pending review (submitted {formatDate(myReq.created_at)}).</Alert>
              ) : (
                <>
                  {myReq?.status === "rejected" && <Alert tone="warning" title="Previous request declined">{myReq.decision_note}</Alert>}
                  <ActionForm action={requestAccess} success="Access request submitted" className="space-y-2">
                    <input type="hidden" name="dataset_id" value={d.id} />
                    <Input name="institution" placeholder="Institution" required aria-label="Institution" />
                    <Textarea name="purpose" rows={4} placeholder="Research purpose, intended use and how you'll protect the data" required aria-label="Purpose" />
                    <Input name="ethics_reference" placeholder="Ethics clearance reference (if any)" aria-label="Ethics reference" />
                    <Button type="submit" className="w-full">Request access</Button>
                  </ActionForm>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
