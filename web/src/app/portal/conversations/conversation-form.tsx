"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { FormSection, LanguageFields, PermissionsFieldset, toPayload, useCommonState } from "@/components/contribute/common-fields";
import { useSubmitContribution } from "@/components/contribute/use-submit";
import type { FormContext } from "@/lib/portal-data";
import { cn } from "@/lib/utils";

const KINDS = [
  { v: "everyday", l: "Everyday dialogue" },
  { v: "educational", l: "Educational conversation" },
  { v: "qa", l: "Questions and answers" },
  { v: "community", l: "Community interaction" },
  { v: "explanation", l: "Explanation" },
  { v: "problem_solving", l: "Problem-solving dialogue" },
];

const ROLES = [
  { v: "speaker_a", l: "Speaker A" },
  { v: "speaker_b", l: "Speaker B" },
  { v: "speaker_c", l: "Speaker C" },
  { v: "user", l: "Asker (user)" },
  { v: "assistant", l: "Answerer (assistant)" },
  { v: "teacher", l: "Teacher" },
  { v: "learner", l: "Learner" },
];

type Msg = { key: string; speaker_role: string; speaker_label: string; text: string; gloss_en: string };
let keySeq = 0;
const newMsg = (role: string, key?: string): Msg => ({ key: key ?? `m${++keySeq}-${Date.now()}`, speaker_role: role, speaker_label: "", text: "", gloss_en: "" });

export function ConversationForm({ ctx }: { ctx: FormContext }) {
  const common = useCommonState(ctx);
  const { submit, pending, errors, formError } = useSubmitContribution();
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState("everyday");
  const [showGloss, setShowGloss] = useState(false);
  const [messages, setMessages] = useState<Msg[]>(() => [newMsg("speaker_a", "m-a"), newMsg("speaker_b", "m-b")]);

  const update = (i: number, patch: Partial<Msg>) => setMessages((m) => m.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const move = (i: number, d: -1 | 1) =>
    setMessages((m) => {
      const n = [...m];
      [n[i], n[i + d]] = [n[i + d], n[i]];
      return n;
    });
  const nextRole = () => {
    const last = messages[messages.length - 1]?.speaker_role;
    const pairs: Record<string, string> = { speaker_a: "speaker_b", speaker_b: "speaker_a", user: "assistant", assistant: "user", teacher: "learner", learner: "teacher" };
    return pairs[last] ?? "speaker_a";
  };

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        submit(
          {
            type: "conversation",
            ...toPayload(common.state),
            title,
            metadata: { conversation_type: kind },
            messages: messages.map(({ key: _k, ...m }) => (void _k, m)),
          },
          { successMessage: "Conversation submitted for review.", onSuccess: () => { setTitle(""); setMessages([newMsg("speaker_a"), newMsg("speaker_b")]); } },
        );
      }}
    >
      {formError && <Alert tone="danger">{formError}</Alert>}
      <FormSection title="About this conversation">
        <LanguageFields ctx={ctx} state={common.state} set={common.set} errors={errors} />
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Conversation type" htmlFor="kind">
            <Select id="kind" value={kind} onChange={(e) => setKind(e.target.value)}>{KINDS.map((k) => <option key={k.v} value={k.v}>{k.l}</option>)}</Select>
          </Field>
          <Field label="Title or scenario" htmlFor="title" hint="e.g. Buying vegetables at the market">
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={300} />
          </Field>
        </div>
      </FormSection>

      <FormSection title="Messages" description="Use roles consistently. Speaker labels are optional — never use real people's names.">
        {errors.messages && <Alert tone="danger">{errors.messages}</Alert>}
        <ol className="space-y-3">
          {messages.map((m, i) => (
            <li key={m.key} className={cn("rounded-xl border p-3 sm:p-4", i % 2 ? "border-emerald-100 bg-emerald-50/50" : "border-line bg-white")}>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-400">#{i + 1}</span>
                <label className="sr-only" htmlFor={`role-${m.key}`}>Speaker role</label>
                <Select id={`role-${m.key}`} value={m.speaker_role} onChange={(e) => update(i, { speaker_role: e.target.value })} className="h-8 w-auto text-xs">
                  {ROLES.map((r) => <option key={r.v} value={r.v}>{r.l}</option>)}
                </Select>
                <label className="sr-only" htmlFor={`label-${m.key}`}>Speaker label</label>
                <Input id={`label-${m.key}`} placeholder="Label (optional)" value={m.speaker_label} onChange={(e) => update(i, { speaker_label: e.target.value })} className="h-8 w-40 text-xs" maxLength={60} />
                <div className="ml-auto flex gap-1">
                  <Button type="button" variant="ghost" size="icon" className="size-8" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up"><ArrowUp /></Button>
                  <Button type="button" variant="ghost" size="icon" className="size-8" disabled={i === messages.length - 1} onClick={() => move(i, 1)} aria-label="Move down"><ArrowDown /></Button>
                  <Button type="button" variant="ghost" size="icon" className="size-8 text-danger" disabled={messages.length <= 2} onClick={() => setMessages((x) => x.filter((_, j) => j !== i))} aria-label="Remove message"><Trash2 /></Button>
                </div>
              </div>
              <label className="sr-only" htmlFor={`text-${m.key}`}>Message {i + 1}</label>
              <Textarea id={`text-${m.key}`} value={m.text} onChange={(e) => update(i, { text: e.target.value })} rows={2} className="min-h-16" spellCheck={false} aria-invalid={!!errors[`messages.${i}.text`]} />
              {errors[`messages.${i}.text`] && <p className="mt-1 text-xs text-danger">{errors[`messages.${i}.text`]}</p>}
              {showGloss && (
                <Input placeholder="English gloss (optional)" value={m.gloss_en} onChange={(e) => update(i, { gloss_en: e.target.value })} className="mt-2 text-xs" aria-label={`English gloss for message ${i + 1}`} />
              )}
            </li>
          ))}
        </ol>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button type="button" variant="outline" onClick={() => setMessages((m) => [...m, newMsg(nextRole())])} disabled={messages.length >= 100}><Plus /> Add message</Button>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={showGloss} onChange={(e) => setShowGloss(e.target.checked)} className="accent-forest-700" /> Add English glosses
          </label>
        </div>
      </FormSection>
      <PermissionsFieldset value={common.state.permissions} onChange={(p) => common.set("permissions", p)} />
      <div className="flex justify-end"><Button type="submit" size="lg" disabled={pending}>{pending ? "Submitting…" : "Submit conversation"}</Button></div>
    </form>
  );
}
