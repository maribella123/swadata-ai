import Link from "next/link";
import type { Metadata } from "next";
import { Inbox, Search } from "lucide-react";
import { requireReviewer, hasAnyRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { EmptyState, PageHeader, StatCard, StatusBadge } from "@/components/ui/misc";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { RESTRICTED_ROLES, TYPE_LABELS, type ContributionStatus, type ContributionType } from "@/lib/constants";
import { formatDate, formatNumber, truncate } from "@/lib/utils";
import { ClaimButton } from "./review-controls";

export const metadata: Metadata = { title: "Review queue" };
const PAGE = 30;

export default async function ReviewQueue({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const user = await requireReviewer();
  const supabase = await createClient();
  const page = Math.max(1, Number(sp.page ?? 1));
  const statuses = (sp.status ? [sp.status] : ["submitted", "in_review"]) as ContributionStatus[];

  const { data: langs } = await supabase.from("languages").select("id, code, name").eq("is_active", true).order("sort_order");
  const langId = sp.lang ? langs?.find((l) => l.code === sp.lang)?.id : undefined;
  let q = supabase
    .from("contributions")
    .select("id, type, status, title, sensitivity, created_at, submitted_at, languages(name, code), text_content(body, version), documents(title), review_assignments(reviewer_id, status, reviewer:users!review_assignments_reviewer_id_fkey(display_name))", { count: "exact" })
    .in("status", statuses)
    .neq("contributor_id", user.id)
    .order("submitted_at", { ascending: sp.sort !== "newest", nullsFirst: false })
    .range((page - 1) * PAGE, page * PAGE - 1);
  if (sp.type) q = q.eq("type", sp.type as ContributionType);
  if (langId) q = q.eq("language_id", langId);
  if (sp.q) q = q.ilike("title", `%${sp.q.replace(/[%_]/g, "")}%`);
  const [{ data, count }, { count: myActive }, { count: submittedCount }] = await Promise.all([
    q,
    supabase.from("review_assignments").select("id", { count: "exact", head: true }).eq("reviewer_id", user.id).eq("status", "active"),
    supabase.from("contributions").select("id", { count: "exact", head: true }).eq("status", "submitted").neq("contributor_id", user.id),
  ]);
  const rows = data ?? [];
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE));

  return (
    <>
      <PageHeader eyebrow="Reviewer workspace" title="Review queue" description="Oldest submissions first. Claim an item to prevent duplicate work. You never see your own contributions here." />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Awaiting first review" value={formatNumber(submittedCount ?? 0)} icon={Inbox} />
        <StatCard label="Assigned to me" value={formatNumber(myActive ?? 0)} tone="gold" />
        <StatCard label="Visible in this queue" value={formatNumber(count ?? 0)} tone="navy" hint={hasAnyRole(user, RESTRICTED_ROLES) ? "Including restricted items" : "Restricted items require linguist role"} />
      </div>
      <form className="mb-5 grid gap-3 rounded-2xl border border-line bg-white p-3 md:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto]">
        <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input name="q" placeholder="Search titles" defaultValue={sp.q} className="pl-9" aria-label="Search" /></div>
        <Select name="type" defaultValue={sp.type ?? ""} aria-label="Type"><option value="">All types</option>{Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
        <Select name="lang" defaultValue={sp.lang ?? ""} aria-label="Language"><option value="">All languages</option>{(langs ?? []).map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}</Select>
        <Select name="status" defaultValue={sp.status ?? ""} aria-label="Status"><option value="">Open (submitted + in review)</option><option value="submitted">Submitted</option><option value="in_review">In review</option><option value="changes_requested">Changes requested</option><option value="approved">Approved</option><option value="rejected">Rejected</option></Select>
        <Select name="sort" defaultValue={sp.sort ?? "oldest"} aria-label="Sort"><option value="oldest">Oldest first</option><option value="newest">Newest first</option></Select>
        <Button type="submit" variant="navy">Filter</Button>
      </form>
      {!rows.length ? (
        <EmptyState icon={Inbox} title="The queue is clear" description="No submissions match these filters. Thank you for keeping up!" />
      ) : (
        <div className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-white">
          <Table>
            <THead><TR><TH>Submission</TH><TH>Type</TH><TH>Language</TH><TH>Status</TH><TH>Assigned</TH><TH>Submitted</TH><TH /></TR></THead>
            <TBody>
              {rows.map((c) => {
                const active = (c.review_assignments ?? []).find((a) => a.status === "active");
                const body = [...(c.text_content ?? [])].sort((a, b) => a.version - b.version)[0]?.body;
                return (
                  <TR key={c.id}>
                    <TD className="max-w-sm">
                      <Link href={`/review/${c.id}`} className="font-medium text-navy-900 hover:underline">{c.title || c.documents?.title || truncate(body, 70) || "Untitled"}</Link>
                      {c.sensitivity === "restricted" && <Badge tone="danger" className="ml-2">Restricted</Badge>}
                    </TD>
                    <TD>{TYPE_LABELS[c.type as ContributionType]}</TD>
                    <TD>{c.languages?.name}</TD>
                    <TD><StatusBadge status={c.status} /></TD>
                    <TD className="text-xs">{active ? (active.reviewer_id === user.id ? <Badge tone="gold">Me</Badge> : active.reviewer?.display_name) : <span className="text-slate-400">—</span>}</TD>
                    <TD className="whitespace-nowrap text-slate-500">{formatDate(c.submitted_at)}</TD>
                    <TD className="text-right">{!active && ["submitted", "in_review"].includes(c.status) ? <ClaimButton id={c.id} /> : <Button asChild size="sm" variant="outline"><Link href={`/review/${c.id}`}>Open</Link></Button>}</TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        </div>
      )}
      {pages > 1 && (
        <nav className="mt-5 flex justify-between text-sm" aria-label="Pagination">
          <span className="text-slate-500">Page {page} of {pages}</span>
          <div className="flex gap-2">
            {page > 1 && <Button asChild variant="outline" size="sm"><Link href={`?${new URLSearchParams({ ...sp, page: String(page - 1) } as Record<string, string>)}`}>Previous</Link></Button>}
            {page < pages && <Button asChild variant="outline" size="sm"><Link href={`?${new URLSearchParams({ ...sp, page: String(page + 1) } as Record<string, string>)}`}>Next</Link></Button>}
          </div>
        </nav>
      )}
    </>
  );
}
