"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(120),
  email: z.string().trim().email("Please enter a valid email address").max(254),
  organisation: z.string().trim().max(200).optional().default(""),
  topic: z.enum(["general", "partnership", "research", "data_rights", "privacy", "press"]),
  message: z.string().trim().min(10, "Please write at least 10 characters").max(5000),
  website: z.string().max(0).optional(), // honeypot
});

export type ContactState = { ok?: boolean; error?: string; fieldErrors?: Record<string, string> };

export async function sendContact(_prev: ContactState, formData: FormData): Promise<ContactState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    parsed.error.issues.forEach((i) => (fieldErrors[String(i.path[0])] = i.message));
    if (fieldErrors.website) return { ok: true }; // silently drop bots
    return { error: "Please correct the highlighted fields.", fieldErrors };
  }
  if (!(await rateLimit("contact", Number(process.env.CONTACT_RATE_LIMIT_PER_HOUR ?? 5), 3600))) {
    return { error: "You've sent several messages recently. Please try again later." };
  }
  const { website: _hp, ...row } = parsed.data;
  void _hp;
  const supabase = await createClient();
  const { error } = await supabase.from("contact_messages").insert(row);
  if (error) return { error: "We couldn't send your message. Please try again." };
  return { ok: true };
}
