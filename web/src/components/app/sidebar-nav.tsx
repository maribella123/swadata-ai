"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard, Type, FileUp, Mic, Languages, MessagesSquare, Sparkles, FolderOpen, UserRound, Inbox, ClipboardCheck, FileText, History, Gauge, ChartLine, Users, KeyRound, AudioLines, Globe2, Tags, Database, BrainCircuit, ShieldCheck, Cpu, Mail, ScrollText, Settings, Trophy, Circle,
  LogOut, Menu, X, type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = { LayoutDashboard, Type, FileUp, Mic, Languages, MessagesSquare, Sparkles, FolderOpen, UserRound, Inbox, ClipboardCheck, FileText, History, Gauge, ChartLine, Users, KeyRound, AudioLines, Globe2, Tags, Database, BrainCircuit, ShieldCheck, Cpu, Mail, ScrollText, Settings, Trophy, Circle };
import { cn } from "@/lib/utils";
import type { Area, NavSection } from "./nav-config";
import { Logo } from "@/components/site/logo";

type AreaLink = { href: string; label: string; area: Area };
type Identity = { name: string; email: string; role: string };

function Icon({ name, className }: { name: string; className?: string }) {
  const C = ICONS[name] ?? Circle;
  return <C className={className} aria-hidden />;
}

function NavBody({ sections, areas, current, identity }: { sections: NavSection[]; areas: AreaLink[]; current: Area; identity: Identity }) {
  const pathname = usePathname();
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {areas.length > 1 && (
        <div className="px-4 pb-3">
          <div className={cn("grid gap-1 rounded-xl bg-mist p-1", areas.length === 3 ? "grid-cols-3" : "grid-cols-2")} role="tablist" aria-label="Workspace">
            {areas.map((a) => (
              <Link
                key={a.href}
                href={a.href}
                role="tab"
                aria-selected={a.area === current}
                className={cn(
                  "rounded-lg px-2 py-1.5 text-center text-xs font-semibold transition-colors",
                  a.area === current ? "bg-white text-navy-900 shadow-sm" : "text-slate-500 hover:text-navy-900",
                )}
              >
                {a.label}
              </Link>
            ))}
          </div>
        </div>
      )}
      <nav aria-label="Workspace navigation" className="flex-1 space-y-5 overflow-y-auto px-3 pb-6">
        {sections.map((s, i) => (
          <div key={i}>
            {s.title && <p className="px-3 pb-1.5 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-slate-400">{s.title}</p>}
            <ul className="space-y-0.5">
              {s.items.map((item) => {
                const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        active ? "bg-forest-700 text-white" : "text-navy-800 hover:bg-navy-50",
                      )}
                    >
                      <Icon name={item.icon} className="size-4 shrink-0" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="border-t border-line p-4">
        <div className="flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-navy-900 text-sm font-bold text-white">
            {identity.name.slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-navy-900">{identity.name}</p>
            <p className="truncate text-xs text-slate-500">{identity.role}</p>
          </div>
          <form action="/auth/signout" method="post">
            <button type="submit" className="grid size-8 place-items-center rounded-lg text-slate-500 hover:bg-navy-50 hover:text-navy-900" aria-label="Sign out" title="Sign out">
              <LogOut className="size-4" />
            </button>
          </form>
        </div>
        <Link href="/" className="mt-3 block text-xs font-medium text-slate-500 hover:text-navy-900">← Back to website</Link>
      </div>
    </div>
  );
}

export function SidebarNav(props: { sections: NavSection[]; areas: AreaLink[]; current: Area; identity: Identity }) {
  return <NavBody {...props} />;
}

export function MobileAppNav(props: { sections: NavSection[]; areas: AreaLink[]; current: Area; identity: Identity }) {
  const pathname = usePathname();
  // The menu is open only on the page where it was opened, so navigating closes it.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const setOpen = (fn: (o: boolean) => boolean) => setOpenOn(fn(open) ? pathname : null);
  return (
    <div className="sticky top-0 z-40 lg:hidden">
      <div className="flex h-14 items-center justify-between border-b border-line bg-white px-4">
        <Logo />
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={open ? "Close navigation" : "Open navigation"} className="grid size-10 place-items-center rounded-lg hover:bg-navy-50">
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>
      {open && (
        <div className="fixed inset-x-0 bottom-0 top-14 flex flex-col overflow-y-auto bg-white pt-4">
          <NavBody {...props} />
        </div>
      )}
    </div>
  );
}
