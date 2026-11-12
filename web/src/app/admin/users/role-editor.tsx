"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Settings2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ALL_ROLES, ROLE_LABELS, type AppRole } from "@/lib/constants";
import { setActive, setRole } from "../actions";

export function RoleEditor({ userId, roles, isSelf, canGrantAdmin, active }: { userId: string; roles: AppRole[]; isSelf: boolean; canGrantAdmin: boolean; active: boolean }) {
  const [open, setOpen] = useState(false);
  // Optimistic local copy; server state is refreshed after each change.
  const [local, setLocal] = useState<AppRole[]>(roles);
  const [pending, start] = useTransition();
  const router = useRouter();
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, msg: string) =>
    start(async () => {
      const r = await fn();
      if (r.ok) { toast.success(msg); router.refresh(); } else toast.error(r.error);
    });

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1">
        {local.map((r) => <Badge key={r} tone={r === "admin" || r === "super_admin" ? "navy" : r === "contributor" ? "neutral" : "success"}>{ROLE_LABELS[r]}</Badge>)}
        <Button variant="ghost" size="icon" className="size-7" onClick={() => setOpen((o) => !o)} aria-label="Edit roles" aria-expanded={open}><Settings2 /></Button>
      </div>
      {open && (
        <div className="mt-2 w-64 space-y-1 rounded-xl border border-line bg-white p-3 shadow-[var(--shadow-lift)]">
          {ALL_ROLES.filter((r) => r !== "contributor").map((r) => {
            const locked = (r === "admin" || r === "super_admin") && !canGrantAdmin;
            return (
              <label key={r} className="flex items-center justify-between gap-2 py-1 text-sm">
                <span className={locked ? "text-slate-400" : ""}>{ROLE_LABELS[r]}</span>
                <input type="checkbox" className="accent-forest-700" disabled={pending || locked || (isSelf && r === "super_admin")} checked={local.includes(r)} onChange={(e) => {
                  const grant = e.target.checked;
                  const prev = local;
                  setLocal(grant ? [...local, r] : local.filter((x) => x !== r));
                  start(async () => {
                    const res = await setRole(userId, r, grant);
                    if (!res.ok) {
                      setLocal(prev);
                      toast.error(res.error);
                      return;
                    }
                    toast.success(grant ? `${ROLE_LABELS[r]} granted` : `${ROLE_LABELS[r]} removed`);
                    router.refresh();
                  });
                }} />
              </label>
            );
          })}
          {!isSelf && (
            <Button size="sm" variant={active ? "outline" : "primary"} className="mt-2 w-full" disabled={pending} onClick={() => (active ? confirm("Deactivate this account? They will lose access immediately.") : true) && run(() => setActive(userId, !active), active ? "Account deactivated" : "Account reactivated")}>
              {active ? "Deactivate account" : "Reactivate account"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
