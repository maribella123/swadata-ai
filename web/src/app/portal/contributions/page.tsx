import Link from "next/link";
import type { Metadata } from "next";
import { FolderOpen } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui/misc";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { STATUS_LABELS, TYPE_LABELS, type ContributionStatus, type ContributionType } from "@/lib/constants";
import { formatDate, truncate } from "@/lib/utils";

export const metadata: Metadata = { title: "My contributions" };
const PAGE = 25;

export default async function MyContributions({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const user = await requireUser();
  const page = Math.max(1, Number(sp.page ?? 1));
  const supabase = await createClient();
  let q = supabase
    .from("contributions")
    .select("id, type, status, title, created_at, updated_at, languages(name), text_content(body, version), documents(title)", { count: "exact" })
    .eq("contributor_id", user.id)
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE, page * PAGE - 1);
  if (sp.status) q = q.eq("status", sp.status as ContributionStatus);
  if (sp.type) q = q.eq("type", sp.type as ContributionType);
  const { data, count } = await q;
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE));
  const qs = (p: number) => `?${new URLSearchParams({ ...(sp.status ? { status: sp.status } : {}), ...(sp.type ? { type: sp.type } : {}), page: String(p) })}`;

  return (
    <>
      <PageHeader eyebrow="Account" title="My contributions" description="Track the status of everything you've submitted, respond to reviewer feedback and manage permissions." />
      <form className="mb-5 flex flex-wrap gap-3">
        <Select name="status" defaultValue={sp.status ?? ""} className="w-48" aria-label="Filter by status">
          <option value="">All statuses</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
        <Select name="type" defaultValue={sp.type ?? ""} className="w-48" aria-label="Filter by type">
          <option value="">All types</option>
          {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
        <Button type="submit" variant="outline">Apply</Button>
      </form>
      {!data?.length ? (
        <EmptyState icon={FolderOpen} title="Nothing here yet" description="Contributions you submit will appear here." action={<Button asChild><Link href="/portal/text">Submit text</Link></Button>} />
      ) : (
        <div className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-white">
          <Table>
            <THead><TR><TH>Contribution</TH><TH>Type</TH><TH>Language</TH><TH>Status</TH><TH>Submitted</TH></TR></THead>
            <TBody>
              {data.map((c) => {
                const body = [...(c.text_content ?? [])].sort((a, b) => a.version - b.version)[0]?.body;
                return (
                  <TR key={c.id}>
                    <TD className="max-w-md"><Link href={`/portal/contributions/${c.id}`} className="font-medium text-navy-900 hover:underline">{c.title || c.documents?.title || truncate(body, 70) || "Untitled"}</Link></TD>
                    <TD>{TYPE_LABELS[c.type as ContributionType]}</TD>
                    <TD>{c.languages?.name}</TD>
                    <TD><StatusBadge status={c.status} /></TD>
                    <TD className="whitespace-nowrap text-slate-500">{formatDate(c.created_at)}</TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        </div>
      )}
      {pages > 1 && (
        <nav className="mt-5 flex items-center justify-between text-sm" aria-label="Pagination">
          <span className="text-slate-500">Page {page} of {pages} · {count} contributions</span>
          <div className="flex gap-2">
            {page > 1 && <Button asChild variant="outline" size="sm"><Link href={qs(page - 1)}>Previous</Link></Button>}
            {page < pages && <Button asChild variant="outline" size="sm"><Link href={qs(page + 1)}>Next</Link></Button>}
          </div>
        </nav>
      )}
    </>
  );
}
