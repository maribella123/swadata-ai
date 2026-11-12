import "server-only";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

/** Hash of the client IP (never stored raw — data minimisation). */
export async function clientKey(): Promise<string> {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "unknown";
  return createHash("sha256").update(`swadata:${ip}`).digest("hex").slice(0, 32);
}

/**
 * Fixed-window rate limit backed by Postgres (works across serverless instances).
 * Fails open if the limiter itself is unavailable, so outages don't lock users out.
 */
export async function rateLimit(scope: string, max: number, windowSeconds: number): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("check_rate_limit", {
      p_bucket: `${scope}:${await clientKey()}`,
      p_max: max,
      p_window_seconds: windowSeconds,
    });
    if (error) return true;
    return Boolean(data);
  } catch {
    return true;
  }
}
