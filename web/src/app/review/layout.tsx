import { AppShell } from "@/components/app/app-shell";
import { requireReviewer } from "@/lib/auth";

export default async function ReviewLayout({ children }: { children: React.ReactNode }) {
  const user = await requireReviewer("/review");
  return <AppShell user={user} area="review">{children}</AppShell>;
}
