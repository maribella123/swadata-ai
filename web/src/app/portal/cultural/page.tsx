import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/misc";
import { getFormContext } from "@/lib/portal-data";
import { CulturalForm } from "./cultural-form";

export const metadata: Metadata = { title: "Cultural knowledge" };

export default async function CulturalPage() {
  const ctx = await getFormContext("cultural");
  return (
    <>
      <PageHeader eyebrow="Contribute" title="Preserve cultural knowledge" description="Proverbs, idioms, folklore, traditional stories, greetings, historical expressions, indigenous terminology and oral histories — with their meaning and context." />
      <CulturalForm ctx={ctx} />
    </>
  );
}
