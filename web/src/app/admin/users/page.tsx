import Link from "next/link";
import type { Metadata } from "next";
import { Search } from "lucide-react";
import { getSessionUser, hasAnyRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/misc";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import { RoleEditor } from "./role-editor";

export const metadata: Metadata = { title: "Contributors & roles" };
const PAGE = 50;

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const sp = await searchParams;
  const me = await getSessionUser();
  const page = Math.max(1, Number(sp.page ?? 1));
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_list_users", { p_search: sp.q ?? "", p_limit: PAGE, p_offset: (page - 1) * PAGE });
  const total = Number(data?.[0]?.total_count ?? 0);
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const isSuper = hasAnyRole(me, ["super_admin"]);

  return (
    <>
      <PageHeader eyebrow="People" title="Contributors & roles" description="Assign reviewer, linguist, researcher and translator roles. Only super administrators can grant administrator roles. Every change is audit-logged." />
      <form className="mb-5 flex max-w-md gap-2">
        <div className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input name="q" defaultValue={sp.q} placeholder="Search name or email" className="pl-9" aria-label="Search users" /></div>
        <Button type="submit" variant="navy">Search</Button>
      </form>
      {error && <p className="text-danger">{error.message}</p>}
      <div className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-white">
        <Table>
          <THead><TR><TH>User</TH><TH>Roles</TH><TH>Contributions</TH><TH>Joined</TH><TH>Last sign-in</TH><TH /></TR></THead>
          <TBody>
            {(data ?? []).map((u) => (
              <TR key={u.id} className={u.is_active ? "" : "opacity-60"}>
                <TD>
                  <p className="font-medium text-navy-900">{u.display_name} {!u.is_active && <Badge tone="danger">Deactivated</Badge>} {!u.email_confirmed && <Badge tone="warning">Unverified</Badge>}</p>
                  <p className="text-xs text-slate-500">{u.email}{u.affiliation ? ` · ${u.affiliation}` : ""}</p>
                </TD>
                <TD><RoleEditor userId={u.id} roles={u.roles} isSelf={u.id === me?.id} canGrantAdmin={isSuper} active={u.is_active} /></TD>
                <TD className="tabular-nums">{u.contribution_count}</TD>
                <TD className="whitespace-nowrap text-slate-500">{formatDate(u.created_at)}</TD>
                <TD className="whitespace-nowrap text-slate-500">{formatDate(u.last_sign_in_at)}</TD>
                <TD />
              </TR>
            ))}
          </TBody>
        </Table>
      </div>
      {pages > 1 && (
        <nav className="mt-4 flex justify-between text-sm"><span className="text-slate-500">{total} users · page {page}/{pages}</span>
          <div className="flex gap-2">{page > 1 && <Button asChild size="sm" variant="outline"><Link href={`?q=${sp.q ?? ""}&page=${page - 1}`}>Previous</Link></Button>}{page < pages && <Button asChild size="sm" variant="outline"><Link href={`?q=${sp.q ?? ""}&page=${page + 1}`}>Next</Link></Button>}</div>
        </nav>
      )}
    </>
  );
}
