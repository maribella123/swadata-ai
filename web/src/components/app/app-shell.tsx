import { ROLE_LABELS } from "@/lib/constants";
import type { SessionUser } from "@/lib/auth";
import { AREA_NAV, areaSwitcher, type Area } from "./nav-config";
import { SidebarNav, MobileAppNav } from "./sidebar-nav";
import { Logo } from "@/components/site/logo";

export function AppShell({ user, area, children }: { user: SessionUser; area: Area; children: React.ReactNode }) {
  const sections = AREA_NAV[area];
  const areas = areaSwitcher(user.roles);
  const topRole = [...user.roles].sort((a, b) => order(b) - order(a))[0] ?? "contributor";
  const identity = { name: user.displayName, email: user.email, role: ROLE_LABELS[topRole] };

  return (
    <div className="min-h-dvh bg-mist/60 lg:grid lg:grid-cols-[17rem_1fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-white lg:flex">
        <div className="px-5 py-5"><Logo /></div>
        <SidebarNav sections={sections} areas={areas} current={area} identity={identity} />
      </aside>
      <MobileAppNav sections={sections} areas={areas} current={area} identity={identity} />
      <main id="main" className="min-w-0 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}

function order(r: string) {
  return ["contributor", "translator", "reviewer", "researcher", "linguist", "admin", "super_admin"].indexOf(r);
}
