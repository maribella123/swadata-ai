import Link from "next/link";
import type { Metadata } from "next";
import { PageHeader, StatusBadge } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { getFormContext } from "@/lib/portal-data";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import { DocumentForm } from "./document-form";

export const metadata: Metadata = { title: "Upload documents" };

const EXTRACTION_TONE = { pending: "neutral", queued: "info", processing: "info", completed: "success", failed: "danger", not_applicable: "neutral" } as const;

export default async function DocumentsPage() {
  const user = await requireUser();
  const ctx = await getFormContext("document");
  const supabase = await createClient();
  const { data: docs } = await supabase
    .from("documents")
    .select("id, title, file_type, extraction_status, rights_status, extraction_stats, created_at, contribution_id, contributions!inner(status, contributor_id)")
    .eq("contributions.contributor_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  return (
    <>
      <PageHeader
        eyebrow="Contribute"
        title="Upload books & documents"
        description="Digitise books, poems, articles, stories and dictionaries. We extract the text (with OCR for scans), preserve page, paragraph and stanza structure, detect duplicates and send the result to reviewers."
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_20rem]">
        <DocumentForm ctx={ctx} />
        <Card className="h-fit">
          <CardHeader><CardTitle>Your recent uploads</CardTitle></CardHeader>
          <CardContent>
            {!docs?.length ? (
              <p className="text-sm text-slate-500">No documents yet.</p>
            ) : (
              <ul className="divide-y divide-line">
                {docs.map((d) => {
                  const stats = d.extraction_stats as { segments?: number; pages?: number };
                  return (
                    <li key={d.id} className="py-3">
                      <Link href={`/portal/contributions/${d.contribution_id}`} className="block hover:underline">
                        <p className="truncate text-sm font-semibold text-navy-900">{d.title}</p>
                      </Link>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <Badge className="uppercase">{d.file_type}</Badge>
                        <Badge tone={EXTRACTION_TONE[d.extraction_status]}>Extraction: {d.extraction_status}</Badge>
                        <StatusBadge status={d.contributions.status} />
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{formatDate(d.created_at)}{stats?.segments ? ` · ${stats.segments} segments` : ""}</p>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
