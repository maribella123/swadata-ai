import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AppRole } from "@/lib/constants";
import { ADMIN_ROLES, RESEARCHER_ROLES, REVIEWER_ROLES } from "@/lib/constants";

export type SessionUser = {
  id: string;
  email: string;
  emailConfirmed: boolean;
  displayName: string;
  roles: AppRole[];
  isActive: boolean;
};

/**
 * Data Access Layer: the single place that reads the session.
 * The user is re-validated with Supabase Auth (getUser), never trusted from cookies alone.
 * Roles are read from the database, which is also what RLS uses.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { data: roles }] = await Promise.all([
    supabase.from("users").select("display_name, is_active").eq("id", user.id).maybeSingle(),
    supabase.rpc("current_roles"),
  ]);

  return {
    id: user.id,
    email: user.email ?? "",
    emailConfirmed: Boolean(user.email_confirmed_at),
    displayName: profile?.display_name || user.email?.split("@")[0] || "Contributor",
    roles: (roles as AppRole[] | null) ?? [],
    isActive: profile?.is_active ?? true,
  };
});

export function hasAnyRole(user: SessionUser | null, roles: AppRole[]) {
  return Boolean(user && user.roles.some((r) => roles.includes(r)));
}

export async function requireUser(next = "/portal"): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  if (!user.isActive) redirect("/login?error=account_disabled");
  return user;
}

export async function requireRole(roles: AppRole[], next = "/portal"): Promise<SessionUser> {
  const user = await requireUser(next);
  if (!hasAnyRole(user, roles)) redirect("/portal?error=forbidden");
  return user;
}

export const requireReviewer = (next = "/review") => requireRole(REVIEWER_ROLES, next);
export const requireAdmin = (next = "/admin") => requireRole(ADMIN_ROLES, next);
export const requireResearcher = (next = "/researcher") => requireRole(RESEARCHER_ROLES, next);
