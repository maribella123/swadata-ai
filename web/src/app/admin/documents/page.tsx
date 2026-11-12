import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { PageHeader, StatCard } from "@/components/ui/misc";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { ActionButton } from "@/components/admin/controls";
import { formatBytes, formatDate, formatNumber } from "@/lib/utils";
import { queueJob } from "../actions";

export const metadata: Metadata = { title: "Document uploads" };

export default async function AdminDocuments() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("documents")
    .select("id, title, author, file_type, file_size_bytes, extraction_status, extraction_error, rights_status, copyright_status, permission_ai_training, extraction_stats, created_at, contribution_id, contributions(status, languages(name))")
    .order("created_at", { ascending: false })
    .limit(200);
  const rows = data ?? [];
  const segs = rows.reduce((a, d) => a + Number((d.extraction_stats as { segments?: number })?.segments ?? 0), 0);
  return (
    <>
      <PageHeader eyebrow="Content" title="Document uploads" description="Monitor extraction, OCR and rights status for all ingested documents." />
      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <StatCard label="Documents" value={formatNumber(rows.length)} />
        <StatCard label="Extracted segments" value={formatNumber(segs)} tone="navy" />
        <StatCard label="Rights pending" value={formatNumber(rows.filter((d) => d.rights_status === "pending_verification").length)} tone="gold" />
        <StatCard label="Extraction failures" value={formatNumber(rows.filter((d) => d.extraction_status === "failed").length)} tone="danger" />
      </div>
      <div className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-white">
        <Table>
          <THead><TR><TH>Document</TH><TH>Language</TH><TH>File</TH><TH>Extraction</TH><TH>Rights</TH><TH>Uploaded</TH><TH /></TR></THead>
          <TBody>
            {rows.map((d) => (
              <TR key={d.id}>
                <TD className="max-w-xs"><Link className="font-medium text-navy-900 hover:underline" href={`/review/${d.contribution_id}`}>{d.title}</Link><p className="text-xs text-slate-500">{d.author || "Unknown author"} · {d.copyright_status.replaceAll("_", " ")}</p></TD>
                <TD>{d.contributions?.languages?.name}</TD>
                <TD className="whitespace-nowrap">{d.file_type.toUpperCase()} · {formatBytes(d.file_size_bytes)}</TD>
                <TD><Badge tone={d.extraction_status === "completed" ? "success" : d.extraction_status === "failed" ? "danger" : "info"}>{d.extraction_status}</Badge>{d.extraction_error && <p className="mt-1 max-w-48 text-xs text-danger">{d.extraction_error}</p>}</TD>
                <TD><Badge tone={d.rights_status === "verified" ? "success" : d.rights_status === "rejected" ? "danger" : "warning"}>{d.rights_status.replaceAll("_", " ")}</Badge></TD>
                <TD className="whitespace-nowrap text-slate-500">{formatDate(d.created_at)}</TD>
                <TD>{d.extraction_status !== "processing" && <ActionButton size="sm" variant="outline" action={queueJob.bind(null, "document_extract", d.id)} success="Extraction queued">{d.extraction_status === "completed" ? "Re-extract" : "Retry"}</ActionButton>}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </div>
    </>
  );
}
