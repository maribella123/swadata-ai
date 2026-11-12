import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { PageHeader, StatCard } from "@/components/ui/misc";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { ActionButton } from "@/components/admin/controls";
import { formatDate, formatDuration, formatNumber } from "@/lib/utils";
import { queueJob } from "../actions";

export const metadata: Metadata = { title: "Audio uploads" };

export default async function AdminAudio() {
  const supabase = await createClient();
  const [{ data }, { data: setting }] = await Promise.all([
    supabase.from("audio_assets").select("id, speaker_pseudonym, mime_type, duration_seconds, sample_rate, analysis_status, transcription_status, transcript_source, consent_ai_training, created_at, contribution_id, contributions(status, languages(name))").order("created_at", { ascending: false }).limit(200),
    supabase.from("system_settings").select("value").eq("key", "transcription_enabled").maybeSingle(),
  ]);
  const rows = data ?? [];
  const seconds = rows.reduce((a, r) => a + Number(r.duration_seconds ?? 0), 0);
  const transcription = setting?.value === true;
  return (
    <>
      <PageHeader eyebrow="Content" title="Audio uploads" description={`Automatic transcription is ${transcription ? "enabled" : "disabled"} (System settings). Automatic transcripts are drafts for human correction — Whisper-family models do not reliably support every African language.`} />
      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <StatCard label="Recordings" value={formatNumber(rows.length)} />
        <StatCard label="Total duration" value={`${(seconds / 3600).toFixed(2)} h`} tone="navy" />
        <StatCard label="With transcript" value={formatNumber(rows.filter((r) => r.transcript_source !== "none").length)} tone="gold" />
        <StatCard label="AI-training consent" value={formatNumber(rows.filter((r) => r.consent_ai_training).length)} />
      </div>
      <div className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-white">
        <Table>
          <THead><TR><TH>Speaker</TH><TH>Language</TH><TH>Duration</TH><TH>Format</TH><TH>Analysis</TH><TH>Transcript</TH><TH>Uploaded</TH><TH /></TR></THead>
          <TBody>
            {rows.map((a) => (
              <TR key={a.id}>
                <TD><Link href={`/review/${a.contribution_id}`} className="font-medium text-navy-900 hover:underline">{a.speaker_pseudonym}</Link></TD>
                <TD>{a.contributions?.languages?.name}</TD>
                <TD className="tabular-nums">{a.duration_seconds ? formatDuration(Number(a.duration_seconds)) : "—"}</TD>
                <TD className="text-xs">{a.mime_type}{a.sample_rate ? ` · ${a.sample_rate} Hz` : ""}</TD>
                <TD><Badge tone={a.analysis_status === "completed" ? "success" : a.analysis_status === "failed" ? "danger" : "info"}>{a.analysis_status}</Badge></TD>
                <TD><Badge className="capitalize">{a.transcript_source}</Badge>{a.transcription_status !== "not_applicable" && <span className="ml-1 text-xs text-slate-500">{a.transcription_status}</span>}</TD>
                <TD className="whitespace-nowrap text-slate-500">{formatDate(a.created_at)}</TD>
                <TD className="space-x-1 whitespace-nowrap">
                  {a.analysis_status !== "completed" && <ActionButton size="sm" variant="outline" action={queueJob.bind(null, "audio_analyze", a.id)} success="Analysis queued">Analyse</ActionButton>}
                  {transcription && a.transcript_source === "none" && <ActionButton size="sm" variant="outline" action={queueJob.bind(null, "audio_transcribe", a.id)} success="Transcription queued">Transcribe</ActionButton>}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </div>
    </>
  );
}
