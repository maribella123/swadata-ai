import type { AppRole } from "@/lib/constants";
import { ADMIN_ROLES, RESEARCHER_ROLES, REVIEWER_ROLES } from "@/lib/constants";

export type NavItem = { href: string; label: string; icon: string; exact?: boolean };
export type NavSection = { title?: string; items: NavItem[] };
export type Area = "portal" | "review" | "admin" | "researcher";

export const AREA_NAV: Record<Area, NavSection[]> = {
  portal: [
    {
      items: [{ href: "/portal", label: "Dashboard", icon: "LayoutDashboard", exact: true }],
    },
    {
      title: "Contribute",
      items: [
        { href: "/portal/text", label: "Submit Text", icon: "Type" },
        { href: "/portal/documents", label: "Upload Documents", icon: "FileUp" },
        { href: "/portal/audio", label: "Record Audio", icon: "Mic" },
        { href: "/portal/translations", label: "Submit Translation", icon: "Languages" },
        { href: "/portal/conversations", label: "Conversations", icon: "MessagesSquare" },
        { href: "/portal/cultural", label: "Cultural Knowledge", icon: "Sparkles" },
      ],
    },
    {
      title: "Account",
      items: [
        { href: "/portal/contributions", label: "My Contributions", icon: "FolderOpen" },
        { href: "/portal/profile", label: "My Profile", icon: "UserRound" },
      ],
    },
  ],
  review: [
    {
      items: [
        { href: "/review", label: "Review queue", icon: "Inbox", exact: true },
        { href: "/review/assigned", label: "Assigned to me", icon: "ClipboardCheck" },
        { href: "/review/documents", label: "Document extracts", icon: "FileText" },
        { href: "/review/translations", label: "Translation comparison", icon: "Languages" },
        { href: "/review/history", label: "Review history", icon: "History" },
        { href: "/review/workload", label: "Reviewer workload", icon: "Gauge" },
      ],
    },
  ],
  admin: [
    {
      items: [
        { href: "/admin", label: "Overview", icon: "LayoutDashboard", exact: true },
        { href: "/admin/analytics", label: "Analytics", icon: "ChartLine" },
      ],
    },
    {
      title: "People",
      items: [
        { href: "/admin/users", label: "Contributors & roles", icon: "Users" },
        { href: "/admin/access-requests", label: "Access requests", icon: "KeyRound" },
      ],
    },
    {
      title: "Content",
      items: [
        { href: "/admin/contributions", label: "Contributions", icon: "FolderOpen" },
        { href: "/admin/documents", label: "Documents", icon: "FileText" },
        { href: "/admin/audio", label: "Audio", icon: "AudioLines" },
        { href: "/admin/languages", label: "Languages & varieties", icon: "Globe2" },
        { href: "/admin/categories", label: "Categories & tasks", icon: "Tags" },
      ],
    },
    {
      title: "Data",
      items: [
        { href: "/admin/datasets", label: "Datasets & releases", icon: "Database" },
        { href: "/admin/ai-lab", label: "AI Lab", icon: "BrainCircuit" },
      ],
    },
    {
      title: "Governance",
      items: [
        { href: "/admin/governance", label: "Consent & governance", icon: "ShieldCheck" },
        { href: "/admin/jobs", label: "Processing jobs", icon: "Cpu" },
        { href: "/admin/messages", label: "Messages", icon: "Mail" },
        { href: "/admin/audit", label: "Audit logs", icon: "ScrollText" },
        { href: "/admin/settings", label: "System settings", icon: "Settings" },
      ],
    },
  ],
  researcher: [
    {
      items: [
        { href: "/researcher", label: "Datasets", icon: "Database", exact: true },
        { href: "/researcher/requests", label: "My access requests", icon: "KeyRound" },
        { href: "/researcher/benchmarks", label: "Benchmarks & models", icon: "Trophy" },
      ],
    },
  ],
};

export function areaSwitcher(roles: AppRole[]) {
  const has = (r: AppRole[]) => roles.some((x) => r.includes(x));
  return [
    { href: "/portal", label: "Contributor", area: "portal" as Area, show: true },
    { href: "/review", label: "Reviewer", area: "review" as Area, show: has(REVIEWER_ROLES) },
    { href: "/researcher", label: "Researcher", area: "researcher" as Area, show: has(RESEARCHER_ROLES) },
    { href: "/admin", label: "Admin", area: "admin" as Area, show: has(ADMIN_ROLES) },
  ].filter((a) => a.show);
}
