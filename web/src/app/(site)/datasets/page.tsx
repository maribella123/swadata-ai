import Link from "next/link";
import type { Metadata } from "next";
import { Database, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/misc";
import { PageHero } from "@/components/site/page-hero";
import { ACCESS_LABELS, DATASET_TYPE_LABELS, listDatasets } from "@/lib/datasets";
import { getActiveLanguages } from "@/lib/public-data";
import { formatNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Dataset repository" };
export const dynamic = "force-dynamic";

export default async function DatasetsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const [datasets, languages] = await Promise.all([
    listDatasets({ q: sp.q, type: sp.type, lang: sp.lang }),
    getActiveLanguages(),
  ]);

  return (
    <>
      <PageHero
        eyebrow="Dataset repository"
        title="Open documentation. Responsible access."
        description="Every AfriLang Research dataset has a public data card describing its contents, licence, methodology and limitations. Downloads respect each contributor's permissions and each dataset's access level."
      />
      <section className="container-page py-12">
        <form className="grid gap-3 rounded-2xl border border-line bg-white p-4 shadow-[var(--shadow-soft)] md:grid-cols-[2fr_1fr_1fr_auto]" role="search">
          <label className="sr-only" htmlFor="q">Search datasets</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input id="q" name="q" placeholder="Search datasets…" defaultValue={sp.q} className="pl-9" />
          </div>
          <label className="sr-only" htmlFor="type">Data type</label>
          <Select id="type" name="type" defaultValue={sp.type ?? ""}>
            <option value="">All data types</option>
            {Object.entries(DATASET_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
          <label className="sr-only" htmlFor="lang">Language</label>
          <Select id="lang" name="lang" defaultValue={sp.lang ?? ""}>
            <option value="">All languages</option>
            {languages.map((l) => <option key={l.id} value={l.code}>{l.name}</option>)}
          </Select>
          <Button type="submit" variant="navy">Filter</Button>
        </form>

        {datasets.length === 0 ? (
          <div className="mt-8"><EmptyState icon={Database} title="No datasets match your filters" /></div>
        ) : (
          <ul className="mt-8 grid gap-5 lg:grid-cols-2">
            {datasets.map((d) => {
              const access = ACCESS_LABELS[d.access_level];
              return (
                <li key={d.id}>
                  <Link href={`/datasets/${d.slug}`} className="flex h-full flex-col rounded-2xl border border-line bg-white p-6 shadow-[var(--shadow-soft)] transition hover:shadow-[var(--shadow-lift)]">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="navy">{DATASET_TYPE_LABELS[d.dataset_type]}</Badge>
                      <Badge tone={access.tone}>{access.label}</Badge>
                      {d.is_benchmark && <Badge tone="gold">Benchmark</Badge>}
                    </div>
                    <h2 className="mt-4 font-display text-2xl font-semibold">{d.name}</h2>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">{d.summary}</p>
                    <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-line pt-4 text-sm">
                      <div><dt className="text-xs text-slate-500">Latest version</dt><dd className="font-semibold text-navy-900">{d.latest ? `v${d.latest.version}` : "Not yet released"}</dd></div>
                      <div><dt className="text-xs text-slate-500">Records</dt><dd className="font-semibold text-navy-900 tabular-nums">{formatNumber(d.latest?.record_count ?? 0)}</dd></div>
                      <div><dt className="text-xs text-slate-500">Licence</dt><dd className="truncate font-semibold text-navy-900">{d.data_licenses?.code ?? "—"}</dd></div>
                    </dl>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
