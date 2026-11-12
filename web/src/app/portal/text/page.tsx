import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/misc";
import { getFormContext } from "@/lib/portal-data";
import { TextForm } from "./text-form";

export const metadata: Metadata = { title: "Submit text" };

export default async function TextPage() {
  const ctx = await getFormContext("text");
  return (
    <>
      <PageHeader eyebrow="Contribute" title="Submit text" description="Sentences, paragraphs, stories, questions and answers, educational material or technical terminology — written in your language." />
      <TextForm ctx={ctx} />
    </>
  );
}
