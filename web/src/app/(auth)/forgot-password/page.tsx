"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Field, Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { requestPasswordReset, type AuthState } from "../actions";

export default function ForgotPasswordPage() {
  const [state, action] = useActionState<AuthState, FormData>(requestPasswordReset, {});
  return (
    <>
      <h1 className="font-display text-4xl font-semibold">Reset your password</h1>
      <p className="mt-2 text-slate-600">We&apos;ll email you a secure link to choose a new password.</p>
      <form action={action} className="mt-8 space-y-5">
        {state.message && <Alert tone="success">{state.message}</Alert>}
        {state.error && <Alert tone="danger">{state.error}</Alert>}
        <Field label="Email" htmlFor="email" required>
          <Input id="email" name="email" type="email" autoComplete="email" required defaultValue={state.email} />
        </Field>
        <SubmitButton className="w-full" size="lg" pendingText="Sending…">Send reset link</SubmitButton>
      </form>
      <p className="mt-8 text-sm"><Link href="/login" className="font-semibold text-forest-700 hover:underline">Back to sign in</Link></p>
    </>
  );
}
