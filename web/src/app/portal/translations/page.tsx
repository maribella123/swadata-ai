import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/misc";
import { getFormContext } from "@/lib/portal-data";
import { createClient } from "@/lib/supabase/server";
import { TranslationForm } from "./translation-form";

export const metadata: Metadata = { title: "Submit translation" };

export default async function TranslationsPage({ searchParams }: { searchParams: Promise<{ source?: string }> }) {
  const { source } = await searchParams;
  const ctx = await getFormContext("translation");
  const supabase = await createClient();
  const { data: sources } = await supabase
    .from("translation_sources")
    .select("id, text, domain, language_id")
    .eq("is_active", true)
    .order("created_at")
    .limit(200);
  return (
    <>
      <PageHeader
        eyebrow="Contribute"
        title="Submit a translation"
        description="Translate from English into an African language, from an African language into English, or between African languages. Multiple translations of the same sentence are welcome — language has many valid renderings."
      />
      <TranslationForm ctx={ctx} sources={sources ?? []} initialSourceId={source} />
    </>
  );
}
