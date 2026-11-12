"use client";

import { useState } from "react";
import { ArrowRightLeft, Shuffle } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { FormSection, PermissionsFieldset, toPayload, useCommonState } from "@/components/contribute/common-fields";
import { useSubmitContribution } from "@/components/contribute/use-submit";
import type { FormContext } from "@/lib/portal-data";

type Source = { id: string; text: string; domain: string; language_id: string };

export function TranslationForm({ ctx, sources, initialSourceId }: { ctx: FormContext; sources: Source[]; initialSourceId?: string }) {
  const english = ctx.languages.find((l) => l.code === "en");
  const initialSource = sources.find((s) => s.id === initialSourceId);
  const defaultTarget = ctx.defaultLanguage === english?.id ? ctx.languages.find((l) => l.is_priority)?.id ?? "" : ctx.defaultLanguage;
  const common = useCommonState(ctx, { language_id: defaultTarget });
  const { submit, pending, errors, formError } = useSubmitContribution();
  const [sourceLang, setSourceLang] = useState(initialSource?.language_id ?? english?.id ?? "");
  const [sourceId, setSourceId] = useState<string | undefined>(initialSource?.id);
  const [sourceText, setSourceText] = useState(initialSource?.text ?? "");
  const [targetText, setTargetText] = useState("");
  const [domain, setDomain] = useState(initialSource?.domain ?? "general");
  const [notes, setNotes] = useState("");
  const promptPool = sources.filter((s) => s.language_id === sourceLang);

  function pickPrompt() {
    if (!promptPool.length) return;
    const s = promptPool[Math.floor(Math.random() * promptPool.length)];
    setSourceId(s.id);
    setSourceText(s.text);
    setDomain(s.domain);
  }

  function swap() {
    const t = sourceLang;
    setSourceLang(common.state.language_id);
    common.set("language_id", t);
    setSourceText(targetText);
    setTargetText(sourceText);
    setSourceId(undefined);
  }

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        submit(
          { type: "translation", ...toPayload(common.state), source_language_id: sourceLang, source_id: sourceId, source_text: sourceText, target_text: targetText, domain, notes },
          { successMessage: "Translation submitted for review.", onSuccess: () => { setTargetText(""); setNotes(""); setSourceId(undefined); setSourceText(""); } },
        );
      }}
    >
      {formError && <Alert tone="danger">{formError}</Alert>}
      <FormSection title="Translation pair">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto_1fr]">
          <div className="space-y-4">
            <Field label="Source language" htmlFor="source_lang" required>
              <Select id="source_lang" value={sourceLang} onChange={(e) => { setSourceLang(e.target.value); setSourceId(undefined); }}>
                {ctx.languages.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </Select>
            </Field>
            <Field label="Source text" htmlFor="source_text" required error={errors.source_text}>
              <Textarea id="source_text" value={sourceText} onChange={(e) => { setSourceText(e.target.value); setSourceId(undefined); }} rows={6} spellCheck={false} />
            </Field>
            {promptPool.length > 0 && (
              <Button type="button" variant="outline" size="sm" onClick={pickPrompt}><Shuffle /> Give me a sentence to translate</Button>
            )}
            {sourceId && <p className="text-xs text-forest-700">Translating an AfriLang prompt — reviewers can compare all translations of it.</p>}
          </div>
          <div className="flex items-center justify-center">
            <Button type="button" variant="ghost" size="icon" onClick={swap} aria-label="Swap languages"><ArrowRightLeft /></Button>
          </div>
          <div className="space-y-4">
            <Field label="Target language" htmlFor="language_id" required error={errors.language_id}>
              <Select id="language_id" value={common.state.language_id} onChange={(e) => common.set("language_id", e.target.value)}>
                {ctx.languages.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </Select>
            </Field>
            <Field label="Your translation" htmlFor="target_text" required error={errors.target_text}>
              <Textarea id="target_text" value={targetText} onChange={(e) => setTargetText(e.target.value)} rows={6} spellCheck={false} />
            </Field>
          </div>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Domain" htmlFor="domain">
            <Input id="domain" value={domain} onChange={(e) => setDomain(e.target.value)} list="domains" />
            <datalist id="domains">{["general", "everyday", "health", "education", "agriculture", "culture", "government", "technology"].map((d) => <option key={d} value={d} />)}</datalist>
          </Field>
          <Field label="Translator notes" htmlFor="notes" hint="Optional: alternatives, idioms, register">
            <Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </div>
      </FormSection>
      <PermissionsFieldset value={common.state.permissions} onChange={(p) => common.set("permissions", p)} />
      <div className="flex justify-end">
        <Button type="submit" size="lg" disabled={pending}>{pending ? "Submitting…" : "Submit translation"}</Button>
      </div>
    </form>
  );
}
