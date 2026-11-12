import Link from "next/link";
import type { Metadata } from "next";
import { FileText } from "lucide-react";
import { requireReviewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui/misc";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Document extracts" };

export default async function DocumentQueue({ searchParams }: { searchParams: Promise<{ rights?: string }> }) {
  const sp = await searchParams;
  const user = await requireReviewer();
  const supabase = await createClient();
  let q = supabase
    .from("documents")
    .select("id, title, author, file_type, extraction_status, rights_status, copyright_status, extraction_stats, created_at, contribution_id, contributions!inner(status, contributor_id, languages(name))")
    .neq("contributions.contributor_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);
  if (sp.rights) q = q.eq("rights_status", sp.rights as never);
  const { data } = await q;
  return (
    <>
      <PageHeader eyebrow="Reviewer workspace" title="Document extracts" description="Approve or reject extracted segments, and verify rights before anything can enter a dataset." />
      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        {[["", "All"], ["pending_verification", "Rights pending"], ["verified", "Rights verified"], ["rejected", "Rights rejected"]].map(([v, l]) => (
          <Link key={v} href={v ? `?rights=${v}` : "?"} className={`rounded-full px-3 py-1 font-semibold ${sp.rights === v || (!sp.rights && !v) ? "bg-navy-900 text-white" : "bg-white text-navy-900 ring-1 ring-line"}`}>{l}</Link>
        ))}
      </div>
      {!data?.length ? <EmptyState icon={FileText} title="No documents to review" /> : (
        <div className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-white">
          <Table>
            <THead><TR><TH>Document</TH><TH>Language</TH><TH>Extraction</TH><TH>Segments</TH><TH>Rights</TH><TH>Status</TH><TH>Uploaded</TH></TR></THead>
            <TBody>
              {data.map((d) => {
                const st = d.extraction_stats as { segments?: number; duplicates?: number };
                return (
                  <TR key={d.id}>
                    <TD><Link href={`/review/documents/${d.id}`} className="font-medium text-navy-900 hover:underline">{d.title}</Link><p className="text-xs text-slate-500">{d.author} · {d.file_type.toUpperCase()}</p></TD>
                    <TD>{d.contributions.languages?.name}</TD>
                    <TD><Badge tone={d.extraction_status === "completed" ? "success" : d.extraction_status === "failed" ? "danger" : "info"}>{d.extraction_status}</Badge></TD>
                    <TD className="tabular-nums">{st?.segments ?? "—"}{st?.duplicates ? <span className="text-xs text-gold-700"> ({st.duplicates} dup)</span> : null}</TD>
                    <TD><Badge tone={d.rights_status === "verified" ? "success" : d.rights_status === "rejected" ? "danger" : "warning"}>{d.rights_status.replaceAll("_", " ")}</Badge></TD>
                    <TD><StatusBadge status={d.contributions.status} /></TD>
                    <TD className="text-slate-500">{formatDate(d.created_at)}</TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        </div>
      )}
    </>
  );
}
