import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, Download, Lock } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ACCESS_LABELS, DATASET_TYPE_LABELS, getDataset } from "@/lib/datasets";
import { getSessionUser } from "@/lib/auth";
import { formatBytes, formatDate, formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const d = await getDataset(slug);
  return { title: d?.name ?? "Dataset" };
}

export default async function DatasetDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [d, user] = await Promise.all([getDataset(slug), getSessionUser()]);
  if (!d) notFound();
  const access = ACCESS_LABELS[d.access_level];
  const latest = d.releases[0];

  return (
    <div className="container-page py-14">
      <Link href="/datasets" className="inline-flex items-center gap-1 text-sm font-semibold text-forest-700"><ArrowLeft className="size-4" /> Dataset repository</Link>
      <div className="mt-6 flex flex-wrap gap-2">
        <Badge tone="navy">{DATASET_TYPE_LABELS[d.dataset_type]}</Badge>
        <Badge tone={access.tone}>{access.label}</Badge>
        {d.is_benchmark && <Badge tone="gold">Evaluation benchmark — not for training</Badge>}
      </div>
      <h1 className="mt-4 font-display text-4xl font-semibold sm:text-5xl">{d.name}</h1>
      <p className="mt-4 max-w-3xl text-lg text-slate-600">{d.summary}</p>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Data card</CardTitle></CardHeader>
            <CardContent className="prose-swa text-sm">
              {d.description && <p>{d.description}</p>}
              <h3>Intended use</h3><p>{d.intended_use || "—"}</p>
              <h3>Limitations</h3><p>{d.limitations || "—"}</p>
              <h3>Processing methodology</h3><p>{d.processing_methodology || "—"}</p>
              <h3>Licence</h3>
              <p>
                {d.data_licenses ? (d.data_licenses.url ? <a href={d.data_licenses.url} target="_blank" rel="noreferrer">{d.data_licenses.name}</a> : d.data_licenses.name) : "—"}
                {d.data_licenses && !d.data_licenses.allows_commercial && " · Non-commercial use only."}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Versions</CardTitle></CardHeader>
            <CardContent>
              {d.releases.length === 0 ? (
                <p className="text-sm text-slate-500">No published release yet. Releases are published only after review and a second administrator&apos;s approval.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {d.releases.map((r) => (
                    <li key={r.id} className="py-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-navy-900">v{r.version} <span className="ml-2 text-sm font-normal text-slate-500">published {formatDate(r.published_at)}</span></p>
                        <p className="text-sm text-slate-600">{formatNumber(r.record_count)} records · {r.language_codes.join(", ")}</p>
                      </div>
                      {r.notes && <p className="mt-1 text-sm text-slate-600">{r.notes}</p>}
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(r.dataset_exports ?? []).filter((e) => e.status === "completed").map((e) =>
                          d.canAccess ? (
                            <Button key={e.id} asChild size="sm" variant="outline">
                              <a href={`/api/datasets/download?export=${e.id}`}><Download /> {e.format.toUpperCase()} · {formatBytes(e.file_size_bytes)}</a>
                            </Button>
                          ) : (
                            <Badge key={e.id}><Lock className="size-3" /> {e.format.toUpperCase()}</Badge>
                          ),
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Latest release</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {latest ? (
                <dl className="space-y-3">
                  <div className="flex justify-between"><dt className="text-slate-500">Version</dt><dd className="font-semibold">v{latest.version}</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-500">Records</dt><dd className="font-semibold tabular-nums">{formatNumber(latest.record_count)}</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-500">Languages</dt><dd className="font-semibold">{latest.language_codes.join(", ")}</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-500">Collection period</dt><dd className="font-semibold">{formatDate(latest.collection_start)} – {formatDate(latest.collection_end)}</dd></div>
                  {Object.entries((latest.stats as Record<string, number>)?.splits ?? {}).map(([k, v]) => (
                    <div key={k} className="flex justify-between"><dt className="capitalize text-slate-500">{k} split</dt><dd className="font-semibold tabular-nums">{formatNumber(Number(v))}</dd></div>
                  ))}
                </dl>
              ) : (
                <p className="text-slate-500">Not yet released.</p>
              )}
            </CardContent>
          </Card>
          {!d.canAccess && (
            <Alert tone="info" title="Access">
              {d.access_level === "registered" ? (
                <><Link className="font-semibold underline" href={`/login?next=/datasets/${d.slug}`}>Sign in</Link> to download this dataset.</>
              ) : user ? (
                <>This dataset is restricted. Researchers can <Link className="font-semibold underline" href={`/researcher/datasets/${d.slug}`}>request access</Link> from the researcher portal.</>
              ) : (
                <>This dataset is restricted. <Link className="font-semibold underline" href="/login">Sign in</Link> as a researcher to request access.</>
              )}
            </Alert>
          )}
        </aside>
      </div>
    </div>
  );
}
