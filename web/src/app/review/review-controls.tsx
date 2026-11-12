"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, MessageSquare, RotateCcw, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Select, Textarea } from "@/components/ui/input";
import { COPYRIGHT_OPTIONS, SENSITIVITY_OPTIONS, type ContributionType } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { assignReviewer, claimReview, submitReview, verifyRights } from "./actions";

export function ClaimButton({ id, label = "Claim" }: { id: string; label?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await claimReview(id);
          if (!r.ok) return void toast.error(r.error);
          toast.success("Assigned to you");
          router.push(`/review/${id}`);
        })
      }
    >
      {pending ? "Claiming…" : label}
    </Button>
  );
}

const SCORE_SETS: Record<ContributionType, string[]> = {
  text: ["fluency", "naturalness", "overall"],
  translation: ["accuracy", "fluency", "context", "naturalness"],
  audio: ["audio_quality", "transcript_accuracy", "overall"],
  conversation: ["fluency", "naturalness", "context", "overall"],
  cultural: ["cultural_accuracy", "context", "overall"],
  document: ["overall"],
};

const DECISIONS = [
  { v: "approve", l: "Approve", icon: CheckCircle2, cls: "data-[on=true]:border-forest-700 data-[on=true]:bg-emerald-50 data-[on=true]:text-forest-800" },
  { v: "request_changes", l: "Request changes", icon: RotateCcw, cls: "data-[on=true]:border-gold-500 data-[on=true]:bg-gold-100 data-[on=true]:text-gold-700" },
  { v: "reject", l: "Reject", icon: XCircle, cls: "data-[on=true]:border-danger data-[on=true]:bg-red-50 data-[on=true]:text-danger" },
  { v: "comment", l: "Comment only", icon: MessageSquare, cls: "data-[on=true]:border-navy-500 data-[on=true]:bg-navy-50 data-[on=true]:text-navy-900" },
] as const;

export function ReviewPanel({
  id,
  type,
  latestText,
  canEditText,
  canSetSensitivity,
  sensitivity,
  isFinal,
  canRevisit,
}: {
  id: string;
  type: ContributionType;
  latestText: string;
  canEditText: boolean;
  canSetSensitivity: boolean;
  sensitivity: "public" | "community" | "restricted";
  isFinal: boolean;
  canRevisit: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [decision, setDecision] = useState<(typeof DECISIONS)[number]["v"]>("approve");
  const [comment, setComment] = useState("");
  const [scores, setScores] = useState<Record<string, number>>({});
  const [corrected, setCorrected] = useState(latestText);
  const [sens, setSens] = useState(sensitivity);
  const [error, setError] = useState<string | null>(null);

  if (isFinal && !canRevisit) {
    return <Alert tone="info">A final decision has been recorded. Only linguists and administrators can revisit it.</Alert>;
  }

  function send() {
    setError(null);
    if ((decision === "reject" || decision === "request_changes") && !comment.trim()) {
      setError("Please explain your decision so the contributor can learn from it.");
      return;
    }
    start(async () => {
      const r = await submitReview({
        id,
        decision,
        comment,
        scores,
        corrected_text: canEditText && corrected.trim() && corrected !== latestText ? corrected : undefined,
        sensitivity: canSetSensitivity && sens !== sensitivity ? sens : undefined,
      });
      if (!r.ok) {
        setError(r.error ?? "Could not save review");
        return;
      }
      toast.success("Review recorded");
      router.push("/review");
      router.refresh();
    });
  }

  return (
    <Card className="border-forest-700/30">
      <CardHeader><CardTitle>Your review</CardTitle></CardHeader>
      <CardContent className="space-y-5">
        {error && <Alert tone="danger">{error}</Alert>}
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Decision">
          {DECISIONS.map(({ v, l, icon: Icon, cls }) => (
            <button key={v} type="button" role="radio" aria-checked={decision === v} data-on={decision === v} onClick={() => setDecision(v)} className={cn("flex items-center gap-2 rounded-xl border border-line px-3 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-mist", cls)}>
              <Icon className="size-4" /> {l}
            </button>
          ))}
        </div>
        <fieldset>
          <legend className="text-sm font-semibold text-navy-900">Quality scores <span className="font-normal text-slate-500">(1 = poor, 5 = excellent)</span></legend>
          <div className="mt-2 space-y-2">
            {SCORE_SETS[type].map((k) => (
              <div key={k} className="flex items-center justify-between gap-3">
                <span className="text-sm capitalize text-slate-700">{k.replace("_", " ")}</span>
                <div className="flex gap-1" role="radiogroup" aria-label={k}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" role="radio" aria-checked={scores[k] === n} onClick={() => setScores((s) => ({ ...s, [k]: n }))} className={cn("size-8 rounded-lg border text-sm font-semibold", scores[k] === n ? "border-forest-700 bg-forest-700 text-white" : "border-line text-slate-600 hover:bg-mist")}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </fieldset>
        {canEditText && (
          <Field label="Corrected version" htmlFor="corrected" hint="Edits are saved as a new version. The original submission is never overwritten. Correct only what a fluent speaker would — don't standardise dialect.">
            <Textarea id="corrected" value={corrected} onChange={(e) => setCorrected(e.target.value)} rows={6} spellCheck={false} />
          </Field>
        )}
        {canSetSensitivity && (
          <Field label="Sensitivity classification" htmlFor="sens">
            <Select id="sens" value={sens} onChange={(e) => setSens(e.target.value as typeof sens)}>{SENSITIVITY_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</Select>
          </Field>
        )}
        <Field label="Comment to contributor" htmlFor="comment" hint={decision === "approve" ? "Optional — encouragement is welcome!" : "Required for rejections and change requests"}>
          <Textarea id="comment" value={comment} onChange={(e) => setComment(e.target.value)} rows={3} />
        </Field>
        <Button className="w-full" size="lg" disabled={pending} onClick={send}>{pending ? "Saving…" : "Record decision"}</Button>
      </CardContent>
    </Card>
  );
}

export function AssignPanel({ id, reviewers, current }: { id: string; reviewers: { id: string; name: string }[]; current?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [sel, setSel] = useState(current ?? "");
  return (
    <Card>
      <CardHeader><CardTitle>Assignment</CardTitle></CardHeader>
      <CardContent className="flex gap-2">
        <Select value={sel} onChange={(e) => setSel(e.target.value)} aria-label="Reviewer">
          <option value="">Choose reviewer…</option>
          {reviewers.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </Select>
        <Button variant="outline" disabled={!sel || pending || sel === current} onClick={() => start(async () => { const r = await assignReviewer(id, sel); if (r.ok) { toast.success("Reviewer assigned"); router.refresh(); } else toast.error(r.error); })}>Assign</Button>
      </CardContent>
    </Card>
  );
}

export function RightsPanel({ documentId, current }: { documentId: string; current: { rights_status: string; copyright_status: string; permission_ai_training: boolean } }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [status, setStatus] = useState(current.rights_status === "pending_verification" ? "verified" : current.rights_status);
  const [copyright, setCopyright] = useState(current.copyright_status);
  const [ai, setAi] = useState(current.permission_ai_training);
  const [notes, setNotes] = useState("");
  return (
    <Card>
      <CardHeader><CardTitle>Rights verification</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-slate-600">Current status: <strong className="capitalize">{current.rights_status.replaceAll("_", " ")}</strong>. Extracted text only enters datasets once rights are verified.</p>
        <Field label="Decision" htmlFor="rights_status">
          <Select id="rights_status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="verified">Verified — may be digitised and used as permitted</option>
            <option value="rejected">Rejected — rights not established</option>
            <option value="pending_verification">Keep pending (awaiting evidence)</option>
          </Select>
        </Field>
        <Field label="Copyright status" htmlFor="rights_copyright">
          <Select id="rights_copyright" value={copyright} onChange={(e) => setCopyright(e.target.value)}>{COPYRIGHT_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</Select>
        </Field>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={ai} onChange={(e) => setAi(e.target.checked)} className="accent-forest-700" /> Rights permit AI training</label>
        <Field label="Evidence / notes" htmlFor="rights_notes" hint="e.g. written permission from publisher dated…, public domain since…">
          <Textarea id="rights_notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
        </Field>
        <Button className="w-full" variant="navy" disabled={pending} onClick={() => start(async () => {
          const r = await verifyRights({ documentId, status, notes, copyright, aiTraining: ai });
          if (r.ok) { toast.success("Rights decision recorded"); router.refresh(); } else toast.error(r.error);
        })}>Record rights decision</Button>
      </CardContent>
    </Card>
  );
}
