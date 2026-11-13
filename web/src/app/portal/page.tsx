import Link from "next/link";
import type { Metadata } from "next";
import { CheckCircle2, Clock, FileText, Globe2, Languages, Mic, PenLine, Sparkles, XCircle } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, PageHeader, Progress, StatCard, StatusBadge } from "@/components/ui/misc";
import { TYPE_LABELS, type ContributionStatus, type ContributionType } from "@/lib/constants";
import { formatDate, formatNumber, truncate } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

const MILESTONES = [10, 25, 50, 100, 250, 500, 1000];

export default async function PortalDashboard({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const user = await requireUser();
  const supabase = await createClient();

  const [{ data: rows }, { data: recentReviews }, { data: sources }, { data: myTranslations }, { data: myLangs }] = await Promise.all([
    supabase
      .from("contributions")
      .select("id, type, status, title, created_at, updated_at, languages(name), text_content(body, version)")
      .eq("contributor_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(500),
    supabase
      .from("reviews")
      .select("id, decision, comment, created_at, contribution_id, contributions!inner(contributor_id, type, title)")
      .eq("contributions.contributor_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase.from("translation_sources").select("id, text, domain").eq("is_active", true).limit(50),
    supabase.from("translations").select("source_id, contributions!inner(contributor_id)").eq("contributions.contributor_id", user.id),
    supabase.from("user_languages").select("id").eq("user_id", user.id),
  ]);

  const all = rows ?? [];
  const count = (s: ContributionStatus[]) => all.filter((r) => s.includes(r.status)).length;
  const approved = count(["approved"]);
  const pending = count(["submitted", "in_review"]);
  const rejected = count(["rejected"]);
  const changes = all.filter((r) => r.status === "changes_requested");
  const drafts = all.filter((r) => r.status === "draft");
  const languagesUsed = new Set(all.map((r) => r.languages?.name).filter(Boolean));
  const next = MILESTONES.find((m) => m > approved) ?? approved + 500;
  const prev = [...MILESTONES].reverse().find((m) => m <= approved) ?? 0;
  const translatedIds = new Set((myTranslations ?? []).map((t) => t.source_id));
  const openSources = (sources ?? []).filter((s) => !translatedIds.has(s.id)).slice(0, 4);
  const byType = Object.entries(TYPE_LABELS).map(([k, label]) => ({ label, n: all.filter((r) => r.type === k).length }));

  return (
    <>
      <PageHeader
        eyebrow="Contributor portal"
        title={`Sawubona, ${user.displayName}`}
        description="Thank you for helping preserve and advance African languages."
        actions={<Button asChild><Link href="/portal/text"><PenLine /> New contribution</Link></Button>}
      />
      {sp.welcome && <Alert tone="success" title="Welcome to AfriLang Datasets!" className="mb-6">Your email is verified. Start by adding the languages you speak on your profile, then make your first contribution.</Alert>}
      {sp.password && <Alert tone="success" className="mb-6">Your password has been updated.</Alert>}
      {sp.error === "forbidden" && <Alert tone="warning" className="mb-6">You don&apos;t have access to that area. Contact an administrator if you need a different role.</Alert>}
      {(myLangs ?? []).length === 0 && (
        <Alert tone="info" title="Tell us which languages you speak" className="mb-6">
          This helps us match you with tasks and reviewers. <Link href="/portal/profile" className="font-semibold underline">Update your profile</Link>.
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Total contributions" value={formatNumber(all.filter((r) => r.status !== "draft").length)} icon={FileText} tone="navy" />
        <StatCard label="Approved" value={formatNumber(approved)} icon={CheckCircle2} />
        <StatCard label="Pending review" value={formatNumber(pending)} icon={Clock} tone="gold" />
        <StatCard label="Rejected" value={formatNumber(rejected)} icon={XCircle} tone="danger" />
        <StatCard label="Languages contributed" value={formatNumber(languagesUsed.size)} icon={Globe2} tone="navy" hint={[...languagesUsed].join(", ") || "None yet"} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Recent activity</CardTitle>
            <Link href="/portal/contributions" className="text-sm font-semibold text-forest-700 hover:underline">View all</Link>
          </CardHeader>
          <CardContent>
            {all.length === 0 ? (
              <EmptyState icon={Sparkles} title="No contributions yet" description="Your first sentence, recording or proverb is the most important one." action={<Button asChild><Link href="/portal/text">Make your first contribution</Link></Button>} />
            ) : (
              <ul className="divide-y divide-line">
                {all.slice(0, 7).map((r) => {
                  const body = [...(r.text_content ?? [])].sort((a, b) => a.version - b.version)[0]?.body;
                  return (
                    <li key={r.id}>
                      <Link href={`/portal/contributions/${r.id}`} className="flex items-start justify-between gap-4 py-3 hover:bg-ivory/50">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-navy-900">{r.title || truncate(body, 80) || TYPE_LABELS[r.type as ContributionType]}</p>
                          <p className="text-xs text-slate-500">{TYPE_LABELS[r.type as ContributionType]} · {r.languages?.name} · {formatDate(r.updated_at)}</p>
                        </div>
                        <StatusBadge status={r.status} />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
            {(recentReviews ?? []).length > 0 && (
              <div className="mt-5 border-t border-line pt-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Latest reviewer feedback</p>
                <ul className="space-y-2">
                  {recentReviews!.map((rv) => (
                    <li key={rv.id} className="text-sm">
                      <Link href={`/portal/contributions/${rv.contribution_id}`} className="hover:underline">
                        <span className="font-semibold capitalize text-navy-900">{rv.decision.replace("_", " ")}</span>
                        {rv.comment && <span className="text-slate-600"> — “{truncate(rv.comment, 90)}”</span>}
                        <span className="text-xs text-slate-400"> · {formatDate(rv.created_at)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Contribution progress</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-baseline justify-between">
                <p className="font-display text-3xl font-semibold text-navy-900">{formatNumber(approved)}</p>
                <p className="text-sm text-slate-500">next milestone: {formatNumber(next)} approved</p>
              </div>
              <Progress value={((approved - prev) / (next - prev)) * 100} label="Progress to next milestone" />
              <ul className="grid grid-cols-2 gap-2 pt-2 text-xs text-slate-600">
                {byType.map((t) => <li key={t.label} className="flex justify-between rounded-lg bg-mist px-2.5 py-1.5"><span>{t.label}</span><span className="font-semibold tabular-nums text-navy-900">{t.n}</span></li>)}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Available tasks</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-2.5 text-sm">
                {changes.map((c) => (
                  <li key={c.id}><Link href={`/portal/contributions/${c.id}`} className="flex items-center gap-2 rounded-lg border border-gold-400/50 bg-gold-100 px-3 py-2 font-medium text-gold-700"><PenLine className="size-4" /> Reviewer requested changes: {truncate(c.title || TYPE_LABELS[c.type as ContributionType], 40)}</Link></li>
                ))}
                {drafts.slice(0, 2).map((c) => (
                  <li key={c.id}><Link href={`/portal/contributions/${c.id}`} className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-navy-900 hover:bg-ivory"><FileText className="size-4" /> Finish draft: {truncate(c.title || TYPE_LABELS[c.type as ContributionType], 40)}</Link></li>
                ))}
                {openSources.map((s) => (
                  <li key={s.id}><Link href={`/portal/translations?source=${s.id}`} className="flex items-start gap-2 rounded-lg border border-line px-3 py-2 text-navy-900 hover:bg-ivory"><Languages className="mt-0.5 size-4 shrink-0 text-forest-700" /> <span>Translate: “{truncate(s.text, 60)}”</span></Link></li>
                ))}
                <li><Link href="/portal/audio" className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-navy-900 hover:bg-ivory"><Mic className="size-4 text-forest-700" /> Record a short spoken story</Link></li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
