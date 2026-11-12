"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createContribution } from "@/app/portal/actions";

/** Submits a contribution via the server action and handles feedback. */
export function useSubmitContribution() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [lastId, setLastId] = useState<string | null>(null);

  function submit(payload: unknown, opts: { onSuccess?: (id: string) => void; successMessage?: string } = {}): Promise<boolean> {
    setFormError(null);
    setErrors({});
    let resolveDone: (ok: boolean) => void = () => {};
    const done = new Promise<boolean>((r) => (resolveDone = r));
    startTransition(async () => {
      const res = await createContribution(payload);
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        setFormError(res.error);
        toast.error(res.error);
        window.scrollTo({ top: 0, behavior: "smooth" });
        resolveDone(false);
        return;
      }
      const id = res.data!.id;
      setLastId(id);
      toast.success(opts.successMessage ?? "Contribution submitted for review. Thank you!", {
        action: { label: "View", onClick: () => router.push(`/portal/contributions/${id}`) },
      });
      opts.onSuccess?.(id);
      router.refresh();
      resolveDone(true);
    });
    return done;
  }

  return { submit, pending, errors, formError, lastId, setFormError };
}
