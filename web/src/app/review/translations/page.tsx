import Link from "next/link";
import type { Metadata } from "next";
import { Languages } from "lucide-react";
import { requireReviewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Translation comparison" };

export default async function TranslationCompare() {
  const user = await requireReviewer();
  const supabase = await createClient();
  const { data } = await supabase
    .from("translations")
    .select("contribution_id, source_text, target_text, source_hash, source:languages!translations_source_language_id_fkey(name), target:languages!translations_target_language_id_fkey(name), contributions!inner(status, contributor_id, reviews(scores))")
    .in("contributions.status", ["submitted", "in_review", "approved", "changes_requested"])
    .order("created_at", { ascending: false })
    .limit(500);

  const groups = new Map<string, NonNullable<typeof data>>();
  (data ?? []).forEach((t) => {
    const key = `${t.source?.name}|${t.target?.name}|${t.source_hash}`;
    groups.set(key, [...(groups.get(key) ?? []), t]);
  });
  const multi = [...groups.values()].filter((g) => g.length > 1).slice(0, 50);
  const avg = (rows: { scores: unknown }[]) => {
    const all = rows.flatMap((r) => Object.values((r.scores as Record<string, number>) ?? {}));
    return all.length ? (all.reduce((a, b) => a + b, 0) / all.length).toFixed(1) : null;
  };

  return (
    <>
      <PageHeader eyebrow="Reviewer workspace" title="Translation comparison" description="Sources with more than one translation, side by side. Compare accuracy, fluency, context and naturalness — several renderings can all be correct." />
      {!multi.length ? <EmptyState icon={Languages} title="No sources with multiple translations yet" description="When two or more contributors translate the same sentence, they'll appear here." /> : (
        <div className="space-y-5">
          {multi.map((g) => (
            <Card key={g[0].source_hash + (g[0].target?.name ?? "")}>
              <CardHeader>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{g[0].source?.name} → {g[0].target?.name}</p>
                <CardTitle className="text-lg">“{g[0].source_text}”</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="grid gap-3 md:grid-cols-2">
                  {g.map((t) => {
                    const score = avg(t.contributions.reviews ?? []);
                    return (
                      <li key={t.contribution_id} className="rounded-xl border border-line p-4">
                        <p className="whitespace-pre-wrap">{t.target_text}</p>
                        <div className="mt-3 flex items-center justify-between gap-2">
                          <span className="flex gap-2"><StatusBadge status={t.contributions.status} />{score && <Badge tone="gold">avg score {score}/5</Badge>}</span>
                          {t.contributions.contributor_id !== user.id && <Link href={`/review/${t.contribution_id}`} className="text-sm font-semibold text-forest-700 hover:underline">Review</Link>}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
