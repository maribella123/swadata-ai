"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { FormSection, LanguageFields, PermissionsFieldset, SensitivityField, SourceFields, toPayload, useCommonState } from "@/components/contribute/common-fields";
import { useSubmitContribution } from "@/components/contribute/use-submit";
import { CULTURAL_KINDS } from "@/lib/constants";
import type { FormContext } from "@/lib/portal-data";

const EMPTY = { kind: "proverb", original_expression: "", meaning: "", literal_translation: "", usage_context: "", region_origin: "", community_origin: "", access_notes: "" };

export function CulturalForm({ ctx }: { ctx: FormContext }) {
  const common = useCommonState(ctx, { source_type: "oral" });
  const { submit, pending, errors, formError } = useSubmitContribution();
  const [f, setF] = useState(EMPTY);
  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF((s) => ({ ...s, [k]: e.target.value }));
  const long = ["folklore", "traditional_story", "oral_history"].includes(f.kind);

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        submit({ type: "cultural", ...toPayload(common.state), ...f }, { successMessage: "Cultural knowledge submitted for review.", onSuccess: () => setF({ ...EMPTY, kind: f.kind }) });
      }}
    >
      {formError && <Alert tone="danger">{formError}</Alert>}
      <FormSection title="Language and type">
        <LanguageFields ctx={ctx} state={common.state} set={common.set} errors={errors} showCategory={false} />
        <Field label="Type of knowledge" htmlFor="kind" required>
          <Select id="kind" value={f.kind} onChange={set("kind")}>{CULTURAL_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}</Select>
        </Field>
      </FormSection>
      <FormSection title="The expression" description="Write it exactly as it is said in the language.">
        <Field label={long ? "Story or account" : "Original expression"} htmlFor="original_expression" required error={errors.original_expression}>
          <Textarea id="original_expression" value={f.original_expression} onChange={set("original_expression")} rows={long ? 10 : 3} spellCheck={false} />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Meaning" htmlFor="meaning" hint="What it means or teaches">
            <Textarea id="meaning" value={f.meaning} onChange={set("meaning")} rows={3} />
          </Field>
          <Field label="Literal translation" htmlFor="literal_translation" hint="Word-for-word, in English">
            <Textarea id="literal_translation" value={f.literal_translation} onChange={set("literal_translation")} rows={3} />
          </Field>
        </div>
        <Field label="Context of use" htmlFor="usage_context" hint="When, by whom and in what situations it is used">
          <Textarea id="usage_context" value={f.usage_context} onChange={set("usage_context")} rows={3} />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Region of origin" htmlFor="region_origin" hint="Optional, where appropriate">
            <Input id="region_origin" value={f.region_origin} onChange={set("region_origin")} />
          </Field>
          <Field label="Community of origin" htmlFor="community_origin" hint="Optional, where appropriate">
            <Input id="community_origin" value={f.community_origin} onChange={set("community_origin")} />
          </Field>
        </div>
      </FormSection>
      <FormSection title="Sensitivity and source">
        <SensitivityField state={common.state} set={common.set} />
        {common.state.sensitivity !== "public" && (
          <Field label="Access notes" htmlFor="access_notes" hint="Who should or shouldn't access this, and why">
            <Textarea id="access_notes" value={f.access_notes} onChange={set("access_notes")} rows={2} />
          </Field>
        )}
        <SourceFields ctx={ctx} state={common.state} set={common.set} />
      </FormSection>
      <PermissionsFieldset value={common.state.permissions} onChange={(p) => common.set("permissions", p)} />
      <div className="flex justify-end"><Button type="submit" size="lg" disabled={pending}>{pending ? "Submitting…" : "Submit for review"}</Button></div>
    </form>
  );
}
