import Link from "next/link";
import type { Metadata } from "next";
import { Database, Search } from "lucide-react";
import { requireResearcher } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ACCESS_LABELS, DATASET_TYPE_LABELS, listDatasets } from "@/lib/datasets";
import { getActiveLanguages } from "@/lib/public-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { EmptyState, PageHeader, StatCard } from "@/components/ui/misc";
import { formatNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Researcher portal" };

export default async function ResearcherHome({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const user = await requireResearcher();
  const supabase = await createClient();
  const [datasets, languages, { data: requests }] = await Promise.all([
    listDatasets({ q: sp.q, type: sp.type, lang: sp.lang }),
    getActiveLanguages(),
    supabase.from("dataset_access_requests").select("dataset_id, status, expires_at").eq("requester_id", user.id),
  ]);
  const reqBy = new Map((requests ?? []).map((r) => [r.dataset_id, r]));
  const published = datasets.filter((d) => d.latest);
  return (
    <>
      <PageHeader eyebrow="Researcher portal" title="Datasets" description="Search curated AfriLang datasets, read their documentation, inspect provenance, request restricted access and download permitted exports." />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Datasets with releases" value={formatNumber(published.length)} icon={Database} />
        <StatCard label="Records available" value={formatNumber(published.reduce((a, d) => a + (d.latest?.record_count ?? 0), 0))} tone="navy" />
        <StatCard label="My approved access" value={formatNumber((requests ?? []).filter((r) => r.status === "approved").length)} tone="gold" />
      </div>
      <form className="mb-6 grid gap-3 rounded-2xl border border-line bg-white p-3 md:grid-cols-[2fr_1fr_1fr_auto]" role="search">
        <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input name="q" placeholder="Search" defaultValue={sp.q} className="pl-9" aria-label="Search datasets" /></div>
        <Select name="type" defaultValue={sp.type ?? ""} aria-label="Data type"><option value="">All data types</option>{Object.entries(DATASET_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
        <Select name="lang" defaultValue={sp.lang ?? ""} aria-label="Language"><option value="">All languages</option>{languages.map((l) => <option key={l.id} value={l.code}>{l.name}</option>)}</Select>
        <Button type="submit" variant="navy">Filter</Button>
      </form>
      {!datasets.length ? <EmptyState icon={Database} title="No datasets match" /> : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {datasets.map((d) => {
            const req = reqBy.get(d.id);
            return (
              <li key={d.id}>
                <Link href={`/researcher/datasets/${d.slug}`} className="flex h-full flex-col rounded-2xl border border-line bg-white p-5 shadow-[var(--shadow-soft)] transition hover:shadow-[var(--shadow-lift)]">
                  <div className="flex flex-wrap gap-2">
                    <Badge tone="navy">{DATASET_TYPE_LABELS[d.dataset_type]}</Badge>
                    <Badge tone={ACCESS_LABELS[d.access_level].tone}>{d.access_level}</Badge>
                    {d.is_benchmark && <Badge tone="gold">Benchmark</Badge>}
                    {req && <Badge tone={req.status === "approved" ? "success" : req.status === "pending" ? "warning" : "neutral"} className="capitalize">Access {req.status}</Badge>}
                  </div>
                  <h2 className="mt-3 text-lg font-bold">{d.name}</h2>
                  <p className="mt-1 flex-1 text-sm text-slate-600">{d.summary}</p>
                  <p className="mt-4 text-sm text-slate-500">{d.latest ? `v${d.latest.version} · ${formatNumber(d.latest.record_count)} records · ${d.latest.language_codes.join(", ")}` : "No published release yet"}</p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
