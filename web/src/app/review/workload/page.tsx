import type { Metadata } from "next";
import { Gauge } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { EmptyState, PageHeader, Progress } from "@/components/ui/misc";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { RESTRICTED_ROLES } from "@/lib/constants";

export const metadata: Metadata = { title: "Reviewer workload" };

export default async function WorkloadPage() {
  await requireRole(RESTRICTED_ROLES, "/review/workload");
  const supabase = await createClient();
  const { data } = await supabase.rpc("reviewer_workload");
  const max = Math.max(1, ...(data ?? []).map((r) => Number(r.active_assignments)));
  return (
    <>
      <PageHeader eyebrow="Linguist tools" title="Reviewer workload" description="Balance assignments across reviewers. Counts cover active assignments and the last 30 days." />
      {!data?.length ? <EmptyState icon={Gauge} title="No reviewers yet" description="Grant the reviewer role from Admin → Contributors & roles." /> : (
        <div className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-white">
          <Table>
            <THead><TR><TH>Reviewer</TH><TH>Active assignments</TH><TH>Reviews (30d)</TH><TH>Approval rate (30d)</TH></TR></THead>
            <TBody>
              {data.map((r) => (
                <TR key={r.reviewer_id}>
                  <TD className="font-medium text-navy-900">{r.display_name}</TD>
                  <TD><div className="flex items-center gap-3"><span className="w-6 tabular-nums">{r.active_assignments}</span><Progress value={(Number(r.active_assignments) / max) * 100} className="w-32" /></div></TD>
                  <TD className="tabular-nums">{r.reviews_30d}</TD>
                  <TD className="tabular-nums">{Number(r.reviews_30d) ? `${Math.round((Number(r.approvals_30d) / Number(r.reviews_30d)) * 100)}%` : "—"}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </div>
      )}
    </>
  );
}
