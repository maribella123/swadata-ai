import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, Lock } from "lucide-react";
import { hasAnyRole, requireReviewer } from "@/lib/auth";
import { getContributionDetail } from "@/lib/contribution-data";
import { createClient } from "@/lib/supabase/server";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/misc";
import { ContributionContent, QualityChecks, ReviewHistory } from "@/components/contribution/contribution-view";
import { RESTRICTED_ROLES, TYPE_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { AssignPanel, ClaimButton, ReviewPanel, RightsPanel } from "../review-controls";

export const metadata: Metadata = { title: "Review" };

export default async function ReviewDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireReviewer();
  const c = await getContributionDetail(id);
  if (!c) notFound();
  const senior = hasAnyRole(user, RESTRICTED_ROLES);
  const own = c.contributor_id === user.id;
  const active = (c.review_assignments ?? []).find((a) => a.status === "active");
  const latest = c.versions[c.versions.length - 1];

  let reviewers: { id: string; name: string }[] = [];
  let siblings: { id: string; target_text: string; status: string; contributor_id: string }[] = [];
  const supabase = await createClient();
  if (senior) {
    const { data } = await supabase.rpc("reviewer_workload");
    reviewers = (data ?? []).filter((r) => r.reviewer_id !== c.contributor_id).map((r) => ({ id: r.reviewer_id, name: `${r.display_name} (${r.active_assignments} active)` }));
  }
  if (c.type === "translation" && c.translations) {
    const { data } = await supabase
      .from("translations")
      .select("contribution_id, target_text, contributions!inner(status, contributor_id)")
      .eq("source_language_id", c.translations.source_language_id)
      .eq("source_hash", c.translations.source_hash ?? "")
      .neq("contribution_id", c.id)
      .limit(10);
    siblings = (data ?? []).map((t) => ({ id: t.contribution_id, target_text: t.target_text, status: t.contributions.status, contributor_id: t.contributions.contributor_id }));
  }

  return (
    <>
      <Link href="/review" className="inline-flex items-center gap-1 text-sm font-semibold text-forest-700"><ArrowLeft className="size-4" /> Review queue</Link>
      <div className="mb-6 mt-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="navy">{TYPE_LABELS[c.type]}</Badge>
          <StatusBadge status={c.status} />
          <Badge>{c.languages?.name}{c.language_varieties ? ` · ${c.language_varieties.name}` : ""}</Badge>
          {c.content_categories && <Badge>{c.content_categories.name}</Badge>}
          {c.sensitivity !== "public" && <Badge tone={c.sensitivity === "restricted" ? "danger" : "warning"} className="capitalize"><Lock className="size-3" /> {c.sensitivity}</Badge>}
        </div>
        <h1 className="mt-3 font-display text-3xl font-semibold">{c.title || c.document?.title || `${TYPE_LABELS[c.type]} submission`}</h1>
        <p className="mt-1 text-sm text-slate-500">
          Submitted {formatDate(c.submitted_at, true)} by {senior ? c.contributor?.display_name : `contributor #${c.contributor_id.slice(0, 6)}`} · source: {c.source_type}{c.is_original ? "" : " (previously published)"}
        </p>
      </div>

      {own && <Alert tone="warning" className="mb-6">This is your own contribution. You cannot review it.</Alert>}

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <ContributionContent c={c} />
          {siblings.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Other translations of this source</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {siblings.map((s) => (
                    <li key={s.id} className="flex items-start justify-between gap-3 rounded-lg bg-mist px-3 py-2 text-sm">
                      <span className="whitespace-pre-wrap">{s.target_text}</span>
                      <span className="flex shrink-0 items-center gap-2"><StatusBadge status={s.status as never} />{s.contributor_id !== user.id && <Link className="text-xs font-semibold text-forest-700" href={`/review/${s.id}`}>Open</Link>}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
          <ReviewHistory c={c} />
        </div>
        <div className="space-y-6">
          {!own && (
            <>
              {!active && ["submitted", "in_review"].includes(c.status) && (
                <Card><CardContent className="flex items-center justify-between gap-3 pt-5 sm:pt-6"><p className="text-sm text-slate-600">Claim this item so others know you are reviewing it.</p><ClaimButton id={c.id} /></CardContent></Card>
              )}
              {active && active.reviewer_id !== user.id && <Alert tone="info">Assigned to {active.reviewer?.display_name}. You can still add a comment.</Alert>}
              {c.type === "document" && c.document && (
                <>
                  <Card>
                    <CardContent className="space-y-3 pt-5 sm:pt-6">
                      <p className="text-sm text-slate-600">Review extracted segments individually before approving the document as a whole.</p>
                      <Button asChild variant="outline" className="w-full"><Link href={`/review/documents/${c.document.id}`}>Review {c.extraction?.counts.total ?? 0} extracted segments</Link></Button>
                    </CardContent>
                  </Card>
                  {senior && <RightsPanel documentId={c.document.id} current={c.document} />}
                </>
              )}
              <ReviewPanel
                id={c.id}
                type={c.type}
                latestText={latest?.body ?? ""}
                canEditText={["text", "translation", "audio", "cultural"].includes(c.type)}
                canSetSensitivity={senior || c.type === "cultural"}
                sensitivity={c.sensitivity}
                isFinal={["approved", "rejected"].includes(c.status)}
                canRevisit={senior}
              />
              {senior && <AssignPanel id={c.id} reviewers={reviewers} current={active?.reviewer_id} />}
            </>
          )}
          <QualityChecks c={c} />
          {c.contribution_permissions && (
            <Card>
              <CardHeader><CardTitle>Contributor permissions</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-1.5 text-sm">
                  {[
                    ["Research use", c.contribution_permissions.allow_research],
                    ["AI training", c.contribution_permissions.allow_ai_training],
                    ["Public publication", c.contribution_permissions.allow_public_release],
                    ["Commercial use", c.contribution_permissions.allow_commercial],
                  ].map(([k, v]) => <li key={String(k)} className="flex justify-between"><span>{k}</span><Badge tone={v ? "success" : "neutral"}>{v ? "Granted" : "Not granted"}</Badge></li>)}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
