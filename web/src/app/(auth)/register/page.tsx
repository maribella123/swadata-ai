import Link from "next/link";
import type { Metadata } from "next";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Create an account" };

export default function RegisterPage() {
  return (
    <>
      <h1 className="font-display text-4xl font-semibold">Join AfriLang Datasets</h1>
      <p className="mt-2 text-slate-600">Create a free contributor account. It takes a minute.</p>
      <div className="mt-8"><RegisterForm /></div>
      <p className="mt-8 text-sm text-slate-600">
        Already have an account? <Link href="/login" className="font-semibold text-forest-700 hover:underline">Sign in</Link>
      </p>
    </>
  );
}
