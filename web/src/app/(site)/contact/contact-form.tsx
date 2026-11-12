"use client";

import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { sendContact, type ContactState } from "./actions";

export function ContactForm({ defaultTopic }: { defaultTopic?: string }) {
  const [state, action] = useActionState<ContactState, FormData>(sendContact, {});
  if (state.ok) {
    return (
      <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-8 text-center">
        <CheckCircle2 className="mx-auto size-10 text-forest-700" />
        <p className="mt-4 text-lg font-semibold text-navy-900">Thank you — your message has been received.</p>
        <p className="mt-1 text-sm text-slate-600">Our team will respond by email.</p>
      </div>
    );
  }
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-5" noValidate>
      {state.error && <Alert tone="danger">{state.error}</Alert>}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Your name" htmlFor="name" required error={fe.name}>
          <Input id="name" name="name" autoComplete="name" required aria-invalid={!!fe.name} />
        </Field>
        <Field label="Email" htmlFor="email" required error={fe.email}>
          <Input id="email" name="email" type="email" autoComplete="email" required aria-invalid={!!fe.email} />
        </Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Organisation" htmlFor="organisation" hint="Optional">
          <Input id="organisation" name="organisation" autoComplete="organization" />
        </Field>
        <Field label="Topic" htmlFor="topic">
          <Select id="topic" name="topic" defaultValue={defaultTopic ?? "general"}>
            <option value="general">General enquiry</option>
            <option value="partnership">Partnership (university, school, community)</option>
            <option value="research">Research & dataset access</option>
            <option value="data_rights">Copyright or data rights</option>
            <option value="privacy">Privacy / POPIA request</option>
            <option value="press">Press</option>
          </Select>
        </Field>
      </div>
      <Field label="Message" htmlFor="message" required error={fe.message}>
        <Textarea id="message" name="message" rows={6} required aria-invalid={!!fe.message} />
      </Field>
      <div className="hidden" aria-hidden>
        <label htmlFor="website">Website</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <SubmitButton pendingText="Sending…" size="lg">Send message</SubmitButton>
    </form>
  );
}
