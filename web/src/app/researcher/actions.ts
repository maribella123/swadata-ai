"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireResearcher } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/utils";

const schema = z.object({
  dataset_id: z.string().uuid(),
  institution: z.string().trim().min(2, "Enter your institution").max(200),
  purpose: z.string().trim().min(20, "Describe your purpose in at least 20 characters").max(4000),
  ethics_reference: z.string().trim().max(200).optional().default(""),
});

export async function requestAccess(_: { ok: boolean; error?: string }, fd: FormData) {
  const user = await requireResearcher();
  const p = schema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { ok: false, error: p.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.from("dataset_access_requests").insert({ ...p.data, requester_id: user.id });
  if (error) return { ok: false, error: error.code === "23505" ? "You already have a pending request for this dataset." : friendlyError(error) };
  revalidatePath("/researcher", "layout");
  return { ok: true };
}
