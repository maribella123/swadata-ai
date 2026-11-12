"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/submit-button";
import { resendConfirmation, type AuthState } from "./actions";

export function ResendConfirmation({ email }: { email?: string }) {
  const [state, action] = useActionState<AuthState, FormData>(resendConfirmation, {});
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="email" value={email ?? ""} />
      {state.message && <Alert tone="success">{state.message}</Alert>}
      {state.error && <Alert tone="danger">{state.error}</Alert>}
      <SubmitButton variant="outline" className="w-full" pendingText="Sending…">Resend confirmation email</SubmitButton>
    </form>
  );
}
