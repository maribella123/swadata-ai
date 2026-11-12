"use client";

import Link from "next/link";
import { useActionState } from "react";
import { MailCheck } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Checkbox, Field, Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { signUp, type AuthState } from "../actions";
import { ResendConfirmation } from "../resend-confirmation";

export function RegisterForm() {
  const [state, action] = useActionState<AuthState, FormData>(signUp, {});
  const fe = state.fieldErrors ?? {};
  if (state.message) {
    return (
      <div className="space-y-5">
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-6">
          <MailCheck className="size-8 text-forest-700" />
          <p className="mt-3 text-lg font-semibold text-navy-900">Confirm your email</p>
          <p className="mt-1 text-sm text-slate-600">{state.message}</p>
          <p className="mt-3 text-sm font-medium text-navy-900">{state.email}</p>
        </div>
        <ResendConfirmation email={state.email} />
      </div>
    );
  }
  return (
    <form action={action} className="space-y-5" noValidate>
      {state.error && <Alert tone="danger">{state.error}</Alert>}
      <Field label="Display name" htmlFor="display_name" required error={fe.display_name} hint="Shown to reviewers. You can use a nickname.">
        <Input id="display_name" name="display_name" autoComplete="nickname" required aria-invalid={!!fe.display_name} />
      </Field>
      <Field label="Email" htmlFor="email" required error={fe.email}>
        <Input id="email" name="email" type="email" autoComplete="email" required aria-invalid={!!fe.email} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Password" htmlFor="password" required error={fe.password} hint="8+ characters, letters and numbers">
          <Input id="password" name="password" type="password" autoComplete="new-password" required aria-invalid={!!fe.password} />
        </Field>
        <Field label="Confirm password" htmlFor="confirm" required error={fe.confirm}>
          <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required aria-invalid={!!fe.confirm} />
        </Field>
      </div>
      <div className="space-y-2 rounded-xl border border-line bg-ivory/60 p-3">
        <Checkbox
          id="accept_terms"
          required
          label={<>I accept the <Link href="/terms" target="_blank" className="underline">terms</Link> and <Link href="/privacy" target="_blank" className="underline">privacy policy</Link></>}
          description="You'll choose separate permissions (research, publication, AI training, commercial use) for each contribution."
        />
        {fe.accept_terms && <p className="px-1 text-xs font-medium text-danger">{fe.accept_terms}</p>}
        <Checkbox id="adult" required label="I am 18 years or older" />
        {fe.adult && <p className="px-1 text-xs font-medium text-danger">{fe.adult}</p>}
      </div>
      <SubmitButton className="w-full" size="lg" pendingText="Creating account…">Create account</SubmitButton>
    </form>
  );
}
