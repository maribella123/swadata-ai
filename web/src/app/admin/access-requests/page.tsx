import type { Metadata } from "next";
import { KeyRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { Card, CardContent } from "@/components/ui/card";
import { ActionButton } from "@/components/admin/controls";
import { formatDate } from "@/lib/utils";
import { decideAccess } from "../actions";

export const metadata: Metadata = { title: "Access requests" };
const TONE = { pending: "warning", approved: "success", rejected: "danger", revoked: "neutral" } as const;

export default async function AccessRequests() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("dataset_access_requests")
    .select("id, institution, purpose, ethics_reference, status, created_at, decided_at, expires_at, decision_note, datasets(name, slug), requester:users!dataset_access_requests_requester_id_fkey(display_name, affiliation)")
    .order("status")
    .order("created_at", { ascending: false })
    .limit(200);
  return (
    <>
      <PageHeader eyebrow="People" title="Dataset access requests" description="Restricted datasets require an approved request. Approvals expire after 12 months." />
      {!data?.length ? <EmptyState icon={KeyRound} title="No access requests" /> : (
        <div className="space-y-4">
          {data.map((r) => (
            <Card key={r.id}>
              <CardContent className="space-y-3 pt-5 sm:pt-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-navy-900">{r.requester?.display_name} <span className="font-normal text-slate-500">· {r.institution}</span></p>
                    <p className="text-sm text-slate-500">Requesting <strong>{r.datasets?.name}</strong> · {formatDate(r.created_at)}{r.ethics_reference ? ` · Ethics ref: ${r.ethics_reference}` : ""}</p>
                  </div>
                  <Badge tone={TONE[r.status]} className="capitalize">{r.status}{r.expires_at && r.status === "approved" ? ` until ${formatDate(r.expires_at)}` : ""}</Badge>
                </div>
                <p className="whitespace-pre-wrap rounded-xl bg-mist p-3 text-sm">{r.purpose}</p>
                {r.decision_note && <p className="text-sm text-slate-600">Decision note: {r.decision_note}</p>}
                {r.status === "pending" && (
                  <div className="flex gap-2">
                    <ActionButton size="sm" action={decideAccess.bind(null, r.id, "approved", "Approved for the stated research purpose.", 365)} success="Access approved">Approve (12 months)</ActionButton>
                    <ActionButton size="sm" variant="outline" action={decideAccess.bind(null, r.id, "rejected", "Purpose does not meet the dataset's access conditions.", 0)} success="Request rejected" confirmText="Reject this request?">Reject</ActionButton>
                  </div>
                )}
                {r.status === "approved" && <ActionButton size="sm" variant="outline" action={decideAccess.bind(null, r.id, "revoked", "Access revoked by administrator.", 0)} success="Access revoked" confirmText="Revoke access?">Revoke access</ActionButton>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
