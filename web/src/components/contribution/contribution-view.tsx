import { CheckCircle2, Download, FileText, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CULTURAL_KINDS } from "@/lib/constants";
import type { ContributionDetail } from "@/lib/contribution-data";
import { wordDiff } from "@/lib/diff";
import { cn, formatBytes, formatDate, formatDuration } from "@/lib/utils";

export function DiffView({ from, to }: { from: string; to: string }) {
  return (
    <p className="whitespace-pre-wrap text-sm leading-relaxed">
      {wordDiff(from, to).map((p, i) => (
        <span key={i} className={cn(p.type === "add" && "rounded bg-emerald-100 text-forest-800", p.type === "del" && "rounded bg-red-100 text-danger line-through")}>{p.text}</span>
      ))}
    </p>
  );
}

/** Type-specific rendering of a contribution's content. Original is always shown; corrections as versions. */
export function ContributionContent({ c }: { c: ContributionDetail }) {
  const original = c.versions[0];
  const latest = c.versions[c.versions.length - 1];
  return (
    <div className="space-y-6">
      {c.type === "translation" && c.translations && (
        <Card>
          <CardHeader><CardTitle>Translation</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl bg-mist p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{c.translations.source_language?.name} (source)</p>
              <p className="mt-2 whitespace-pre-wrap">{c.translations.source_text}</p>
            </div>
            <div className="rounded-xl bg-emerald-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-forest-700">{c.translations.target_language?.name} (original translation)</p>
              <p className="mt-2 whitespace-pre-wrap">{c.translations.target_text}</p>
            </div>
            {(c.translations.domain || c.translations.notes) && (
              <p className="text-sm text-slate-600 md:col-span-2">Domain: {c.translations.domain}{c.translations.notes ? ` · Notes: ${c.translations.notes}` : ""}</p>
            )}
          </CardContent>
        </Card>
      )}

      {c.type === "conversation" && (
        <Card>
          <CardHeader><CardTitle>Conversation {c.metadata && (c.metadata as Record<string, string>).conversation_type ? <Badge className="ml-2 capitalize">{String((c.metadata as Record<string, string>).conversation_type).replace("_", " ")}</Badge> : null}</CardTitle></CardHeader>
          <CardContent>
            <ol className="space-y-3">
              {c.messages.map((m, i) => (
                <li key={m.id} className={cn("max-w-[85%] rounded-2xl px-4 py-3", i % 2 ? "ml-auto bg-emerald-50" : "bg-mist")}>
                  <p className="text-xs font-semibold text-slate-500">{m.speaker_label || m.speaker_role.replace("_", " ")} · #{m.seq}</p>
                  <p className="mt-1 whitespace-pre-wrap">{m.text}</p>
                  {m.gloss_en && <p className="mt-1 text-xs italic text-slate-500">“{m.gloss_en}”</p>}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      {c.type === "cultural" && c.cultural_metadata && (
        <Card>
          <CardHeader><CardTitle>{CULTURAL_KINDS.find((k) => k.value === c.cultural_metadata!.kind)?.label}</CardTitle></CardHeader>
          <CardContent>
            <blockquote className="border-l-4 border-gold-500 pl-4 font-display text-xl text-navy-900 whitespace-pre-wrap">{c.cultural_metadata.original_expression}</blockquote>
            <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
              {[
                ["Meaning", c.cultural_metadata.meaning],
                ["Literal translation", c.cultural_metadata.literal_translation],
                ["Context of use", c.cultural_metadata.usage_context],
                ["Region of origin", c.cultural_metadata.region_origin],
                ["Community of origin", c.cultural_metadata.community_origin],
                ["Access notes", c.cultural_metadata.access_notes],
              ].filter(([, v]) => v).map(([k, v]) => (
                <div key={k}><dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">{k}</dt><dd className="mt-1 whitespace-pre-wrap text-navy-900">{v}</dd></div>
              ))}
            </dl>
          </CardContent>
        </Card>
      )}

      {c.type === "audio" && c.audio && (
        <Card>
          <CardHeader><CardTitle>Recording</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {c.audioUrl ? <audio controls preload="metadata" src={c.audioUrl} className="w-full" /> : <p className="text-sm text-danger">Audio unavailable.</p>}
            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div><dt className="text-xs text-slate-500">Duration</dt><dd className="font-semibold">{c.audio.duration_seconds ? formatDuration(Number(c.audio.duration_seconds)) : "Measuring…"}</dd></div>
              <div><dt className="text-xs text-slate-500">Format</dt><dd className="font-semibold">{c.audio.mime_type}{c.audio.sample_rate ? ` · ${c.audio.sample_rate} Hz` : ""}</dd></div>
              <div><dt className="text-xs text-slate-500">Speaker</dt><dd className="font-semibold">{c.audio.speaker_pseudonym}</dd></div>
              <div><dt className="text-xs text-slate-500">Age / gender</dt><dd className="font-semibold">{c.audio.speaker_age_band} · {c.audio.speaker_gender}</dd></div>
              <div><dt className="text-xs text-slate-500">Size</dt><dd className="font-semibold">{formatBytes(c.audio.file_size_bytes)}</dd></div>
              <div><dt className="text-xs text-slate-500">Method</dt><dd className="font-semibold capitalize">{c.audio.recording_method}</dd></div>
              <div><dt className="text-xs text-slate-500">Analysis</dt><dd className="font-semibold">{c.audio.analysis_status}</dd></div>
              <div><dt className="text-xs text-slate-500">AI training consent</dt><dd className="font-semibold">{c.audio.consent_ai_training ? "Yes" : "No"}</dd></div>
            </dl>
            {c.audio.prompt_text && <div className="rounded-xl bg-mist p-3 text-sm"><span className="font-semibold">Prompt: </span>{c.audio.prompt_text}</div>}
            <div className="rounded-xl border border-line p-3 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Transcript ({c.audio.transcript_source})</p>
              <p className="mt-1 whitespace-pre-wrap">{c.audio.transcript || <span className="text-slate-400">No transcript yet.</span>}</p>
              {c.audio.transcript_source === "automatic" && <p className="mt-2 text-xs text-gold-700">Automatic draft — accuracy varies for African languages and must be human-reviewed.</p>}
            </div>
          </CardContent>
        </Card>
      )}

      {c.type === "document" && c.document && (
        <Card>
          <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2"><FileText className="size-4" /> {c.document.title}</CardTitle>
            {c.documentUrl && <a href={c.documentUrl} className="inline-flex items-center gap-1 text-sm font-semibold text-forest-700 hover:underline"><Download className="size-4" /> Original file</a>}
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              {[
                ["Author", c.document.author || "—"],
                ["Year", c.document.publication_year ?? "—"],
                ["Publisher", c.document.publisher || "—"],
                ["Source", c.document.source || "—"],
                ["File", `${c.document.file_type.toUpperCase()} · ${formatBytes(c.document.file_size_bytes)}`],
                ["Copyright", c.document.copyright_status.replaceAll("_", " ")],
                ["Digitise / AI training", `${c.document.permission_to_digitise ? "Yes" : "No"} / ${c.document.permission_ai_training ? "Yes" : "No"}`],
                ["Rights", c.document.rights_status.replaceAll("_", " ")],
              ].map(([k, v]) => <div key={String(k)}><dt className="text-xs text-slate-500">{k}</dt><dd className="font-semibold capitalize text-navy-900">{String(v)}</dd></div>)}
            </dl>
            {c.document.rights_notes && <p className="rounded-xl bg-mist p-3 text-sm"><span className="font-semibold">Rights notes: </span>{c.document.rights_notes}</p>}
            <div className="rounded-xl border border-line p-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-navy-900">Extraction</p>
                <Badge tone={c.document.extraction_status === "completed" ? "success" : c.document.extraction_status === "failed" ? "danger" : "info"}>{c.document.extraction_status}</Badge>
                {c.extraction && <span className="text-xs text-slate-500">{c.extraction.counts.total} segments · {c.extraction.counts.approved} approved · {c.extraction.counts.rejected} rejected · {c.extraction.counts.pending} pending</span>}
              </div>
              {c.document.extraction_error && <p className="mt-2 text-sm text-danger">{c.document.extraction_error}</p>}
              <ExtractionStats stats={c.document.extraction_stats as Record<string, unknown>} />
              {c.extraction && c.extraction.segments.length > 0 && (
                <ol className="mt-3 max-h-96 space-y-1.5 overflow-y-auto pr-1">
                  {c.extraction.segments.map((s) => (
                    <li key={s.id} className="flex gap-3 rounded-lg bg-mist/70 px-3 py-2 text-sm">
                      <span className="w-14 shrink-0 text-xs text-slate-400">p.{s.page_number ?? "–"} · {s.kind}</span>
                      <span className="flex-1 whitespace-pre-wrap">{s.text}</span>
                      {s.is_duplicate && <Badge tone="warning">dup</Badge>}
                      {s.status === "approved" && <CheckCircle2 className="size-4 shrink-0 text-forest-700" aria-label="approved" />}
                      {s.status === "rejected" && <XCircle className="size-4 shrink-0 text-danger" aria-label="rejected" />}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {original && c.type !== "conversation" && (
        <Card>
          <CardHeader>
            <CardTitle>{c.type === "text" ? "Text" : c.type === "audio" ? "Transcript versions" : "Text versions"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-line p-4">
              <div className="mb-2 flex items-center gap-2"><Badge tone="navy">Original · v1</Badge><span className="text-xs text-slate-500">{formatDate(original.created_at, true)} · {original.word_count} words</span></div>
              <p className="whitespace-pre-wrap leading-relaxed">{original.body}</p>
              {original.context && <p className="mt-3 border-t border-line pt-3 text-sm text-slate-600"><span className="font-semibold">Context: </span>{original.context}</p>}
            </div>
            {c.versions.slice(1).map((v, i) => (
              <div key={v.id} className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
                <div className="mb-2 flex flex-wrap items-center gap-2"><Badge tone="success">v{v.version}{v.id === latest.id ? " · current" : ""}</Badge><span className="text-xs text-slate-500">{v.change_note} · {formatDate(v.created_at, true)}</span></div>
                <DiffView from={c.versions[i].body} to={v.body} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ExtractionStats({ stats }: { stats: Record<string, unknown> }) {
  if (!stats || !Object.keys(stats).length) return null;
  const keys: Array<[string, string]> = [["pages", "Pages"], ["segments", "Segments"], ["paragraphs", "Paragraphs"], ["sentences", "Sentences"], ["stanzas", "Stanzas"], ["words", "Words"], ["characters", "Characters"], ["duplicates", "Duplicates"], ["ocr_pages", "OCR pages"], ["mean_ocr_confidence", "OCR confidence"]];
  return (
    <dl className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
      {keys.filter(([k]) => stats[k] !== undefined && stats[k] !== null).map(([k, l]) => (
        <div key={k} className="rounded-lg bg-mist px-2.5 py-1.5"><dt className="text-[0.65rem] uppercase tracking-wider text-slate-500">{l}</dt><dd className="text-sm font-semibold tabular-nums">{String(stats[k])}</dd></div>
      ))}
    </dl>
  );
}

export function ReviewHistory({ c }: { c: ContributionDetail }) {
  return (
    <Card>
      <CardHeader><CardTitle>Review history</CardTitle></CardHeader>
      <CardContent>
        {c.reviews.length === 0 ? (
          <p className="text-sm text-slate-500">No reviews yet.</p>
        ) : (
          <ol className="space-y-4">
            {c.reviews.map((r) => (
              <li key={r.id} className="border-l-2 border-line pl-4">
                <p className="text-sm"><span className="font-semibold capitalize text-navy-900">{r.decision.replace("_", " ")}</span> <span className="text-slate-500">by {r.reviewer?.display_name ?? "Reviewer"} · {formatDate(r.created_at, true)}</span></p>
                {r.comment && <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{r.comment}</p>}
                {r.scores && Object.keys(r.scores as object).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">{Object.entries(r.scores as Record<string, number>).map(([k, v]) => <Badge key={k} className="capitalize">{k.replace("_", " ")}: {v}/5</Badge>)}</div>
                )}
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

export function QualityChecks({ c }: { c: ContributionDetail }) {
  if (!c.quality_checks?.length) return null;
  return (
    <Card>
      <CardHeader><CardTitle>Automatic checks</CardTitle></CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm">
          {c.quality_checks.map((q) => (
            <li key={q.id} className="flex items-center justify-between gap-2">
              <span className="capitalize">{q.check_type.replaceAll("_", " ")}</span>
              {q.passed ? <Badge tone="success">Passed</Badge> : <Badge tone="warning">{q.check_type === "exact_duplicate" ? "Possible duplicate" : "Check"}</Badge>}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
