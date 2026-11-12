"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, Star } from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";

type Lang = {
  id: string;
  code: string;
  iso639_3: string;
  name: string;
  native_name: string;
  family: string;
  region: string;
  is_active: boolean;
  is_priority: boolean;
  is_official_za: boolean;
};

export function LanguageGrid({
  languages,
  stats,
  limitActive,
}: {
  languages: Lang[];
  stats: Record<string, { submissions: number; approved: number }>;
  limitActive?: number;
}) {
  const [showRegistry, setShowRegistry] = useState(false);
  const active = languages.filter((l) => l.is_active).slice(0, limitActive ?? 999);
  const registry = languages.filter((l) => !l.is_active);

  return (
    <div>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {active.map((l) => {
          const s = stats[l.code];
          return (
            <li key={l.id} className={cn(l.is_priority && "sm:col-span-2")}>
              <Link
                href={`/languages/${l.code}`}
                className={cn(
                  "group relative flex h-full flex-col overflow-hidden rounded-2xl border p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]",
                  l.is_priority ? "border-forest-700 bg-forest-700 text-white" : "border-line bg-white shadow-[var(--shadow-soft)]",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={cn(
                      "rounded-md px-2 py-0.5 font-mono text-xs font-semibold",
                      l.is_priority ? "bg-white/15 text-white" : "bg-navy-50 text-navy-700",
                    )}
                  >
                    {l.code} · {l.iso639_3}
                  </span>
                  {l.is_priority && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-gold-500 px-2 py-0.5 text-xs font-bold text-navy-950">
                      <Star className="size-3" aria-hidden /> Priority
                    </span>
                  )}
                </div>
                <p className={cn("mt-6 font-display text-2xl font-semibold", l.is_priority ? "text-white" : "text-navy-900")}>{l.name}</p>
                {l.native_name !== l.name && (
                  <p className={cn("text-sm", l.is_priority ? "text-emerald-100" : "text-slate-500")}>{l.native_name}</p>
                )}
                <p className={cn("mt-1 text-xs", l.is_priority ? "text-emerald-100" : "text-slate-500")}>{l.family}</p>
                <div className={cn("mt-5 flex gap-4 border-t pt-3 text-xs", l.is_priority ? "border-white/20 text-emerald-50" : "border-line text-slate-500")}>
                  <span>
                    <strong className={cn("tabular-nums", l.is_priority ? "text-white" : "text-navy-900")}>{formatNumber(s?.approved ?? 0)}</strong> approved
                  </span>
                  <span>
                    <strong className={cn("tabular-nums", l.is_priority ? "text-white" : "text-navy-900")}>{formatNumber(s?.submissions ?? 0)}</strong> submitted
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      {registry.length > 0 && (
        <div className="mt-8 rounded-2xl border border-line bg-ivory/60">
          <button
            type="button"
            onClick={() => setShowRegistry((v) => !v)}
            aria-expanded={showRegistry}
            aria-controls="language-registry"
            className="flex w-full items-center justify-between gap-4 p-5 text-left"
          >
            <span>
              <span className="font-semibold text-navy-900">African language registry</span>
              <span className="block text-sm text-slate-500">
                {registry.length} more African languages registered and ready for activation as community reviewers join.
              </span>
            </span>
            <ChevronDown className={cn("size-5 shrink-0 text-navy-700 transition-transform", showRegistry && "rotate-180")} aria-hidden />
          </button>
          {showRegistry && (
            <ul id="language-registry" className="grid gap-2 border-t border-line p-5 sm:grid-cols-2 lg:grid-cols-4">
              {registry.map((l) => (
                <li key={l.id} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm">
                  <span>
                    <span className="font-medium text-navy-900">{l.name}</span>
                    <span className="ml-2 text-slate-500">{l.native_name !== l.name ? l.native_name : ""}</span>
                  </span>
                  <span className="font-mono text-xs text-slate-400">{l.code}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
