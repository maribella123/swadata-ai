"use client";

import { useMemo, useState } from "react";
import { Info, ShieldCheck } from "lucide-react";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/input";
import { SENSITIVITY_OPTIONS, SOURCE_TYPES } from "@/lib/constants";
import type { FormContext } from "@/lib/portal-data";
import { cn } from "@/lib/utils";

export type Permissions = {
  allow_collection: boolean;
  allow_research: boolean;
  allow_public_release: boolean;
  allow_ai_training: boolean;
  allow_commercial: boolean;
  rights_holder: string;
};

export type CommonState = {
  language_id: string;
  variety_id: string;
  category_id: string;
  source_type: string;
  is_original: boolean;
  source_reference: string;
  license_id: string;
  sensitivity: "public" | "community" | "restricted";
  permissions: Permissions;
};

export function useCommonState(ctx: FormContext, overrides: Partial<CommonState> = {}) {
  const initial = useMemo<CommonState>(
    () => ({
      language_id: ctx.defaultLanguage,
      variety_id: ctx.defaultVariety ?? "",
      category_id: "",
      source_type: "original",
      is_original: true,
      source_reference: "",
      license_id: "",
      sensitivity: "public",
      permissions: { allow_collection: true, rights_holder: "", ...ctx.defaultPermissions },
      ...overrides,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const [state, setState] = useState<CommonState>(initial);
  const set = <K extends keyof CommonState>(k: K, v: CommonState[K]) => setState((s) => ({ ...s, [k]: v }));
  const reset = () => setState((s) => ({ ...initial, language_id: s.language_id, variety_id: s.variety_id, permissions: s.permissions }));
  return { state, set, setState, reset };
}

export function toPayload(c: CommonState) {
  return {
    language_id: c.language_id,
    variety_id: c.variety_id || undefined,
    category_id: c.category_id || undefined,
    source_type: c.source_type,
    is_original: c.is_original,
    source_reference: c.source_reference,
    license_id: c.license_id || undefined,
    sensitivity: c.sensitivity,
    permissions: { ...c.permissions, allow_collection: true as const },
  };
}

export function LanguageFields({
  ctx,
  state,
  set,
  errors,
  label = "Language",
  showCategory = true,
}: {
  ctx: FormContext;
  state: CommonState;
  set: <K extends keyof CommonState>(k: K, v: CommonState[K]) => void;
  errors: Record<string, string>;
  label?: string;
  showCategory?: boolean;
}) {
  const varieties = ctx.varieties.filter((v) => v.language_id === state.language_id);
  return (
    <div className={cn("grid gap-5", showCategory ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
      <Field label={label} htmlFor="language_id" required error={errors.language_id}>
        <Select
          id="language_id"
          value={state.language_id}
          onChange={(e) => {
            set("language_id", e.target.value);
            set("variety_id", "");
          }}
          required
        >
          <option value="" disabled>Choose a language</option>
          {ctx.languages.map((l) => (
            <option key={l.id} value={l.id}>{l.name}{l.native_name !== l.name ? ` (${l.native_name})` : ""}</option>
          ))}
        </Select>
      </Field>
      <Field label="Language variety" htmlFor="variety_id" hint={varieties.length ? "Optional" : "No varieties recorded yet"}>
        <Select id="variety_id" value={state.variety_id} onChange={(e) => set("variety_id", e.target.value)} disabled={!varieties.length}>
          <option value="">Not specified</option>
          {varieties.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
        </Select>
      </Field>
      {showCategory && (
        <Field label="Content category" htmlFor="category_id" hint="Optional">
          <Select id="category_id" value={state.category_id} onChange={(e) => set("category_id", e.target.value)}>
            <option value="">Choose a category</option>
            {ctx.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
      )}
    </div>
  );
}

export function SourceFields({
  ctx,
  state,
  set,
}: {
  ctx: FormContext;
  state: CommonState;
  set: <K extends keyof CommonState>(k: K, v: CommonState[K]) => void;
}) {
  const published = state.source_type === "published" || state.source_type === "archive" || !state.is_original;
  return (
    <fieldset className="space-y-4">
      <legend className="text-sm font-bold text-navy-900">Source & provenance</legend>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Source type" htmlFor="source_type">
          <Select
            id="source_type"
            value={state.source_type}
            onChange={(e) => {
              set("source_type", e.target.value);
              set("is_original", ["original", "oral", "community"].includes(e.target.value));
            }}
          >
            {SOURCE_TYPES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </Select>
        </Field>
        <Field label="Original or previously published?" htmlFor="is_original">
          <Select id="is_original" value={state.is_original ? "original" : "published"} onChange={(e) => set("is_original", e.target.value === "original")}>
            <option value="original">Original — not previously published</option>
            <option value="published">Previously published material</option>
          </Select>
        </Field>
      </div>
      {published && (
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Source reference" htmlFor="source_reference" hint="Title, author, publisher, year or URL">
            <Input id="source_reference" value={state.source_reference} onChange={(e) => set("source_reference", e.target.value)} />
          </Field>
          <Field label="Licence" htmlFor="license_id" hint="If the source carries a licence">
            <Select id="license_id" value={state.license_id} onChange={(e) => set("license_id", e.target.value)}>
              <option value="">Unknown / not specified</option>
              {ctx.licences.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </Select>
          </Field>
        </div>
      )}
    </fieldset>
  );
}

export function SensitivityField({ state, set }: { state: CommonState; set: <K extends keyof CommonState>(k: K, v: CommonState[K]) => void }) {
  return (
    <Field label="Cultural sensitivity" htmlFor="sensitivity" hint="Restricted items are only visible to you, senior linguists and administrators, and are never released in datasets.">
      <Select id="sensitivity" value={state.sensitivity} onChange={(e) => set("sensitivity", e.target.value as CommonState["sensitivity"])}>
        {SENSITIVITY_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
      </Select>
    </Field>
  );
}

export function PermissionsFieldset({
  value,
  onChange,
  error,
  showRightsHolder = false,
}: {
  value: Permissions;
  onChange: (p: Permissions) => void;
  error?: string;
  showRightsHolder?: boolean;
}) {
  const toggle = (k: keyof Permissions) => (e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...value, [k]: e.target.checked });
  return (
    <fieldset className="rounded-2xl border border-line bg-ivory/60 p-4 sm:p-5">
      <legend className="flex items-center gap-2 px-1 text-sm font-bold text-navy-900">
        <ShieldCheck className="size-4 text-forest-700" /> Permissions for this contribution
      </legend>
      <p className="mb-3 mt-1 text-xs text-slate-600">
        Each purpose is a separate choice. You can change these later from &quot;My contributions&quot;. Datasets only include
        contributions that allow both research use and AI training.
      </p>
      <div className="grid gap-1 sm:grid-cols-2">
        <Checkbox id="perm_collection" label="Data collection (required)" description="Store and review this contribution on AfriLang Datasets." checked disabled />
        <Checkbox id="perm_research" label="Research use" description="Include in datasets for approved researchers." checked={value.allow_research} onChange={toggle("allow_research")} />
        <Checkbox id="perm_ai" label="AI model training" description="Use to train or fine-tune language models." checked={value.allow_ai_training} onChange={toggle("allow_ai_training")} />
        <Checkbox id="perm_public" label="Public dataset publication" description="Include in datasets anyone can download." checked={value.allow_public_release} onChange={toggle("allow_public_release")} />
        <Checkbox id="perm_commercial" label="Commercial AI applications" description="Allow use in commercial products and services." checked={value.allow_commercial} onChange={toggle("allow_commercial")} />
      </div>
      {showRightsHolder && (
        <div className="mt-3">
          <Field label="Rights holder" htmlFor="rights_holder" hint="Who owns the rights, if not you">
            <Input id="rights_holder" value={value.rights_holder} onChange={(e) => onChange({ ...value, rights_holder: e.target.value })} />
          </Field>
        </div>
      )}
      {error && <p className="mt-2 text-xs font-medium text-danger">{error}</p>}
      <p className="mt-3 flex items-start gap-2 text-xs text-slate-500">
        <Info className="mt-0.5 size-3.5 shrink-0" /> By submitting, you confirm you have the right to share this material and it does not contain other people&apos;s personal information.
      </p>
    </fieldset>
  );
}

export function FormSection({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[var(--radius-card)] border border-line bg-white p-5 shadow-[var(--shadow-soft)] sm:p-6">
      <h2 className="text-base font-bold text-navy-900">{title}</h2>
      {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  );
}

export function CharCount({ value, max }: { value: string; max: number }) {
  const words = value.trim() ? value.trim().split(/\s+/).length : 0;
  return (
    <span className={cn("text-xs tabular-nums", value.length > max ? "text-danger" : "text-slate-400")}>
      {words} words · {value.length.toLocaleString()} / {max.toLocaleString()} characters
    </span>
  );
}

export { Textarea };
