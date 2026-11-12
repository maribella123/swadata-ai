import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { formatDate } from "@/lib/utils";
import { SettingRow } from "./setting-row";

export const metadata: Metadata = { title: "System settings" };

export default async function Settings() {
  const supabase = await createClient();
  const { data } = await supabase.from("system_settings").select("*").order("key");
  return (
    <>
      <PageHeader eyebrow="Governance" title="System settings" description="Platform configuration stored in the database. Values are JSON. Secrets are never stored here — they live in deployment environment variables." />
      <Card>
        <CardContent className="divide-y divide-line pt-2">
          {(data ?? []).map((s) => (
            <div key={s.id} className="grid gap-3 py-4 sm:grid-cols-[1fr_1.2fr] sm:items-center">
              <div><p className="font-mono text-sm font-semibold text-navy-900">{s.key}</p><p className="text-xs text-slate-500">{s.description} {s.is_public ? "· public" : ""} · updated {formatDate(s.updated_at)}</p></div>
              <SettingRow settingKey={s.key} value={JSON.stringify(s.value)} />
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}
