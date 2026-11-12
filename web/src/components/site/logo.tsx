import Link from "next/link";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  // A speech waveform rising into a data point: voice becoming knowledge.
  return (
    <svg viewBox="0 0 40 40" className={cn("size-9", className)} aria-hidden>
      <rect width="40" height="40" rx="10" fill="#102A43" />
      <g stroke="#159B79" strokeWidth="3" strokeLinecap="round">
        <line x1="10" y1="22" x2="10" y2="26" />
        <line x1="15.5" y1="17" x2="15.5" y2="29" />
        <line x1="21" y1="12" x2="21" y2="26" />
        <line x1="26.5" y1="18" x2="26.5" y2="24" />
      </g>
      <circle cx="31" cy="11" r="3" fill="#C49A45" />
    </svg>
  );
}

export function Logo({ light = false, className }: { light?: boolean; className?: string }) {
  return (
    <Link href="/" className={cn("group inline-flex items-center gap-2.5", className)} aria-label="AfriLang Research home">
      <LogoMark />
      <span className={cn("text-lg font-extrabold tracking-tight", light ? "text-white" : "text-navy-900")}>
        AfriLang <span className="text-emerald-500">Research</span>
      </span>
    </Link>
  );
}
