import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/misc";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { ActionButton } from "@/components/admin/controls";
import { formatDate, truncate } from "@/lib/utils";
import { retryJob } from "../actions";

export const metadata: Metadata = { title: "Processing jobs" };
const TONE = { pending: "neutral", queued: "info", processing: "info", completed: "success", failed: "danger", not_applicable: "neutral" } as const;

export default async function Jobs({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  let q = supabase.from("processing_jobs").select("*").order("created_at", { ascending: false }).limit(200);
  if (sp.status) q = q.eq("status", sp.status as never);
  const { data } = await q;
  return (
    <>
      <PageHeader eyebrow="Governance" title="Processing jobs" description="Background work handled by the Python processing service: extraction, OCR, audio analysis, transcription, dataset builds and exports. Jobs are durable and retried up to 3 times." />
      <div className="mb-4 flex flex-wrap gap-2 text-sm">{["", "queued", "processing", "completed", "failed"].map((s) => <a key={s} href={s ? `?status=${s}` : "?"} className={`rounded-full px-3 py-1 font-semibold capitalize ${(sp.status ?? "") === s ? "bg-navy-900 text-white" : "bg-white ring-1 ring-line"}`}>{s || "All"}</a>)}</div>
      <div className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-white">
        <Table>
          <THead><TR><TH>Job</TH><TH>Status</TH><TH>Attempts</TH><TH>Result / error</TH><TH>Created</TH><TH>Finished</TH><TH /></TR></THead>
          <TBody>
            {(data ?? []).map((j) => (
              <TR key={j.id}>
                <TD><p className="font-medium text-navy-900">{j.job_type.replaceAll("_", " ")}</p><p className="font-mono text-xs text-slate-400">{j.entity_id.slice(0, 8)}</p></TD>
                <TD><Badge tone={TONE[j.status]}>{j.status}</Badge></TD>
                <TD className="tabular-nums">{j.attempts}/{j.max_attempts}</TD>
                <TD className="max-w-sm text-xs">{j.error ? <span className="text-danger">{truncate(j.error, 160)}</span> : <span className="font-mono text-slate-500">{truncate(JSON.stringify(j.result), 120)}</span>}</TD>
                <TD className="whitespace-nowrap text-slate-500">{formatDate(j.created_at, true)}</TD>
                <TD className="whitespace-nowrap text-slate-500">{formatDate(j.finished_at, true)}</TD>
                <TD>{(j.status === "failed" || j.status === "queued") && <ActionButton size="sm" variant="outline" action={retryJob.bind(null, j.id)} success="Job re-queued">Retry</ActionButton>}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </div>
    </>
  );
}
