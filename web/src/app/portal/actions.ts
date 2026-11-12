"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { kickProcessing } from "@/lib/processing";
import { contributionSchema, flattenErrors, permissionsSchema } from "@/lib/validation";
import { friendlyError } from "@/lib/utils";

export type ActionResult<T = undefined> = { ok: true; data?: T } | { ok: false; error: string; fieldErrors?: Record<string, string> };

export async function createContribution(input: unknown): Promise<ActionResult<{ id: string }>> {
  await requireUser();
  const parsed = contributionSchema.safeParse(input);
  if (!parsed.success) {
    if (process.env.NODE_ENV !== "production") console.warn("[createContribution] validation", flattenErrors(parsed.error));
    return { ok: false, error: "Please check the highlighted fields.", fieldErrors: flattenErrors(parsed.error) };
  }
  const payload: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.type === "document") {
    payload.title = parsed.data.doc_title;
  }
  delete payload.doc_title;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("submit_contribution", { p: payload as never });
  if (error || !data) return { ok: false, error: friendlyError(error) };

  if (parsed.data.type === "document" || parsed.data.type === "audio") void kickProcessing();
  revalidatePath("/portal");
  revalidatePath("/portal/contributions");
  return { ok: true, data: { id: data as string } };
}

export async function withdrawContribution(id: string): Promise<ActionResult> {
  await requireUser();
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("contributions")
    .update({ status: "withdrawn" }, { count: "exact" })
    .eq("id", z.string().uuid().parse(id));
  if (error || !count) return { ok: false, error: error ? friendlyError(error) : "Contribution not found." };
  revalidatePath(`/portal/contributions/${id}`);
  return { ok: true };
}

export async function submitDraft(id: string): Promise<ActionResult> {
  await requireUser();
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("contributions")
    .update({ status: "submitted" }, { count: "exact" })
    .eq("id", z.string().uuid().parse(id));
  if (error || !count) return { ok: false, error: error ? friendlyError(error) : "Contribution not found." };
  revalidatePath(`/portal/contributions/${id}`);
  return { ok: true };
}

export async function deleteDraft(id: string): Promise<ActionResult> {
  await requireUser();
  const supabase = await createClient();
  const { error, count } = await supabase.from("contributions").delete({ count: "exact" }).eq("id", z.string().uuid().parse(id)).eq("status", "draft");
  if (error || !count) return { ok: false, error: error ? friendlyError(error) : "Only drafts can be deleted." };
  revalidatePath("/portal/contributions");
  return { ok: true };
}

export async function resubmitContribution(id: string, body: string, note: string): Promise<ActionResult> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc("resubmit_contribution", {
    p_contribution_id: z.string().uuid().parse(id),
    p_body: body.slice(0, 200000),
    p_note: note.slice(0, 500),
  });
  if (error) return { ok: false, error: friendlyError(error) };
  revalidatePath(`/portal/contributions/${id}`);
  return { ok: true };
}

export async function updatePermissions(id: string, input: unknown): Promise<ActionResult> {
  await requireUser();
  const parsed = permissionsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Data collection permission must remain granted. To remove a contribution entirely, withdraw it." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("contribution_permissions")
    .update({
      allow_research: parsed.data.allow_research,
      allow_public_release: parsed.data.allow_public_release,
      allow_ai_training: parsed.data.allow_ai_training,
      allow_commercial: parsed.data.allow_commercial,
    })
    .eq("contribution_id", z.string().uuid().parse(id));
  if (error) return { ok: false, error: friendlyError(error) };
  revalidatePath(`/portal/contributions/${id}`);
  return { ok: true };
}
