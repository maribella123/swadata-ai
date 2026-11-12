import * as React from "react";
import { cn } from "@/lib/utils";

const tones = {
  neutral: "bg-mist text-slate-700 ring-slate-200",
  info: "bg-navy-50 text-info ring-navy-100",
  success: "bg-emerald-50 text-forest-700 ring-emerald-100",
  warning: "bg-gold-100 text-gold-700 ring-gold-400/40",
  danger: "bg-red-50 text-danger ring-red-100",
  gold: "bg-gold-100 text-gold-700 ring-gold-400/40",
  navy: "bg-navy-900 text-white ring-navy-900",
} as const;

export type BadgeTone = keyof typeof tones;

export function Badge({
  tone = "neutral",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset", tones[tone], className)}
      {...props}
    />
  );
}
