"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Field, Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { signIn, type AuthState } from "../actions";
import { ResendConfirmation } from "../resend-confirmation";

export function LoginForm({ next, initialError, verified }: { next?: string; initialError?: string; verified?: boolean }) {
  const [state, action] = useActionState<AuthState, FormData>(signIn, { error: initialError });
  const needsVerify = state.error?.includes("verify your email");
  return (
    <div className="space-y-4">
      {verified && !state.error && <Alert tone="success">Your email is verified. Please sign in.</Alert>}
      {state.error && <Alert tone="danger">{state.error}</Alert>}
      <form action={action} className="space-y-5">
        <input type="hidden" name="next" value={next ?? "/portal"} />
        <Field label="Email" htmlFor="email" required>
          <Input id="email" name="email" type="email" autoComplete="email" required defaultValue={state.email} />
        </Field>
        <Field label="Password" htmlFor="password" required>
          <Input id="password" name="password" type="password" autoComplete="current-password" required />
        </Field>
        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-sm font-semibold text-forest-700 hover:underline">Forgot your password?</Link>
        </div>
        <SubmitButton className="w-full" size="lg" pendingText="Signing in…">Sign in</SubmitButton>
      </form>
      {needsVerify && <ResendConfirmation email={state.email} />}
    </div>
  );
}
