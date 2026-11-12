"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";

export type AuthState = { error?: string; message?: string; fieldErrors?: Record<string, string>; email?: string };

function safeNext(next: FormDataEntryValue | null, fallback = "/portal") {
  const n = typeof next === "string" ? next : "";
  return n.startsWith("/") && !n.startsWith("//") && !n.startsWith("/\\") ? n : fallback;
}

function fieldErrors(error: z.ZodError) {
  const out: Record<string, string> = {};
  error.issues.forEach((i) => (out[String(i.path[0])] ??= i.message));
  return out;
}

const password = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(72)
  .regex(/[A-Za-z]/, "Include at least one letter")
  .regex(/\d/, "Include at least one number");

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const pwd = String(formData.get("password") ?? "");
  if (!email || !pwd) return { error: "Enter your email and password.", email };
  if (!(await rateLimit("login", Number(process.env.LOGIN_RATE_LIMIT_PER_5MIN ?? 10), 300))) return { error: "Too many sign-in attempts. Please wait a few minutes.", email };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password: pwd });
  if (error) {
    if (/confirm/i.test(error.message)) {
      return { error: "Please verify your email address first. Check your inbox for the confirmation link.", email };
    }
    return { error: "Incorrect email or password.", email };
  }
  redirect(safeNext(formData.get("next")));
}

const registerSchema = z
  .object({
    display_name: z.string().trim().min(2, "Enter the name you'd like to be shown").max(120),
    email: z.string().trim().toLowerCase().email("Enter a valid email address"),
    password,
    confirm: z.string(),
    accept_terms: z.literal("true", { message: "You must accept the terms and privacy policy" }),
    adult: z.literal("true", { message: "Please confirm you are 18 or older" }),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Passwords do not match" });

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Please correct the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  if (!(await rateLimit("register", 5, 3600))) return { error: "Too many registrations from this network. Please try later." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${publicEnv.siteUrl}/auth/callback?next=/portal`,
      data: { display_name: parsed.data.display_name, accepted_terms: true, policy_version: "2026-11" },
    },
  });
  if (error) {
    if (/already registered|exists/i.test(error.message)) {
      return { error: "An account with this email already exists. Try signing in or resetting your password." };
    }
    if (/password/i.test(error.message)) return { error: error.message };
    return { error: "We couldn't create your account. Please try again." };
  }
  if (data.session) redirect("/portal?welcome=1"); // email confirmation disabled in this environment
  return { message: "Check your email to confirm your account. The link opens AfriLang Research and signs you in.", email: parsed.data.email };
}

export async function resendConfirmation(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { error: "Enter your email address." };
  if (!(await rateLimit("resend", 3, 3600))) return { error: "Please wait before requesting another email." };
  const supabase = await createClient();
  await supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo: `${publicEnv.siteUrl}/auth/callback?next=/portal` } });
  return { message: "If an unconfirmed account exists for that address, we've sent a new confirmation email.", email };
}

export async function requestPasswordReset(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!z.string().email().safeParse(email).success) return { error: "Enter a valid email address.", email };
  if (!(await rateLimit("reset", 5, 3600))) return { error: "Too many reset requests. Please try again later." };
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${publicEnv.siteUrl}/auth/callback?next=/reset-password` });
  // Same response whether or not the account exists (prevents account enumeration).
  return { message: "If an account exists for that email, a password reset link is on its way.", email };
}

export async function updatePassword(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = z
    .object({ password, confirm: z.string() })
    .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Passwords do not match" })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Please correct the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Your reset link has expired. Please request a new one." };
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: /different/i.test(error.message) ? "Choose a password different from your current one." : error.message };
  redirect("/portal?password=updated");
}
