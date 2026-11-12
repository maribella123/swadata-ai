import type { Metadata } from "next";
import { getLanguages, getLanguageStats } from "@/lib/public-data";
import { LanguageGrid } from "@/components/site/language-grid";
import { PageHero } from "@/components/site/page-hero";

export const metadata: Metadata = { title: "Supported languages", description: "Languages supported by SwaData AI, starting with siSwati." };
export const dynamic = "force-dynamic";

export default async function LanguagesPage() {
  const [languages, stats] = await Promise.all([getLanguages(), getLanguageStats()]);
  return (
    <>
      <PageHero
        eyebrow="Supported languages"
        title="Every language is a library."
        description="We support all 11 official South African spoken languages, with siSwati as our founding priority. Additional African languages are registered with standard BCP-47 and ISO 639-3 identifiers and are activated as reviewer communities form."
      />
      <div className="container-page py-16">
        <LanguageGrid languages={languages} stats={Object.fromEntries(stats)} />
        <p className="mt-8 text-sm text-slate-500">
          Identifiers follow BCP-47 (ISO 639-1 where available, otherwise ISO 639-3) with the ISO 639-3 code shown alongside. Want
          your language activated? <a className="font-semibold text-forest-700 underline" href="/contact?topic=partnership">Tell us about your community.</a>
        </p>
      </div>
    </>
  );
}
