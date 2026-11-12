"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Field, Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { updatePassword, type AuthState } from "../actions";

export default function ResetPasswordPage() {
  const [state, action] = useActionState<AuthState, FormData>(updatePassword, {});
  const fe = state.fieldErrors ?? {};
  return (
    <>
      <h1 className="font-display text-4xl font-semibold">Choose a new password</h1>
      <p className="mt-2 text-slate-600">Use at least 8 characters with letters and numbers.</p>
      <form action={action} className="mt-8 space-y-5">
        {state.error && <Alert tone="danger">{state.error}</Alert>}
        <Field label="New password" htmlFor="password" required error={fe.password}>
          <Input id="password" name="password" type="password" autoComplete="new-password" required />
        </Field>
        <Field label="Confirm new password" htmlFor="confirm" required error={fe.confirm}>
          <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required />
        </Field>
        <SubmitButton className="w-full" size="lg" pendingText="Updating…">Update password</SubmitButton>
      </form>
    </>
  );
}
