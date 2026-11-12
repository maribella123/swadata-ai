import { AppShell } from "@/components/app/app-shell";
import { requireAdmin } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin("/admin");
  return <AppShell user={user} area="admin">{children}</AppShell>;
}
