"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { kickProcessing } from "@/lib/processing";
import { ALL_ROLES } from "@/lib/constants";
import { friendlyError } from "@/lib/utils";

type R = { ok: boolean; error?: string };
const uuid = z.string().uuid();
const fail = (e: { message?: string; code?: string } | null): R => ({ ok: false, error: friendlyError(e) });
const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

// ---- Users & roles --------------------------------------------------------
export async function setRole(userId: string, role: string, grant: boolean): Promise<R> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_user_role", { p_user_id: uuid.parse(userId), p_role: z.enum(ALL_ROLES as [string, ...string[]]).parse(role) as never, p_grant: grant });
  if (error) return fail(error);
  revalidatePath("/admin/users");
  return { ok: true };
}

export async function setActive(userId: string, active: boolean): Promise<R> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_user_active", { p_user_id: uuid.parse(userId), p_active: active });
  if (error) return fail(error);
  revalidatePath("/admin/users");
  return { ok: true };
}

export async function decideAccess(id: string, status: "approved" | "rejected" | "revoked", note: string, days = 365): Promise<R> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.rpc("decide_access_request", { p_request_id: uuid.parse(id), p_status: status, p_note: note.slice(0, 2000), p_days: days });
  if (error) return fail(error);
  revalidatePath("/admin/access-requests");
  return { ok: true };
}

// ---- Languages ------------------------------------------------------------
export async function updateLanguage(id: string, patch: { is_active?: boolean; is_priority?: boolean; description?: string }): Promise<R> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("languages").update(patch).eq("id", uuid.parse(id));
  if (error) return fail(error);
  revalidatePath("/admin/languages");
  revalidatePath("/", "layout");
  return { ok: true };
}

const langSchema = z.object({
  code: z.string().regex(/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/, "Use a BCP-47 code, e.g. sw or nso"),
  iso639_3: z.string().regex(/^[a-z]{3}$/, "ISO 639-3 is three lowercase letters"),
  name: z.string().min(2).max(80),
  native_name: z.string().min(1).max(80),
  family: z.string().max(120),
  region: z.string().max(80),
});

export async function createLanguage(_: R, fd: FormData): Promise<R> {
  await requireAdmin();
  const p = langSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { ok: false, error: p.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.from("languages").insert({ ...p.data, is_active: false, sort_order: 200 });
  if (error) return fail(error);
  revalidatePath("/admin/languages");
  return { ok: true };
}

export async function addVariety(_: R, fd: FormData): Promise<R> {
  await requireAdmin();
  const p = z.object({ language_id: uuid, code: z.string().min(2).max(30), name: z.string().min(2).max(120), region: z.string().max(120) }).safeParse(Object.fromEntries(fd));
  if (!p.success) return { ok: false, error: "Language, code and name are required." };
  const supabase = await createClient();
  const { error } = await supabase.from("language_varieties").insert(p.data);
  if (error) return fail(error);
  revalidatePath("/admin/languages");
  return { ok: true };
}

export async function toggleVariety(id: string, active: boolean): Promise<R> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("language_varieties").update({ is_active: active }).eq("id", uuid.parse(id));
  if (error) return fail(error);
  revalidatePath("/admin/languages");
  return { ok: true };
}

// ---- Categories & tasks ----------------------------------------------------
export async function createCategory(_: R, fd: FormData): Promise<R> {
  await requireAdmin();
  const applies = fd.getAll("applies_to").map(String);
  const p = z.object({ key: z.string().regex(/^[a-z0-9_]+$/, "Key: lowercase letters, numbers, underscores"), name: z.string().min(2).max(80), description: z.string().max(300) }).safeParse(Object.fromEntries(fd));
  if (!p.success) return { ok: false, error: p.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.from("content_categories").insert({ ...p.data, applies_to: applies as never });
  if (error) return fail(error);
  revalidatePath("/admin/categories");
  return { ok: true };
}

export async function toggleCategory(id: string, active: boolean): Promise<R> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("content_categories").update({ is_active: active }).eq("id", uuid.parse(id));
  if (error) return fail(error);
  revalidatePath("/admin/categories");
  return { ok: true };
}

export async function createSource(_: R, fd: FormData): Promise<R> {
  const user = await requireAdmin();
  const lines = str(fd, "text").split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 200);
  const languageId = uuid.safeParse(str(fd, "language_id"));
  if (!lines.length || !languageId.success) return { ok: false, error: "Choose a language and enter at least one sentence." };
  const supabase = await createClient();
  const { error } = await supabase.from("translation_sources").insert(lines.map((text) => ({ text: text.slice(0, 2000), language_id: languageId.data, domain: str(fd, "domain") || "general", created_by: user.id })));
  if (error) return fail(error);
  revalidatePath("/admin/categories");
  return { ok: true };
}

export async function toggleSource(id: string, active: boolean): Promise<R> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("translation_sources").update({ is_active: active }).eq("id", uuid.parse(id));
  if (error) return fail(error);
  revalidatePath("/admin/categories");
  return { ok: true };
}

// ---- Datasets & releases ---------------------------------------------------
const datasetSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]{3,80}$/, "Slug: lowercase letters, numbers and hyphens"),
  name: z.string().min(3).max(120),
  summary: z.string().max(500),
  dataset_type: z.enum(["monolingual_text", "parallel_text", "conversation", "instruction", "cultural", "speech"]),
  access_level: z.enum(["public", "registered", "restricted"]),
  license_id: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
  intended_use: z.string().max(2000),
  limitations: z.string().max(2000),
});

export async function createDataset(_: R, fd: FormData): Promise<R> {
  const user = await requireAdmin();
  const p = datasetSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { ok: false, error: p.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.from("datasets").insert({ ...p.data, is_benchmark: fd.get("is_benchmark") === "true", created_by: user.id });
  if (error) return fail(error);
  revalidatePath("/admin/datasets");
  return { ok: true };
}

export async function updateDataset(id: string, patch: { access_level?: "public" | "registered" | "restricted"; is_active?: boolean; description?: string; processing_methodology?: string; intended_use?: string; limitations?: string }): Promise<R> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("datasets").update(patch).eq("id", uuid.parse(id));
  if (error) return fail(error);
  revalidatePath(`/admin/datasets/${id}`);
  return { ok: true };
}

const releaseSchema = z.object({
  dataset_id: uuid,
  version: z.string().regex(/^\d+\.\d+\.\d+$/, "Version must look like 1.0.0"),
  language_codes: z.array(z.string()).min(1, "Choose at least one language"),
  collection_start: z.string().optional(),
  collection_end: z.string().optional(),
  train: z.coerce.number().min(0.5).max(0.98),
  validation: z.coerce.number().min(0).max(0.3),
  seed: z.coerce.number().int().min(0).max(2 ** 31),
  notes: z.string().max(2000),
});

export async function createRelease(_: R, fd: FormData): Promise<R> {
  const user = await requireAdmin();
  const p = releaseSchema.safeParse({ ...Object.fromEntries(fd), language_codes: fd.getAll("language_codes").map(String) });
  if (!p.success) return { ok: false, error: p.error.issues[0].message };
  const { train, validation, seed, collection_start, collection_end, ...rest } = p.data;
  const test = Math.round((1 - train - validation) * 1000) / 1000;
  if (test <= 0) return { ok: false, error: "Train + validation must be less than 1 so a test split remains." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("dataset_releases")
    .insert({
      ...rest,
      collection_start: collection_start || null,
      collection_end: collection_end || null,
      split_config: { train, validation, test, seed },
      created_by: user.id,
      build_status: "queued",
    })
    .select("id")
    .single();
  if (error || !data) return fail(error);
  const { error: jobErr } = await supabase.from("processing_jobs").insert({ job_type: "dataset_build", entity_id: data.id, created_by: user.id });
  if (jobErr) return fail(jobErr);
  void kickProcessing();
  revalidatePath(`/admin/datasets/${p.data.dataset_id}`);
  return { ok: true };
}

export async function rebuildRelease(releaseId: string): Promise<R> {
  const user = await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("dataset_releases").update({ build_status: "queued", build_error: null }).eq("id", uuid.parse(releaseId));
  if (error) return fail(error);
  await supabase.from("processing_jobs").insert({ job_type: "dataset_build", entity_id: releaseId, created_by: user.id });
  void kickProcessing();
  revalidatePath("/admin/datasets", "layout");
  return { ok: true };
}

export async function requestExports(releaseId: string, formats: string[]): Promise<R> {
  const user = await requireAdmin();
  const fm = z.array(z.enum(["csv", "json", "jsonl", "txt", "parquet", "wav"])).min(1).safeParse(formats);
  if (!fm.success) return { ok: false, error: "Choose at least one format." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("dataset_exports")
    .upsert(fm.data.map((format) => ({ release_id: uuid.parse(releaseId), format, status: "queued" as const, requested_by: user.id, error: null })), { onConflict: "release_id,format" })
    .select("id");
  if (error) return fail(error);
  const { error: jobErr } = await supabase.from("processing_jobs").insert((data ?? []).map((e) => ({ job_type: "dataset_export" as const, entity_id: e.id, created_by: user.id })));
  if (jobErr) return fail(jobErr);
  void kickProcessing();
  revalidatePath("/admin/datasets", "layout");
  return { ok: true };
}

export async function submitReleaseForApproval(releaseId: string): Promise<R> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("dataset_releases").update({ status: "pending_approval" }).eq("id", uuid.parse(releaseId)).eq("build_status", "completed");
  if (error) return fail(error);
  revalidatePath("/admin/datasets", "layout");
  return { ok: true };
}

export async function approveRelease(releaseId: string): Promise<R> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.rpc("approve_release", { p_release_id: uuid.parse(releaseId), p_publish: true });
  if (error) return fail(error);
  revalidatePath("/admin/datasets", "layout");
  revalidatePath("/datasets", "layout");
  return { ok: true };
}

export async function retireRelease(releaseId: string): Promise<R> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.rpc("retire_release", { p_release_id: uuid.parse(releaseId) });
  if (error) return fail(error);
  revalidatePath("/admin/datasets", "layout");
  revalidatePath("/datasets", "layout");
  return { ok: true };
}

// ---- Processing ----------------------------------------------------------
export async function retryJob(id: string): Promise<R> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("processing_jobs").update({ status: "queued", attempts: 0, error: null, locked_at: null }).eq("id", uuid.parse(id));
  if (error) return fail(error);
  void kickProcessing();
  revalidatePath("/admin/jobs");
  return { ok: true };
}

export async function queueJob(type: "document_extract" | "audio_analyze" | "audio_transcribe", entityId: string): Promise<R> {
  const user = await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("processing_jobs").insert({ job_type: type, entity_id: uuid.parse(entityId), created_by: user.id });
  if (error) return fail(error);
  void kickProcessing();
  revalidatePath("/admin/jobs");
  revalidatePath("/admin/documents");
  revalidatePath("/admin/audio");
  return { ok: true };
}

// ---- Messages & settings ---------------------------------------------------
export async function setMessageStatus(id: string, status: "new" | "in_progress" | "closed"): Promise<R> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("contact_messages").update({ status }).eq("id", uuid.parse(id));
  if (error) return fail(error);
  revalidatePath("/admin/messages");
  return { ok: true };
}

export async function updateSetting(key: string, raw: string): Promise<R> {
  const user = await requireAdmin();
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return { ok: false, error: "Value must be valid JSON (e.g. true, 120 or \"text\")." };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("system_settings").update({ value: value as never, updated_by: user.id, updated_at: new Date().toISOString() }).eq("key", key);
  if (error) return fail(error);
  revalidatePath("/admin/settings");
  return { ok: true };
}

// ---- AI Lab ----------------------------------------------------------------
export async function createModel(_: R, fd: FormData): Promise<R> {
  const user = await requireAdmin();
  const p = z.object({ slug: z.string().regex(/^[a-z0-9-]{3,80}$/), name: z.string().min(2).max(120), base_model: z.string().max(200), architecture: z.string().max(120), hf_repo: z.string().max(200), description: z.string().max(2000) }).safeParse(Object.fromEntries(fd));
  if (!p.success) return { ok: false, error: "Slug (lowercase-hyphenated) and name are required." };
  const supabase = await createClient();
  const { error } = await supabase.from("models").insert({ ...p.data, language_codes: fd.getAll("language_codes").map(String), created_by: user.id });
  if (error) return fail(error);
  revalidatePath("/admin/ai-lab");
  return { ok: true };
}

export async function createRun(_: R, fd: FormData): Promise<R> {
  const user = await requireAdmin();
  let config: unknown = {};
  try {
    config = JSON.parse(str(fd, "config") || "{}");
  } catch {
    return { ok: false, error: "Config must be valid JSON." };
  }
  const p = z.object({ model_id: uuid, method: z.enum(["full", "lora", "qlora", "tokenizer", "other"]), dataset_release_id: z.string().uuid().optional().or(z.literal("").transform(() => undefined)), compute_notes: z.string().max(1000) }).safeParse(Object.fromEntries(fd));
  if (!p.success) return { ok: false, error: "Choose a model and method." };
  const supabase = await createClient();
  const { error } = await supabase.from("training_runs").insert({ ...p.data, config: config as never, created_by: user.id });
  if (error) return fail(error);
  revalidatePath("/admin/ai-lab");
  return { ok: true };
}

export async function createEvaluation(_: R, fd: FormData): Promise<R> {
  const user = await requireAdmin();
  let metrics: unknown = {};
  try {
    metrics = JSON.parse(str(fd, "metrics") || "{}");
  } catch {
    return { ok: false, error: "Metrics must be valid JSON, e.g. {\"chrF\": 41.2}." };
  }
  const p = z.object({ model_id: uuid, benchmark_name: z.string().min(2).max(120), language_code: z.string().min(2).max(12), notes: z.string().max(1000) }).safeParse(Object.fromEntries(fd));
  if (!p.success) return { ok: false, error: "Model, benchmark and language are required." };
  const supabase = await createClient();
  const { error } = await supabase.from("evaluations").insert({ ...p.data, metrics: metrics as never, created_by: user.id });
  if (error) return fail(error);
  revalidatePath("/admin/ai-lab");
  return { ok: true };
}
