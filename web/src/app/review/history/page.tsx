import Link from "next/link";
import type { Metadata } from "next";
import { History } from "lucide-react";
import { hasAnyRole, requireReviewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { RESTRICTED_ROLES, TYPE_LABELS, type ContributionType } from "@/lib/constants";
import { formatDate, truncate } from "@/lib/utils";

export const metadata: Metadata = { title: "Review history" };

const TONE = { approve: "success", reject: "danger", request_changes: "warning", comment: "info" } as const;

export default async function HistoryPage({ searchParams }: { searchParams: Promise<{ all?: string }> }) {
  const sp = await searchParams;
  const user = await requireReviewer();
  const senior = hasAnyRole(user, RESTRICTED_ROLES);
  const supabase = await createClient();
  let q = supabase
    .from("reviews")
    .select("id, decision, comment, scores, created_at, reviewer:users!reviews_reviewer_id_fkey(display_name), contributions(id, type, title, languages(name))")
    .order("created_at", { ascending: false })
    .limit(200);
  if (!(senior && sp.all)) q = q.eq("reviewer_id", user.id);
  const { data } = await q;
  return (
    <>
      <PageHeader eyebrow="Reviewer workspace" title="Review history" description="Every review decision is recorded permanently and cannot be edited." actions={senior ? <Link className="text-sm font-semibold text-forest-700" href={sp.all ? "?" : "?all=1"}>{sp.all ? "Show only mine" : "Show all reviewers"}</Link> : null} />
      {!data?.length ? <EmptyState icon={History} title="No reviews yet" /> : (
        <div className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-white">
          <Table>
            <THead><TR><TH>Decision</TH><TH>Submission</TH><TH>Language</TH><TH>Comment</TH>{senior && sp.all && <TH>Reviewer</TH>}<TH>Date</TH></TR></THead>
            <TBody>
              {data.map((r) => (
                <TR key={r.id}>
                  <TD><Badge tone={TONE[r.decision]} className="capitalize">{r.decision.replace("_", " ")}</Badge></TD>
                  <TD><Link href={`/review/${r.contributions?.id}`} className="font-medium text-navy-900 hover:underline">{r.contributions?.title || TYPE_LABELS[r.contributions?.type as ContributionType]}</Link></TD>
                  <TD>{r.contributions?.languages?.name}</TD>
                  <TD className="max-w-xs text-slate-600">{truncate(r.comment, 80) || "—"}</TD>
                  {senior && sp.all && <TD>{r.reviewer?.display_name}</TD>}
                  <TD className="whitespace-nowrap text-slate-500">{formatDate(r.created_at, true)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </div>
      )}
    </>
  );
}
