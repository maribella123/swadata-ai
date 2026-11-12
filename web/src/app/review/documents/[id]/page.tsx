import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { requireReviewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SegmentReviewer } from "./segment-reviewer";

export const metadata: Metadata = { title: "Review segments" };
const PAGE = 100;

export default async function DocumentSegments({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ page?: string; status?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await requireReviewer();
  const page = Math.max(1, Number(sp.page ?? 1));
  const supabase = await createClient();
  const { data: doc } = await supabase.from("documents").select("id, title, author, rights_status, is_poetry, extraction_status, extraction_stats, contribution_id, contributions(contributor_id)").eq("id", id).maybeSingle();
  if (!doc) notFound();
  let q = supabase
    .from("document_extractions")
    .select("id, seq, page_number, paragraph_index, kind, text, status, is_duplicate, ocr_confidence", { count: "exact" })
    .eq("document_id", id)
    .order("seq")
    .range((page - 1) * PAGE, page * PAGE - 1);
  if (sp.status) q = q.eq("status", sp.status as never);
  const { data: segs, count } = await q;
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE));
  const own = doc.contributions?.contributor_id === user.id;

  return (
    <>
      <Link href={`/review/${doc.contribution_id}`} className="inline-flex items-center gap-1 text-sm font-semibold text-forest-700"><ArrowLeft className="size-4" /> Back to submission</Link>
      <div className="mb-6 mt-4">
        <div className="flex flex-wrap gap-2"><Badge tone="navy">Document</Badge>{doc.is_poetry && <Badge tone="gold">Poetry — line & stanza structure preserved</Badge>}<Badge className="capitalize">Rights: {doc.rights_status.replaceAll("_", " ")}</Badge></div>
        <h1 className="mt-3 font-display text-3xl font-semibold">{doc.title}</h1>
        <p className="text-sm text-slate-500">{doc.author} · {count ?? 0} segments{sp.status ? ` (${sp.status})` : ""}</p>
      </div>
      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        {[["", "All"], ["pending", "Pending"], ["approved", "Approved"], ["rejected", "Rejected"]].map(([v, l]) => (
          <Link key={v} href={`?${v ? `status=${v}` : ""}`} className={`rounded-full px-3 py-1 font-semibold ${(sp.status ?? "") === v ? "bg-navy-900 text-white" : "bg-white text-navy-900 ring-1 ring-line"}`}>{l}</Link>
        ))}
      </div>
      {own ? <p className="text-sm text-danger">You cannot review segments of your own document.</p> : <SegmentReviewer segments={segs ?? []} />}
      {pages > 1 && (
        <nav className="mt-5 flex justify-between text-sm" aria-label="Pagination">
          <span className="text-slate-500">Page {page} of {pages}</span>
          <div className="flex gap-2">
            {page > 1 && <Button asChild variant="outline" size="sm"><Link href={`?page=${page - 1}${sp.status ? `&status=${sp.status}` : ""}`}>Previous</Link></Button>}
            {page < pages && <Button asChild variant="outline" size="sm"><Link href={`?page=${page + 1}${sp.status ? `&status=${sp.status}` : ""}`}>Next</Link></Button>}
          </div>
        </nav>
      )}
    </>
  );
}
