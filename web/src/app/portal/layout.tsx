import { AppShell } from "@/components/app/app-shell";
import { requireUser } from "@/lib/auth";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("/portal");
  return <AppShell user={user} area="portal">{children}</AppShell>;
}
