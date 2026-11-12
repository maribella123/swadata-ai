import Link from "next/link";
import type { Metadata } from "next";
import { AlertTriangle, CheckCircle2, Clock, FileWarning, Inbox, KeyRound, Mail, Users } from "lucide-react";
import { getAdminOverview } from "@/lib/admin-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, StatCard } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { ActivityChart, SimpleBarChart } from "@/components/admin/charts";
import { formatDate, formatNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Admin overview" };

export default async function AdminOverview() {
  const o = await getAdminOverview(30);
  const pending = o.byStatus.filter((s) => s.key === "submitted" || s.key === "in_review").reduce((a, b) => a + b.value, 0);
  return (
    <>
      <PageHeader eyebrow="Administration" title="Platform overview" description="Live metrics from the AfriLang Research database." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Registered contributors" value={formatNumber(o.stats.registered_contributors)} icon={Users} tone="navy" />
        <StatCard label="Awaiting review" value={formatNumber(pending)} icon={Inbox} tone="gold" />
        <StatCard label="Approval rate" value={o.approvalRate === null ? "—" : `${Math.round(o.approvalRate * 100)}%`} icon={CheckCircle2} hint="Of decided contributions" />
        <StatCard label="Avg. review turnaround" value={o.turnaroundHours === null ? "—" : o.turnaroundHours < 48 ? `${o.turnaroundHours.toFixed(1)} h` : `${(o.turnaroundHours / 24).toFixed(1)} d`} icon={Clock} tone="navy" />
      </div>

      {(o.rightsPending > 0 || o.failedJobs > 0 || o.pendingRequests > 0 || o.newMessages > 0) && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {o.rightsPending > 0 && <Link href="/review/documents?rights=pending_verification" className="flex items-center gap-3 rounded-xl border border-gold-400/50 bg-gold-100 p-3 text-sm font-semibold text-gold-700"><FileWarning className="size-4" /> {o.rightsPending} document(s) need rights verification</Link>}
          {o.failedJobs > 0 && <Link href="/admin/jobs?status=failed" className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-danger"><AlertTriangle className="size-4" /> {o.failedJobs} processing job(s) failed</Link>}
          {o.pendingRequests > 0 && <Link href="/admin/access-requests" className="flex items-center gap-3 rounded-xl border border-navy-100 bg-navy-50 p-3 text-sm font-semibold text-navy-900"><KeyRound className="size-4" /> {o.pendingRequests} dataset access request(s)</Link>}
          {o.newMessages > 0 && <Link href="/admin/messages" className="flex items-center gap-3 rounded-xl border border-navy-100 bg-navy-50 p-3 text-sm font-semibold text-navy-900"><Mail className="size-4" /> {o.newMessages} new message(s)</Link>}
        </div>
      )}

      <Card className="mt-6">
        <CardHeader><CardTitle>Activity — last 30 days</CardTitle></CardHeader>
        <CardContent><ActivityChart data={o.series} /></CardContent>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Submissions by language</CardTitle></CardHeader>
          <CardContent><SimpleBarChart data={o.byLanguage} label="Submissions" /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Contributions by type</CardTitle></CardHeader>
          <CardContent><SimpleBarChart data={o.byType} label="Contributions" color="#3D6FA8" /></CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Status breakdown</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2.5">
              {o.byStatus.map((s) => {
                const total = Math.max(1, o.byStatus.reduce((a, b) => a + b.value, 0));
                return (
                  <li key={s.key} className="grid grid-cols-[9rem_1fr_3rem] items-center gap-3 text-sm">
                    <span className="text-slate-600">{s.name}</span>
                    <span className="h-2 overflow-hidden rounded-full bg-mist"><span className="block h-full rounded-full bg-emerald-500" style={{ width: `${(s.value / total) * 100}%` }} /></span>
                    <span className="text-right font-semibold tabular-nums text-navy-900">{formatNumber(s.value)}</span>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between"><CardTitle>Recent system activity</CardTitle><Link href="/admin/audit" className="text-sm font-semibold text-forest-700">Audit log</Link></CardHeader>
          <CardContent>
            <ul className="divide-y divide-line text-sm">
              {o.recentAudit.map((a) => (
                <li key={a.id} className="flex items-center justify-between py-2"><span><Badge className="mr-2">{a.action}</Badge>{a.entity_type.replaceAll("_", " ")}</span><span className="text-xs text-slate-400">{formatDate(a.created_at, true)}</span></li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
