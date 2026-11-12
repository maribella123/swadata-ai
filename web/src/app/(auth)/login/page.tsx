import Link from "next/link";
import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

const ERRORS: Record<string, string> = {
  account_disabled: "This account has been deactivated. Please contact us if you think this is a mistake.",
  link_invalid: "That link is invalid or has expired. Please try again.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string; verified?: string }> }) {
  const sp = await searchParams;
  return (
    <>
      <h1 className="font-display text-4xl font-semibold">Welcome back</h1>
      <p className="mt-2 text-slate-600">Sign in to continue contributing.</p>
      <div className="mt-8">
        <LoginForm next={sp.next} initialError={sp.error ? ERRORS[sp.error] ?? "Please sign in again." : undefined} verified={sp.verified === "1"} />
      </div>
      <p className="mt-8 text-sm text-slate-600">
        New to SwaData AI? <Link href="/register" className="font-semibold text-forest-700 hover:underline">Create an account</Link>
      </p>
    </>
  );
}
