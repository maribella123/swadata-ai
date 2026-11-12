"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireReviewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/utils";

type Result = { ok: boolean; error?: string };

export async function claimReview(id: string): Promise<Result> {
  await requireReviewer();
  const supabase = await createClient();
  const { error } = await supabase.rpc("claim_review", { p_contribution_id: z.string().uuid().parse(id) });
  if (error) return { ok: false, error: friendlyError(error) };
  revalidatePath("/review");
  return { ok: true };
}

const reviewSchema = z.object({
  id: z.string().uuid(),
  decision: z.enum(["approve", "reject", "request_changes", "comment"]),
  comment: z.string().max(5000).default(""),
  scores: z.record(z.string(), z.number().int().min(1).max(5)).default({}),
  corrected_text: z.string().max(200000).optional(),
  sensitivity: z.enum(["public", "community", "restricted"]).optional(),
});

export async function submitReview(input: unknown): Promise<Result> {
  await requireReviewer();
  const p = reviewSchema.safeParse(input);
  if (!p.success) return { ok: false, error: "Invalid review data." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_review", {
    p_contribution_id: p.data.id,
    p_decision: p.data.decision,
    p_comment: p.data.comment,
    p_scores: p.data.scores,
    p_corrected_text: p.data.corrected_text ?? undefined,
    p_sensitivity: p.data.sensitivity ?? undefined,
  });
  if (error) return { ok: false, error: friendlyError(error) };
  revalidatePath("/review");
  revalidatePath(`/review/${p.data.id}`);
  return { ok: true };
}

export async function assignReviewer(id: string, reviewerId: string): Promise<Result> {
  await requireReviewer();
  const supabase = await createClient();
  const { error } = await supabase.rpc("assign_reviewer", { p_contribution_id: z.string().uuid().parse(id), p_reviewer_id: z.string().uuid().parse(reviewerId) });
  if (error) return { ok: false, error: friendlyError(error) };
  revalidatePath(`/review/${id}`);
  return { ok: true };
}

export async function reviewExtractions(ids: string[], status: "approved" | "rejected" | "pending"): Promise<Result & { count?: number }> {
  await requireReviewer();
  const parsed = z.array(z.string().uuid()).min(1).max(500).safeParse(ids);
  if (!parsed.success) return { ok: false, error: "Select at least one segment." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("review_extractions", { p_ids: parsed.data, p_status: status });
  if (error) return { ok: false, error: friendlyError(error) };
  revalidatePath("/review/documents");
  return { ok: true, count: Number(data) };
}

const rightsSchema = z.object({
  documentId: z.string().uuid(),
  status: z.enum(["unverified", "pending_verification", "verified", "rejected"]),
  notes: z.string().trim().min(5, "Record the evidence for this decision").max(2000),
  copyright: z.enum(["own_work", "public_domain", "open_licence", "copyrighted_with_permission", "copyrighted_no_permission", "unknown"]).optional(),
  aiTraining: z.boolean().optional(),
});

export async function verifyRights(input: unknown): Promise<Result> {
  await requireReviewer();
  const p = rightsSchema.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Invalid input" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("verify_document_rights", {
    p_document_id: p.data.documentId,
    p_status: p.data.status,
    p_notes: p.data.notes,
    p_copyright: p.data.copyright,
    p_ai_training: p.data.aiTraining,
  });
  if (error) return { ok: false, error: friendlyError(error) };
  revalidatePath("/review/documents");
  return { ok: true };
}
