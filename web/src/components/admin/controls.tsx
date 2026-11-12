"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Button, type ButtonProps } from "@/components/ui/button";

type R = { ok: boolean; error?: string };

/** A button that runs a server action, shows feedback and refreshes. */
export function ActionButton({
  action,
  success = "Saved",
  confirmText,
  children,
  ...props
}: { action: () => Promise<R>; success?: string; confirmText?: string } & Omit<ButtonProps, "action">) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      {...props}
      disabled={pending || props.disabled}
      onClick={() => {
        if (confirmText && !confirm(confirmText)) return;
        start(async () => {
          const r = await action();
          if (!r.ok) return void toast.error(r.error ?? "Action failed");
          toast.success(success);
          router.refresh();
        });
      }}
    >
      {pending ? "…" : children}
    </Button>
  );
}

/** A form bound to a (prevState, formData) server action; resets on success. */
export function ActionForm({
  action,
  children,
  success = "Saved",
  className,
}: {
  action: (prev: R, fd: FormData) => Promise<R>;
  children: React.ReactNode;
  success?: string;
  className?: string;
}) {
  const [state, formAction] = useActionState<R, FormData>(action, { ok: false });
  const ref = useRef<HTMLFormElement>(null);
  const router = useRouter();
  useEffect(() => {
    if (state.ok) {
      toast.success(success);
      ref.current?.reset();
      router.refresh();
    }
  }, [state, success, router]);
  return (
    <form ref={ref} action={formAction} className={className}>
      {state.error && <Alert tone="danger" className="mb-3">{state.error}</Alert>}
      {children}
    </form>
  );
}
