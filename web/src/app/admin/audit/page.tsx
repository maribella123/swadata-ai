import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/misc";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { formatDate, truncate } from "@/lib/utils";

export const metadata: Metadata = { title: "Audit logs" };
const PAGE = 50;
const ENTITIES = ["contributions", "user_roles", "users", "documents", "consents", "contribution_permissions", "languages", "datasets", "dataset_releases", "dataset_access_requests", "system_settings", "document_extractions"];

export default async function Audit({ searchParams }: { searchParams: Promise<{ entity?: string; page?: string }> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1));
  const supabase = await createClient();
  let q = supabase.from("audit_logs").select("*", { count: "exact" }).order("created_at", { ascending: false }).range((page - 1) * PAGE, page * PAGE - 1);
  if (sp.entity) q = q.eq("entity_type", sp.entity);
  const { data, count } = await q;
  const actorIds = [...new Set((data ?? []).map((a) => a.actor_id).filter(Boolean))] as string[];
  const { data: actors } = actorIds.length ? await supabase.from("users").select("id, display_name").in("id", actorIds) : { data: [] };
  const name = new Map((actors ?? []).map((a) => [a.id, a.display_name]));
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE));
  return (
    <>
      <PageHeader eyebrow="Governance" title="Audit logs" description="Append-only record of sensitive actions. Written by database triggers — it cannot be edited from the application." />
      <form className="mb-4 flex gap-2"><Select name="entity" defaultValue={sp.entity ?? ""} className="w-64" aria-label="Entity"><option value="">All entities</option>{ENTITIES.map((e) => <option key={e} value={e}>{e.replaceAll("_", " ")}</option>)}</Select><Button type="submit" variant="outline">Filter</Button></form>
      <div className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-white">
        <Table>
          <THead><TR><TH>When</TH><TH>Actor</TH><TH>Action</TH><TH>Entity</TH><TH>Details</TH></TR></THead>
          <TBody>
            {(data ?? []).map((a) => (
              <TR key={a.id}>
                <TD className="whitespace-nowrap text-slate-500">{formatDate(a.created_at, true)}</TD>
                <TD>{a.actor_id ? name.get(a.actor_id) ?? a.actor_id.slice(0, 8) : <span className="text-slate-400">system</span>}</TD>
                <TD><Badge>{a.action}</Badge></TD>
                <TD className="text-xs">{a.entity_type}<br /><span className="font-mono text-slate-400">{a.entity_id?.slice(0, 8)}</span></TD>
                <TD className="max-w-md font-mono text-xs text-slate-600">{truncate(JSON.stringify(a.details), 220)}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </div>
      {pages > 1 && <nav className="mt-4 flex justify-between text-sm"><span className="text-slate-500">{count} events · page {page}/{pages}</span><div className="flex gap-2">{page > 1 && <Button asChild size="sm" variant="outline"><Link href={`?entity=${sp.entity ?? ""}&page=${page - 1}`}>Previous</Link></Button>}{page < pages && <Button asChild size="sm" variant="outline"><Link href={`?entity=${sp.entity ?? ""}&page=${page + 1}`}>Next</Link></Button>}</div></nav>}
    </>
  );
}
