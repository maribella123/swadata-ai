import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { PageHeader, StatusBadge } from "@/components/ui/misc";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { STATUS_LABELS, TYPE_LABELS, type ContributionStatus, type ContributionType } from "@/lib/constants";
import { formatDate, truncate } from "@/lib/utils";

export const metadata: Metadata = { title: "Contributions" };
const PAGE = 50;

export default async function AdminContributions({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1));
  const supabase = await createClient();
  const { data: langs } = await supabase.from("languages").select("id, name").eq("is_active", true).order("sort_order");
  let q = supabase
    .from("contributions")
    .select("id, type, status, data_layer, sensitivity, title, created_at, languages(name), contributor:users!contributions_contributor_id_fkey(display_name), text_content(body, version), documents(title), contribution_permissions(allow_research, allow_ai_training)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE, page * PAGE - 1);
  if (sp.status) q = q.eq("status", sp.status as ContributionStatus);
  if (sp.type) q = q.eq("type", sp.type as ContributionType);
  if (sp.lang) q = q.eq("language_id", sp.lang);
  if (sp.layer) q = q.eq("data_layer", sp.layer as never);
  const { data, count } = await q;
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE));
  const qs = (p: number) => `?${new URLSearchParams(Object.fromEntries(Object.entries({ ...sp, page: String(p) }).filter(([, v]) => v)) as Record<string, string>)}`;
  return (
    <>
      <PageHeader eyebrow="Content" title="All contributions" description={`${count ?? 0} contributions across all languages and types.`} />
      <form className="mb-5 grid gap-3 sm:grid-cols-5">
        <Select name="status" defaultValue={sp.status ?? ""} aria-label="Status"><option value="">All statuses</option>{Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
        <Select name="type" defaultValue={sp.type ?? ""} aria-label="Type"><option value="">All types</option>{Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
        <Select name="lang" defaultValue={sp.lang ?? ""} aria-label="Language"><option value="">All languages</option>{(langs ?? []).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</Select>
        <Select name="layer" defaultValue={sp.layer ?? ""} aria-label="Data layer"><option value="">All layers</option><option value="raw">Raw</option><option value="validated">Validated</option><option value="curated">Curated</option><option value="model_ready">Model-ready</option></Select>
        <Button type="submit" variant="navy">Filter</Button>
      </form>
      <div className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-white">
        <Table>
          <THead><TR><TH>Contribution</TH><TH>Contributor</TH><TH>Type</TH><TH>Language</TH><TH>Status</TH><TH>Layer</TH><TH>Dataset-eligible</TH><TH>Created</TH></TR></THead>
          <TBody>
            {(data ?? []).map((c) => {
              const body = [...(c.text_content ?? [])].sort((a, b) => a.version - b.version)[0]?.body;
              const perms = c.contribution_permissions;
              return (
                <TR key={c.id}>
                  <TD className="max-w-xs"><Link href={`/review/${c.id}`} className="font-medium text-navy-900 hover:underline">{c.title || c.documents?.title || truncate(body, 60) || "Untitled"}</Link>{c.sensitivity === "restricted" && <Badge tone="danger" className="ml-1">Restricted</Badge>}</TD>
                  <TD>{c.contributor?.display_name}</TD>
                  <TD>{TYPE_LABELS[c.type as ContributionType]}</TD>
                  <TD>{c.languages?.name}</TD>
                  <TD><StatusBadge status={c.status} /></TD>
                  <TD className="capitalize">{c.data_layer.replace("_", "-")}</TD>
                  <TD>{perms?.allow_research && perms?.allow_ai_training ? <Badge tone="success">Yes</Badge> : <Badge>No</Badge>}</TD>
                  <TD className="whitespace-nowrap text-slate-500">{formatDate(c.created_at)}</TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      </div>
      {pages > 1 && <nav className="mt-4 flex justify-between text-sm"><span className="text-slate-500">Page {page}/{pages}</span><div className="flex gap-2">{page > 1 && <Button asChild size="sm" variant="outline"><Link href={qs(page - 1)}>Previous</Link></Button>}{page < pages && <Button asChild size="sm" variant="outline"><Link href={qs(page + 1)}>Next</Link></Button>}</div></nav>}
    </>
  );
}
