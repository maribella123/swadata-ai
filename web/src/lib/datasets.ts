import "server-only";

import { createClient } from "@/lib/supabase/server";

export const DATASET_TYPE_LABELS: Record<string, string> = {
  monolingual_text: "Monolingual text",
  parallel_text: "Parallel translations",
  conversation: "Conversations",
  instruction: "Instruction tuning",
  cultural: "Cultural language data",
  speech: "Speech & transcription",
};

export const ACCESS_LABELS: Record<string, { label: string; tone: "success" | "info" | "warning" }> = {
  public: { label: "Public", tone: "success" },
  registered: { label: "Registered users", tone: "info" },
  restricted: { label: "Restricted — request access", tone: "warning" },
};

export async function listDatasets(filters: { q?: string; type?: string; lang?: string } = {}) {
  const supabase = await createClient();
  let query = supabase
    .from("datasets")
    .select(
      "id, slug, name, summary, dataset_type, access_level, is_benchmark, intended_use, data_licenses(code, name), dataset_releases(id, version, status, record_count, language_codes, published_at)",
    )
    .eq("is_active", true)
    .order("name");
  if (filters.type) query = query.eq("dataset_type", filters.type as never);
  if (filters.q) query = query.or(`name.ilike.%${filters.q.replace(/[%,()]/g, "")}%,summary.ilike.%${filters.q.replace(/[%,()]/g, "")}%`);
  const { data } = await query;
  const rows = (data ?? []).map((d) => {
    const published = (d.dataset_releases ?? [])
      .filter((r) => r.status === "published")
      .sort((a, b) => (b.published_at ?? "").localeCompare(a.published_at ?? ""));
    return { ...d, latest: published[0] ?? null, releaseCount: published.length };
  });
  return filters.lang ? rows.filter((r) => r.latest?.language_codes.includes(filters.lang!)) : rows;
}

export async function getDataset(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("datasets")
    .select(
      "*, data_licenses(code, name, url, allows_commercial), dataset_releases(id, version, status, record_count, language_codes, collection_start, collection_end, stats, quality_summary, provenance, split_config, notes, published_at, dataset_exports(id, format, status, file_size_bytes, record_count, checksum_sha256, completed_at))",
    )
    .eq("slug", slug)
    .maybeSingle();
  if (!data) return null;
  const releases = (data.dataset_releases ?? [])
    .filter((r) => r.status === "published")
    .sort((a, b) => (b.published_at ?? "").localeCompare(a.published_at ?? ""));
  const { data: canAccess } = await supabase.rpc("can_access_dataset", { p_dataset_id: data.id });
  return { ...data, releases, canAccess: Boolean(canAccess) };
}
