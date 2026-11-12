import "server-only";

import { createClient } from "@/lib/supabase/server";

export type PlatformStats = {
  languages_supported: number;
  languages_registered: number;
  registered_contributors: number;
  approved_text: number;
  audio_recordings: number;
  audio_hours: number;
  translations: number;
  datasets_available: number;
  total_submissions: number;
};

const EMPTY_STATS: PlatformStats = {
  languages_supported: 0,
  languages_registered: 0,
  registered_contributors: 0,
  approved_text: 0,
  audio_recordings: 0,
  audio_hours: 0,
  translations: 0,
  datasets_available: 0,
  total_submissions: 0,
};

/** Live aggregate statistics from the database (no hardcoded values). */
export async function getPlatformStats(): Promise<{ stats: PlatformStats; ok: boolean }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("platform_stats");
  if (error || !data) return { stats: EMPTY_STATS, ok: false };
  return { stats: { ...EMPTY_STATS, ...(data as Partial<PlatformStats>) }, ok: true };
}

export async function getLanguages() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("languages")
    .select("id, code, iso639_3, name, native_name, family, region, countries, description, is_active, is_priority, is_official_za, script, sort_order")
    .order("sort_order");
  return data ?? [];
}

export async function getActiveLanguages() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("languages")
    .select("id, code, name, native_name, is_priority")
    .eq("is_active", true)
    .order("sort_order");
  return data ?? [];
}

export async function getLanguageStats() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("language_stats");
  const map = new Map<string, { submissions: number; approved: number; audio_seconds: number }>();
  (data ?? []).forEach((r) =>
    map.set(r.code, { submissions: Number(r.submissions), approved: Number(r.approved), audio_seconds: Number(r.audio_seconds) }),
  );
  return map;
}

export async function getTopContributors(limit = 6) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("top_contributors", { p_limit: limit });
  return data ?? [];
}
