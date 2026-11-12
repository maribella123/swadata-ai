import "server-only";

import { createClient } from "@/lib/supabase/server";
import { STATUS_LABELS, TYPE_LABELS, type ContributionStatus, type ContributionType } from "@/lib/constants";

/** Aggregates for admin dashboards. All queries run under the admin's own session (RLS applies). */
export async function getAdminOverview(days = 30) {
  const supabase = await createClient();
  const [stats, series, contribs, langs, rightsPending, failedJobs, recentAudit, pendingRequests, newMessages] = await Promise.all([
    supabase.rpc("platform_stats"),
    supabase.rpc("admin_activity_series", { p_days: days }),
    supabase.from("contributions").select("type, status, language_id, submitted_at, reviewed_at").limit(50000),
    supabase.from("languages").select("id, name").eq("is_active", true).order("sort_order"),
    supabase.from("documents").select("id", { count: "exact", head: true }).eq("rights_status", "pending_verification"),
    supabase.from("processing_jobs").select("id", { count: "exact", head: true }).eq("status", "failed"),
    supabase.from("audit_logs").select("id, action, entity_type, created_at, actor_id").order("created_at", { ascending: false }).limit(8),
    supabase.from("dataset_access_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("contact_messages").select("id", { count: "exact", head: true }).eq("status", "new"),
  ]);
  const rows = contribs.data ?? [];
  const byStatus = Object.entries(STATUS_LABELS).map(([k, label]) => ({ key: k as ContributionStatus, name: label, value: rows.filter((r) => r.status === k).length }));
  const byType = Object.entries(TYPE_LABELS).map(([k, label]) => ({ name: label, value: rows.filter((r) => r.type === (k as ContributionType)).length }));
  const byLanguage = (langs.data ?? []).map((l) => ({ name: l.name, value: rows.filter((r) => r.language_id === l.id && r.status !== "draft").length }));
  const reviewed = rows.filter((r) => r.submitted_at && r.reviewed_at);
  const turnaroundHours = reviewed.length
    ? reviewed.reduce((acc, r) => acc + (new Date(r.reviewed_at!).getTime() - new Date(r.submitted_at!).getTime()) / 36e5, 0) / reviewed.length
    : null;
  const decided = rows.filter((r) => r.status === "approved" || r.status === "rejected");
  const approvalRate = decided.length ? rows.filter((r) => r.status === "approved").length / decided.length : null;

  return {
    stats: (stats.data ?? {}) as Record<string, number>,
    series: (series.data ?? []).map((d) => ({ day: d.day, submissions: Number(d.submissions), approvals: Number(d.approvals), reviews: Number(d.reviews), signups: Number(d.signups) })),
    byStatus,
    byType,
    byLanguage,
    turnaroundHours,
    approvalRate,
    rightsPending: rightsPending.count ?? 0,
    failedJobs: failedJobs.count ?? 0,
    pendingRequests: pendingRequests.count ?? 0,
    newMessages: newMessages.count ?? 0,
    recentAudit: recentAudit.data ?? [],
  };
}
