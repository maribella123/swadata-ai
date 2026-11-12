import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const nf = new Intl.NumberFormat("en-ZA");
export function formatNumber(n: number | null | undefined) {
  return nf.format(Number(n ?? 0));
}

export function formatDate(value: string | null | undefined, withTime = false) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(new Date(value));
}

export function formatBytes(bytes: number | null | undefined) {
  const b = Number(bytes ?? 0);
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

export function formatDuration(seconds: number | null | undefined) {
  const s = Math.round(Number(seconds ?? 0));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

export function truncate(text: string | null | undefined, max = 140) {
  const t = text ?? "";
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

/** Make a filename safe for object storage keys. */
export function safeFileName(name: string) {
  const dot = name.lastIndexOf(".");
  const base = (dot > 0 ? name.slice(0, dot) : name)
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "file";
  const ext = dot > 0 ? name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8) : "";
  return ext ? `${base}.${ext}` : base;
}

/** Map Postgres / PostgREST errors to messages safe to show users. */
export function friendlyError(error: { message?: string; code?: string } | null | undefined): string {
  if (!error) return "Something went wrong. Please try again.";
  const msg = error.message ?? "";
  if (error.code === "42501" || /row-level security/i.test(msg)) {
    return /row-level security/i.test(msg) ? "You do not have permission to perform this action." : msg;
  }
  if (error.code === "23505") return "This record already exists.";
  if (error.code === "23514") return "Some of the information provided is not valid. Please check the form.";
  if (error.code === "P0001" || error.code === "22023" || error.code === "P0002") return msg;
  return "Something went wrong. Please try again.";
}
