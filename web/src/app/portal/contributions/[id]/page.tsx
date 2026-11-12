import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getContributionDetail } from "@/lib/contribution-data";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/misc";
import { ContributionContent, QualityChecks, ReviewHistory } from "@/components/contribution/contribution-view";
import { TYPE_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { ContributorActions, PermissionsEditor } from "./contributor-actions";

export const metadata: Metadata = { title: "Contribution" };

export default async function ContributionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const c = await getContributionDetail(id);
  if (!c || c.contributor_id !== user.id) notFound();
  const lastReview = c.reviews[c.reviews.length - 1];
  const latest = c.versions[c.versions.length - 1];

  return (
    <>
      <Link href="/portal/contributions" className="inline-flex items-center gap-1 text-sm font-semibold text-forest-700"><ArrowLeft className="size-4" /> My contributions</Link>
      <div className="mb-6 mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="navy">{TYPE_LABELS[c.type]}</Badge>
            <StatusBadge status={c.status} />
            <Badge>{c.languages?.name}{c.language_varieties ? ` · ${c.language_varieties.name}` : ""}</Badge>
            <Badge className="capitalize">Layer: {c.data_layer.replace("_", "-")}</Badge>
            {c.sensitivity !== "public" && <Badge tone="warning" className="capitalize">{c.sensitivity}</Badge>}
          </div>
          <h1 className="mt-3 font-display text-3xl font-semibold">{c.title || c.document?.title || `${TYPE_LABELS[c.type]} contribution`}</h1>
          <p className="mt-1 text-sm text-slate-500">Created {formatDate(c.created_at, true)}{c.submitted_at ? ` · submitted ${formatDate(c.submitted_at, true)}` : ""}</p>
        </div>
      </div>

      {c.status === "changes_requested" && lastReview && (
        <Alert tone="warning" title="The reviewer requested changes" className="mb-6">{lastReview.comment}</Alert>
      )}
      {c.status === "rejected" && lastReview?.comment && <Alert tone="danger" title="Not accepted" className="mb-6">{lastReview.comment}</Alert>}
      {c.status === "approved" && <Alert tone="success" className="mb-6">Approved — thank you! This contribution is now part of the validated data layer.</Alert>}

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <ContributionContent c={c} />
        <div className="space-y-6">
          <ContributorActions id={c.id} status={c.status} canRevise={["text", "translation", "cultural", "audio"].includes(c.type)} latestBody={latest?.body ?? ""} />
          {c.contribution_permissions && <PermissionsEditor id={c.id} initial={c.contribution_permissions} />}
          <QualityChecks c={c} />
          <ReviewHistory c={c} />
          <Card>
            <CardHeader><CardTitle>Provenance</CardTitle></CardHeader>
            <CardContent>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-2"><dt className="text-slate-500">Source type</dt><dd className="font-medium capitalize">{c.source_type}</dd></div>
                <div className="flex justify-between gap-2"><dt className="text-slate-500">Original work</dt><dd className="font-medium">{c.is_original ? "Yes" : "Previously published"}</dd></div>
                {c.source_reference && <div className="flex justify-between gap-2"><dt className="text-slate-500">Reference</dt><dd className="text-right font-medium">{c.source_reference}</dd></div>}
                <div className="flex justify-between gap-2"><dt className="text-slate-500">Licence</dt><dd className="font-medium">{c.data_licenses?.code ?? "—"}</dd></div>
                <div className="flex justify-between gap-2"><dt className="text-slate-500">Category</dt><dd className="font-medium">{c.content_categories?.name ?? "—"}</dd></div>
                <div className="flex justify-between gap-2"><dt className="text-slate-500">Record ID</dt><dd className="font-mono text-xs">{c.id.slice(0, 8)}</dd></div>
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
