import type { Metadata } from "next";
import { Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { ActionButton } from "@/components/admin/controls";
import { formatDate } from "@/lib/utils";
import { setMessageStatus } from "../actions";

export const metadata: Metadata = { title: "Messages" };

export default async function Messages() {
  const supabase = await createClient();
  const { data } = await supabase.from("contact_messages").select("*").order("status").order("created_at", { ascending: false }).limit(200);
  return (
    <>
      <PageHeader eyebrow="Governance" title="Contact messages" description="Partnership, research and data-rights enquiries from the contact form." />
      {!data?.length ? <EmptyState icon={Mail} title="No messages" /> : (
        <div className="space-y-3">
          {data.map((m) => (
            <Card key={m.id} className={m.status === "closed" ? "opacity-60" : ""}>
              <CardContent className="space-y-2 pt-5 sm:pt-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-navy-900">{m.name} <span className="font-normal text-slate-500">· <a className="underline" href={`mailto:${m.email}`}>{m.email}</a>{m.organisation ? ` · ${m.organisation}` : ""}</span></p>
                  <span className="flex gap-2"><Badge tone={m.topic === "privacy" || m.topic === "data_rights" ? "warning" : "info"} className="capitalize">{m.topic.replace("_", " ")}</Badge><Badge className="capitalize">{m.status.replace("_", " ")}</Badge></span>
                </div>
                <p className="whitespace-pre-wrap text-sm text-slate-700">{m.message}</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">{formatDate(m.created_at, true)}</span>
                  {m.status !== "in_progress" && m.status !== "closed" && <ActionButton size="sm" variant="outline" action={setMessageStatus.bind(null, m.id, "in_progress")} success="Marked in progress">Mark in progress</ActionButton>}
                  {m.status !== "closed" && <ActionButton size="sm" variant="ghost" action={setMessageStatus.bind(null, m.id, "closed")} success="Closed">Close</ActionButton>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
