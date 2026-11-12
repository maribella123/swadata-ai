import type { Metadata } from "next";
import { getAdminOverview } from "@/lib/admin-data";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, StatCard } from "@/components/ui/misc";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { ActivityChart, SimpleBarChart } from "@/components/admin/charts";
import { formatNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Analytics" };

export default async function Analytics({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const { days } = await searchParams;
  const range = [7, 30, 90, 365].includes(Number(days)) ? Number(days) : 90;
  const o = await getAdminOverview(range);
  const supabase = await createClient();
  const { data: langStats } = await supabase.rpc("language_stats");
  const totals = o.series.reduce((a, d) => ({ s: a.s + d.submissions, r: a.r + d.reviews, ap: a.ap + d.approvals, u: a.u + d.signups }), { s: 0, r: 0, ap: 0, u: 0 });
  return (
    <>
      <PageHeader eyebrow="Administration" title="Analytics" description="Collection and review trends." actions={
        <div className="flex gap-1 rounded-xl bg-white p-1 ring-1 ring-line" role="tablist" aria-label="Time range">
          {[7, 30, 90, 365].map((d) => <a key={d} href={`?days=${d}`} role="tab" aria-selected={d === range} className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${d === range ? "bg-navy-900 text-white" : "text-slate-600"}`}>{d === 365 ? "1y" : `${d}d`}</a>)}
        </div>
      } />
      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label={`Submissions (${range}d)`} value={formatNumber(totals.s)} />
        <StatCard label={`Reviews (${range}d)`} value={formatNumber(totals.r)} tone="navy" />
        <StatCard label={`Approvals (${range}d)`} value={formatNumber(totals.ap)} tone="gold" />
        <StatCard label={`New contributors (${range}d)`} value={formatNumber(totals.u)} tone="navy" />
      </div>
      <Card className="mt-6"><CardHeader><CardTitle>Daily activity</CardTitle></CardHeader><CardContent><ActivityChart data={o.series} /></CardContent></Card>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card><CardHeader><CardTitle>Approved contributions by language</CardTitle></CardHeader><CardContent><SimpleBarChart data={(langStats ?? []).map((l) => ({ name: l.name, value: Number(l.approved) }))} label="Approved" /></CardContent></Card>
        <Card>
          <CardHeader><CardTitle>Language table</CardTitle></CardHeader>
          <CardContent>
            <Table className="min-w-0">
              <THead><TR><TH>Language</TH><TH>Submitted</TH><TH>Approved</TH><TH>Speech (min)</TH></TR></THead>
              <TBody>{(langStats ?? []).map((l) => <TR key={l.code}><TD>{l.name}</TD><TD className="tabular-nums">{formatNumber(Number(l.submissions))}</TD><TD className="tabular-nums">{formatNumber(Number(l.approved))}</TD><TD className="tabular-nums">{formatNumber(Math.round(Number(l.audio_seconds) / 60))}</TD></TR>)}</TBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
