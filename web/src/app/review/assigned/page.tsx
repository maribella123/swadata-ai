import Link from "next/link";
import type { Metadata } from "next";
import { ClipboardCheck } from "lucide-react";
import { requireReviewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui/misc";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { TYPE_LABELS, type ContributionType } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Assigned to me" };

export default async function AssignedPage() {
  const user = await requireReviewer();
  const supabase = await createClient();
  const { data } = await supabase
    .from("review_assignments")
    .select("id, created_at, contributions(id, type, status, title, languages(name), documents(title))")
    .eq("reviewer_id", user.id)
    .eq("status", "active")
    .order("created_at");
  return (
    <>
      <PageHeader eyebrow="Reviewer workspace" title="Assigned to me" description="Items you have claimed or been assigned by a linguist." />
      {!data?.length ? <EmptyState icon={ClipboardCheck} title="Nothing assigned" description="Claim items from the review queue." action={<Button asChild><Link href="/review">Go to queue</Link></Button>} /> : (
        <div className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-white">
          <Table>
            <THead><TR><TH>Submission</TH><TH>Type</TH><TH>Language</TH><TH>Status</TH><TH>Assigned</TH></TR></THead>
            <TBody>
              {data.map((a) => a.contributions && (
                <TR key={a.id}>
                  <TD><Link className="font-medium text-navy-900 hover:underline" href={`/review/${a.contributions.id}`}>{a.contributions.title || a.contributions.documents?.title || "Untitled"}</Link></TD>
                  <TD>{TYPE_LABELS[a.contributions.type as ContributionType]}</TD>
                  <TD>{a.contributions.languages?.name}</TD>
                  <TD><StatusBadge status={a.contributions.status} /></TD>
                  <TD className="text-slate-500">{formatDate(a.created_at)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </div>
      )}
    </>
  );
}
