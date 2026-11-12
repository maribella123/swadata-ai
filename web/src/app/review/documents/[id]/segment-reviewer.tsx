"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { reviewExtractions } from "../../actions";

type Seg = { id: string; seq: number; page_number: number | null; kind: string; text: string; status: string; is_duplicate: boolean; ocr_confidence: number | null };

export function SegmentReviewer({ segments }: { segments: Seg[] }) {
  const router = useRouter();
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();
  const toggle = (id: string) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const act = (status: "approved" | "rejected", ids = [...sel]) =>
    start(async () => {
      const r = await reviewExtractions(ids, status);
      if (!r.ok) return void toast.error(r.error);
      toast.success(`${r.count} segment(s) ${status}`);
      setSel(new Set());
      router.refresh();
    });
  const nonDup = segments.filter((s) => !s.is_duplicate && s.status === "pending").map((s) => s.id);

  return (
    <div className="space-y-3">
      <div className="sticky top-14 z-10 flex flex-wrap items-center gap-2 rounded-xl border border-line bg-white/95 p-3 backdrop-blur lg:top-0">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" className="accent-forest-700" checked={sel.size > 0 && sel.size === segments.length} onChange={(e) => setSel(e.target.checked ? new Set(segments.map((s) => s.id)) : new Set())} /> Select all on page
        </label>
        <span className="text-sm text-slate-500">{sel.size} selected</span>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={pending || !nonDup.length} onClick={() => act("approved", nonDup)}>Approve all pending non-duplicates</Button>
          <Button size="sm" disabled={pending || !sel.size} onClick={() => act("approved")}><CheckCircle2 /> Approve</Button>
          <Button size="sm" variant="danger" disabled={pending || !sel.size} onClick={() => act("rejected")}><XCircle /> Reject</Button>
        </div>
      </div>
      <ol className="space-y-1.5">
        {segments.map((s) => (
          <li key={s.id}>
            <label className={cn("flex cursor-pointer gap-3 rounded-xl border px-3 py-2.5 text-sm transition-colors", sel.has(s.id) ? "border-forest-700 bg-emerald-50/60" : "border-line bg-white hover:bg-ivory/60")}>
              <input type="checkbox" className="mt-1 accent-forest-700" checked={sel.has(s.id)} onChange={() => toggle(s.id)} aria-label={`Select segment ${s.seq}`} />
              <span className="w-20 shrink-0 text-xs text-slate-400">#{s.seq} · p.{s.page_number ?? "–"}<br />{s.kind}</span>
              <span className={cn("flex-1 whitespace-pre-wrap leading-relaxed", s.kind === "stanza" && "font-display")}>{s.text}</span>
              <span className="flex shrink-0 flex-col items-end gap-1">
                {s.status !== "pending" && <Badge tone={s.status === "approved" ? "success" : "danger"}>{s.status}</Badge>}
                {s.is_duplicate && <Badge tone="warning">duplicate</Badge>}
                {s.ocr_confidence !== null && <Badge tone={Number(s.ocr_confidence) < 70 ? "warning" : "neutral"}>OCR {Math.round(Number(s.ocr_confidence))}%</Badge>}
              </span>
            </label>
          </li>
        ))}
      </ol>
    </div>
  );
}
