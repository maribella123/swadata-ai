import "server-only";

/**
 * Nudges the Python processing service to pick up queued jobs immediately.
 * Jobs are durable in Postgres (processing_jobs) and the service also polls,
 * so a failure here only delays processing — it never loses work.
 */
export async function kickProcessing(): Promise<boolean> {
  const url = process.env.PROCESSING_SERVICE_URL;
  const token = process.env.PROCESSING_SERVICE_TOKEN;
  if (!url || !token) return false;
  try {
    const res = await fetch(`${url.replace(/\/$/, "")}/v1/jobs/kick`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(2500),
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Calls an authenticated endpoint on the processing service. */
export async function callProcessing<T = unknown>(path: string, body?: unknown, timeoutMs = 15000): Promise<{ ok: boolean; data?: T; error?: string }> {
  const url = process.env.PROCESSING_SERVICE_URL;
  const token = process.env.PROCESSING_SERVICE_TOKEN;
  if (!url || !token) return { ok: false, error: "The processing service is not configured." };
  try {
    const res = await fetch(`${url.replace(/\/$/, "")}${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
    const data = (await res.json().catch(() => ({}))) as T & { detail?: string };
    if (!res.ok) return { ok: false, error: (data as { detail?: string }).detail ?? `Processing service error (${res.status})` };
    return { ok: true, data };
  } catch {
    return { ok: false, error: "The processing service is unreachable. The job remains queued and will run when it is available." };
  }
}
