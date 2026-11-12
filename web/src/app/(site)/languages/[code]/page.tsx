import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getLanguageStats } from "@/lib/public-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/misc";
import { formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

async function load(code: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("languages")
    .select("*, language_varieties(id, code, name, region, description, is_active)")
    .eq("code", code)
    .maybeSingle();
  return data;
}

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;
  const lang = await load(code);
  return { title: lang ? lang.name : "Language" };
}

export default async function LanguageDetail({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const [lang, stats] = await Promise.all([load(code), getLanguageStats()]);
  if (!lang) notFound();
  const s = stats.get(lang.code);
  const varieties = (lang.language_varieties ?? []).filter((v) => v.is_active);

  return (
    <div className="container-page py-14">
      <Link href="/languages" className="inline-flex items-center gap-1 text-sm font-semibold text-forest-700">
        <ArrowLeft className="size-4" /> All languages
      </Link>
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Badge tone="navy" className="font-mono">{lang.code}</Badge>
        <Badge className="font-mono">ISO 639-3: {lang.iso639_3}</Badge>
        <Badge>Script: {lang.script}</Badge>
        {lang.is_priority && <Badge tone="gold">Priority language</Badge>}
        {lang.is_official_za && <Badge tone="success">Official South African language</Badge>}
        {!lang.is_active && <Badge tone="warning">Registered — not yet active</Badge>}
      </div>
      <h1 className="mt-4 font-display text-5xl font-semibold">{lang.name}</h1>
      {lang.native_name !== lang.name && <p className="mt-1 text-xl text-slate-500">{lang.native_name}</p>}
      <p className="mt-6 max-w-3xl text-lg leading-relaxed text-slate-600">{lang.description || "Description coming soon."}</p>
      <dl className="mt-6 grid max-w-3xl gap-4 text-sm sm:grid-cols-3">
        <div><dt className="text-slate-500">Family</dt><dd className="font-medium text-navy-900">{lang.family || "—"}</dd></div>
        <div><dt className="text-slate-500">Region</dt><dd className="font-medium text-navy-900">{lang.region || "—"}</dd></div>
        <div><dt className="text-slate-500">Countries</dt><dd className="font-medium text-navy-900">{lang.countries.join(", ") || "—"}</dd></div>
      </dl>

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        <StatCard label="Submitted contributions" value={formatNumber(s?.submissions ?? 0)} />
        <StatCard label="Approved contributions" value={formatNumber(s?.approved ?? 0)} tone="navy" />
        <StatCard label="Approved speech (minutes)" value={formatNumber(Math.round((s?.audio_seconds ?? 0) / 60))} tone="gold" />
      </div>

      {varieties.length > 0 && (
        <div className="mt-12">
          <h2 className="text-xl font-bold">Recorded varieties</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {varieties.map((v) => (
              <li key={v.id} className="rounded-xl border border-line p-4">
                <p className="font-semibold text-navy-900">{v.name} <span className="ml-1 font-mono text-xs text-slate-400">{v.code}</span></p>
                <p className="text-sm text-slate-500">{v.region}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {lang.is_active && (
        <div className="mt-12 rounded-2xl bg-ivory p-8">
          <h2 className="font-display text-2xl font-semibold">Do you speak {lang.name}?</h2>
          <p className="mt-2 text-slate-600">Contribute sentences, recordings, translations or proverbs and help build {lang.name} language technology.</p>
          <Button asChild className="mt-5"><Link href="/register">Start contributing in {lang.name}</Link></Button>
        </div>
      )}
    </div>
  );
}
