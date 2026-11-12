"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/input";
import { PermissionsFieldset, type Permissions } from "@/components/contribute/common-fields";
import { deleteDraft, resubmitContribution, submitDraft, updatePermissions, withdrawContribution } from "@/app/portal/actions";
import type { ContributionStatus } from "@/lib/constants";

export function ContributorActions({ id, status, canRevise, latestBody }: { id: string; status: ContributionStatus; canRevise: boolean; latestBody: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [body, setBody] = useState(latestBody);
  const [note, setNote] = useState("");

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, msg: string, after?: () => void) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) return void toast.error(r.error ?? "Action failed");
      toast.success(msg);
      if (after) after(); else router.refresh();
    });

  if (!["draft", "submitted", "changes_requested"].includes(status)) return null;

  return (
    <Card>
      <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {status === "changes_requested" && (
          <div className="space-y-3">
            {canRevise && (
              <>
                <Field label="Revised text" htmlFor="revised" hint="Saved as a new version — your original is preserved.">
                  <Textarea id="revised" value={body} onChange={(e) => setBody(e.target.value)} rows={6} spellCheck={false} />
                </Field>
                <Field label="Note to reviewer" htmlFor="note"><Input id="note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} /></Field>
              </>
            )}
            <Button className="w-full" disabled={pending} onClick={() => run(() => resubmitContribution(id, canRevise && body !== latestBody ? body : "", note || "Contributor revision"), "Resubmitted for review.")}>
              Resubmit for review
            </Button>
          </div>
        )}
        {status === "draft" && (
          <div className="grid gap-2">
            <Button disabled={pending} onClick={() => run(() => submitDraft(id), "Submitted for review.")}>Submit for review</Button>
            <Button variant="outline" className="text-danger" disabled={pending} onClick={() => confirm("Delete this draft permanently?") && run(() => deleteDraft(id), "Draft deleted.", () => router.push("/portal/contributions"))}>Delete draft</Button>
          </div>
        )}
        {status !== "draft" && (
          <Button variant="outline" className="w-full" disabled={pending} onClick={() => confirm("Withdraw this contribution? It will not be reviewed or included in datasets.") && run(() => withdrawContribution(id), "Contribution withdrawn.")}>
            Withdraw contribution
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function PermissionsEditor({ id, initial }: { id: string; initial: Permissions & Record<string, unknown> }) {
  const [value, setValue] = useState<Permissions>({
    allow_collection: true,
    allow_research: initial.allow_research,
    allow_public_release: initial.allow_public_release,
    allow_ai_training: initial.allow_ai_training,
    allow_commercial: initial.allow_commercial,
    rights_holder: String(initial.rights_holder ?? ""),
  });
  const [pending, start] = useTransition();
  const dirty =
    value.allow_research !== initial.allow_research ||
    value.allow_public_release !== initial.allow_public_release ||
    value.allow_ai_training !== initial.allow_ai_training ||
    value.allow_commercial !== initial.allow_commercial;
  return (
    <div className="space-y-3">
      <PermissionsFieldset value={value} onChange={setValue} />
      {dirty && (
        <Button
          className="w-full"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await updatePermissions(id, value);
              if (r.ok) toast.success("Permissions updated. Changes apply to future dataset releases."); else toast.error(r.error);
            })
          }
        >
          Save permission changes
        </Button>
      )}
    </div>
  );
}
