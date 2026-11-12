import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, Progress, StatCard } from "@/components/ui/misc";
import { formatNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Consent & governance" };

function daysAgoIso(days: number) {
  return new Date(Date.now() - days * 864e5).toISOString();
}

export default async function Governance() {
  const supabase = await createClient();
  const { data: retentionSetting } = await supabase.from("system_settings").select("value").eq("key", "retention_rejected_days").maybeSingle();
  const retentionDays = Number(retentionSetting?.value ?? 365) || 365;
  const cutoff = daysAgoIso(retentionDays);
  const [{ data: perms }, { data: consents }, { count: restricted }, { count: rightsPending }, { count: oldRejected }] = await Promise.all([
    supabase.from("contribution_permissions").select("allow_research, allow_public_release, allow_ai_training, allow_commercial").limit(100000),
    supabase.from("consents").select("user_id, consent_type, granted, created_at").order("created_at", { ascending: false }).limit(100000),
    supabase.from("contributions").select("id", { count: "exact", head: true }).eq("sensitivity", "restricted"),
    supabase.from("documents").select("id", { count: "exact", head: true }).eq("rights_status", "pending_verification"),
    supabase.from("contributions").select("id", { count: "exact", head: true }).eq("status", "rejected").lt("reviewed_at", cutoff),
  ]);
  const p = perms ?? [];
  const pct = (k: keyof (typeof p)[number]) => (p.length ? (p.filter((x) => x[k]).length / p.length) * 100 : 0);
  const latest = new Map<string, boolean>();
  (consents ?? []).forEach((c) => { const key = `${c.user_id}:${c.consent_type}`; if (!latest.has(key)) latest.set(key, c.granted); });
  const userDefaults = (t: string) => [...latest.entries()].filter(([k, v]) => k.endsWith(`:${t}`) && v).length;

  return (
    <>
      <PageHeader eyebrow="Governance" title="Consent & governance" description="POPIA-aligned oversight: purpose-specific permissions, sensitive material, rights verification and retention." />
      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Contributions with permission records" value={formatNumber(p.length)} />
        <StatCard label="Restricted cultural items" value={formatNumber(restricted ?? 0)} tone="danger" hint="Never released in datasets" />
        <StatCard label="Documents awaiting rights" value={formatNumber(rightsPending ?? 0)} tone="gold" />
        <StatCard label="Rejected items past retention" value={formatNumber(oldRejected ?? 0)} tone="navy" hint={`Retention: ${retentionDays} days`} />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Per-contribution permissions</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {[["Research use", "allow_research"], ["AI model training", "allow_ai_training"], ["Public publication", "allow_public_release"], ["Commercial use", "allow_commercial"]].map(([l, k]) => (
              <div key={k}><div className="mb-1 flex justify-between text-sm"><span>{l}</span><span className="font-semibold tabular-nums">{Math.round(pct(k as never))}%</span></div><Progress value={pct(k as never)} label={l} /></div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Contributor default consents (current)</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {[["platform_terms", "Platform terms"], ["data_collection", "Data collection"], ["research_use", "Research use"], ["ai_training", "AI training"], ["public_publication", "Public publication"], ["commercial_use", "Commercial use"]].map(([k, l]) => (
                <li key={k} className="flex justify-between"><span>{l}</span><span className="font-semibold tabular-nums">{formatNumber(userDefaults(k))} users</span></li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-slate-500">Consent records are append-only; withdrawals are new records. Full history per user is visible in the audit log.</p>
          </CardContent>
        </Card>
      </div>
      <Card className="mt-6">
        <CardHeader><CardTitle>Governance procedures</CardTitle></CardHeader>
        <CardContent className="prose-swa text-sm">
          <ul>
            <li><strong>Rights verification:</strong> linguists/admins verify documents in <Link href="/review/documents?rights=pending_verification">Document extracts</Link>. Decisions require recorded evidence.</li>
            <li><strong>Release approval:</strong> four-eyes rule enforced in the database — the creator of a release cannot approve it (super administrators excepted).</li>
            <li><strong>Data subject requests:</strong> arrive via the contact form (topic “Privacy / POPIA”) in <Link href="/admin/messages">Messages</Link>. Deactivate accounts from Contributors & roles; deletions cascade from the authentication user.</li>
            <li><strong>Backups:</strong> enable Supabase Point-in-Time Recovery on production; see docs/DEPLOYMENT.md.</li>
          </ul>
        </CardContent>
      </Card>
    </>
  );
}
