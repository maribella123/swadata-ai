import { AppShell } from "@/components/app/app-shell";
import { requireResearcher } from "@/lib/auth";

export default async function ResearcherLayout({ children }: { children: React.ReactNode }) {
  const user = await requireResearcher("/researcher");
  return <AppShell user={user} area="researcher">{children}</AppShell>;
}
