import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { ContributionType } from "@/lib/constants";

export type FormContext = Awaited<ReturnType<typeof getFormContext>>;

/** Reference data every contribution form needs, plus the user's saved defaults. */
export async function getFormContext(type: ContributionType) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [langs, varieties, cats, licences, myLangs, consents] = await Promise.all([
    supabase.from("languages").select("id, code, name, native_name, is_priority").eq("is_active", true).order("sort_order"),
    supabase.from("language_varieties").select("id, language_id, code, name").eq("is_active", true).order("name"),
    supabase.from("content_categories").select("id, key, name, applies_to").eq("is_active", true).order("sort_order"),
    supabase.from("data_licenses").select("id, code, name").eq("is_active", true).order("code"),
    user ? supabase.from("user_languages").select("language_id, variety_id, proficiency").eq("user_id", user.id) : Promise.resolve({ data: [] }),
    user
      ? supabase.from("consents").select("consent_type, granted, created_at").eq("user_id", user.id).order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);

  const latest = new Map<string, boolean>();
  (consents.data ?? []).forEach((c) => {
    if (!latest.has(c.consent_type)) latest.set(c.consent_type, c.granted);
  });

  const languages = langs.data ?? [];
  const preferred = (myLangs.data ?? [])[0];
  const defaultLanguage =
    preferred?.language_id ?? languages.find((l) => l.is_priority)?.id ?? languages[0]?.id ?? "";

  return {
    languages,
    varieties: varieties.data ?? [],
    categories: (cats.data ?? []).filter((c) => c.applies_to.includes(type)),
    licences: licences.data ?? [],
    defaultLanguage,
    defaultVariety: preferred?.variety_id ?? "",
    defaultPermissions: {
      allow_research: latest.get("research_use") ?? false,
      allow_public_release: latest.get("public_publication") ?? false,
      allow_ai_training: latest.get("ai_training") ?? false,
      allow_commercial: latest.get("commercial_use") ?? false,
    },
  };
}
