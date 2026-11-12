"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { requestExports } from "../../actions";

export function ExportRequester({ releaseId, formats }: { releaseId: string; formats: string[] }) {
  const [sel, setSel] = useState<string[]>(formats.filter((f) => f !== "wav"));
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg bg-mist p-2.5">
      {formats.map((f) => (
        <label key={f} className="flex items-center gap-1.5 text-xs font-semibold uppercase">
          <input type="checkbox" className="accent-forest-700" checked={sel.includes(f)} onChange={(e) => setSel((s) => (e.target.checked ? [...s, f] : s.filter((x) => x !== f)))} /> {f}
        </label>
      ))}
      <Button size="sm" variant="outline" disabled={pending || !sel.length} onClick={() => start(async () => { const r = await requestExports(releaseId, sel); if (r.ok) { toast.success("Exports queued"); router.refresh(); } else toast.error(r.error); })}>Generate exports</Button>
    </div>
  );
}
