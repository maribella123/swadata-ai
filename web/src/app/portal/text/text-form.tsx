"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/input";
import { CharCount, FormSection, LanguageFields, PermissionsFieldset, SourceFields, toPayload, useCommonState } from "@/components/contribute/common-fields";
import { useSubmitContribution } from "@/components/contribute/use-submit";
import type { FormContext } from "@/lib/portal-data";

export function TextForm({ ctx }: { ctx: FormContext }) {
  const common = useCommonState(ctx);
  const { submit, pending, errors, formError } = useSubmitContribution();
  const [body, setBody] = useState("");
  const [context, setContext] = useState("");
  const [title, setTitle] = useState("");

  function onSubmit(draft: boolean) {
    submit(
      { type: "text", ...toPayload(common.state), title, body, context, draft },
      {
        successMessage: draft ? "Draft saved." : "Text submitted for review. Thank you!",
        onSuccess: () => {
          setBody("");
          setContext("");
          setTitle("");
        },
      },
    );
  }

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(false);
      }}
    >
      {formError && <Alert tone="danger">{formError}</Alert>}
      <FormSection title="Language" description="Choose the language and, if you know it, the variety you write in.">
        <LanguageFields ctx={ctx} state={common.state} set={common.set} errors={errors} />
      </FormSection>
      <FormSection title="Your text" description="Write naturally. Please don't translate with machine tools — we need authentic human language.">
        <Field label="Title" htmlFor="title" hint="Optional — helps you find it later">
          <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={300} className="h-10 w-full rounded-lg border border-line px-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-3 focus:ring-emerald-100" />
        </Field>
        <Field label="Text" htmlFor="body" required error={errors.body}>
          <Textarea id="body" lang="" value={body} onChange={(e) => setBody(e.target.value)} rows={8} required aria-invalid={!!errors.body} spellCheck={false} />
        </Field>
        <div className="-mt-3 flex justify-end"><CharCount value={body} max={200000} /></div>
        <Field label="Context" htmlFor="context" hint="Optional: where or how this is used, the meaning, or the audience">
          <Textarea id="context" value={context} onChange={(e) => setContext(e.target.value)} rows={3} />
        </Field>
      </FormSection>
      <FormSection title="Source">
        <SourceFields ctx={ctx} state={common.state} set={common.set} />
      </FormSection>
      <PermissionsFieldset value={common.state.permissions} onChange={(p) => common.set("permissions", p)} error={errors["permissions.allow_collection"]} />
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" disabled={pending} onClick={() => onSubmit(true)}>Save as draft</Button>
        <Button type="submit" size="lg" disabled={pending} aria-busy={pending}>{pending ? "Submitting…" : "Submit for review"}</Button>
      </div>
    </form>
  );
}
