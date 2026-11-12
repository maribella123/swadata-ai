import Link from "next/link";
import type { Metadata } from "next";
import { KeyRound } from "lucide-react";
import { requireResearcher } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "My access requests" };

export default async function MyRequests() {
  const user = await requireResearcher();
  const supabase = await createClient();
  const { data } = await supabase.from("dataset_access_requests").select("id, status, created_at, decided_at, expires_at, decision_note, datasets(name, slug)").eq("requester_id", user.id).order("created_at", { ascending: false });
  return (
    <>
      <PageHeader eyebrow="Researcher portal" title="My access requests" />
      {!data?.length ? <EmptyState icon={KeyRound} title="No requests yet" description="Request access from a restricted dataset's page." /> : (
        <div className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-white">
          <Table>
            <THead><TR><TH>Dataset</TH><TH>Status</TH><TH>Requested</TH><TH>Decided</TH><TH>Expires</TH><TH>Note</TH></TR></THead>
            <TBody>{data.map((r) => <TR key={r.id}><TD><Link className="font-medium text-navy-900 hover:underline" href={`/researcher/datasets/${r.datasets?.slug}`}>{r.datasets?.name}</Link></TD><TD><Badge tone={r.status === "approved" ? "success" : r.status === "pending" ? "warning" : "neutral"} className="capitalize">{r.status}</Badge></TD><TD>{formatDate(r.created_at)}</TD><TD>{formatDate(r.decided_at)}</TD><TD>{formatDate(r.expires_at)}</TD><TD className="text-slate-600">{r.decision_note || "—"}</TD></TR>)}</TBody>
          </Table>
        </div>
      )}
    </>
  );
}
