import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/misc";
import { getFormContext } from "@/lib/portal-data";
import { createClient } from "@/lib/supabase/server";
import { AudioForm } from "./audio-form";

export const metadata: Metadata = { title: "Record audio" };

export default async function AudioPage() {
  const ctx = await getFormContext("audio");
  const supabase = await createClient();
  const { data: setting } = await supabase.from("system_settings").select("value").eq("key", "transcription_enabled").maybeSingle();
  return (
    <>
      <PageHeader eyebrow="Contribute" title="Record or upload audio" description="Speak naturally in your language, or read a prompt aloud. Recordings are stored privately and your identity is replaced by a pseudonym." />
      <AudioForm ctx={ctx} transcriptionEnabled={setting?.value === true} />
    </>
  );
}
