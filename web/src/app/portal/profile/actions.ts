"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/utils";

export type ProfileState = { ok?: boolean; error?: string; fieldErrors?: Record<string, string> };

const profileSchema = z.object({
  display_name: z.string().trim().min(2, "At least 2 characters").max(120),
  public_handle: z
    .string()
    .trim()
    .toLowerCase()
    .transform((v) => v || null)
    .pipe(z.string().regex(/^[a-z0-9_]{3,32}$/, "3–32 lowercase letters, numbers or underscores").nullable()),
  bio: z.string().trim().max(1000),
  affiliation: z.string().trim().max(200),
  region: z.string().trim().max(120),
  show_in_recognition: z.boolean(),
});

export async function updateProfile(_prev: ProfileState, fd: FormData): Promise<ProfileState> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse({ ...Object.fromEntries(fd), show_in_recognition: fd.get("show_in_recognition") === "true" });
  if (!parsed.success) {
    const fe: Record<string, string> = {};
    parsed.error.issues.forEach((i) => (fe[String(i.path[0])] ??= i.message));
    return { error: "Please correct the highlighted fields.", fieldErrors: fe };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("users").update(parsed.data).eq("id", user.id);
  if (error) return { error: error.code === "23505" ? "That public handle is taken." : friendlyError(error) };
  revalidatePath("/portal", "layout");
  return { ok: true };
}

export async function addLanguage(languageId: string, proficiency: string, varietyId: string | null) {
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("user_languages").upsert(
    {
      user_id: user.id,
      language_id: z.string().uuid().parse(languageId),
      proficiency: z.enum(["native", "fluent", "intermediate", "learner"]).parse(proficiency),
      variety_id: varietyId ? z.string().uuid().parse(varietyId) : null,
    },
    { onConflict: "user_id,language_id" },
  );
  if (error) return { ok: false, error: friendlyError(error) };
  revalidatePath("/portal/profile");
  return { ok: true };
}

export async function removeLanguage(id: string) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("user_languages").delete().eq("id", z.string().uuid().parse(id));
  if (error) return { ok: false, error: friendlyError(error) };
  revalidatePath("/portal/profile");
  return { ok: true };
}

const CONSENT_TYPES = ["research_use", "public_publication", "ai_training", "commercial_use"] as const;

/** Records default permission preferences as timestamped consent records (append-only history). */
export async function saveDefaultConsents(values: Record<(typeof CONSENT_TYPES)[number], boolean>) {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: existing } = await supabase.from("consents").select("consent_type, granted, created_at").eq("user_id", user.id).order("created_at", { ascending: false });
  const latest = new Map<string, boolean>();
  (existing ?? []).forEach((c) => !latest.has(c.consent_type) && latest.set(c.consent_type, c.granted));
  const rows = CONSENT_TYPES.filter((t) => latest.get(t) !== Boolean(values[t])).map((t) => ({
    user_id: user.id,
    consent_type: t,
    granted: Boolean(values[t]),
    policy_version: "2026-11",
  }));
  if (!rows.length) return { ok: true };
  const { error } = await supabase.from("consents").insert(rows);
  if (error) return { ok: false, error: friendlyError(error) };
  revalidatePath("/portal/profile");
  return { ok: true };
}
