import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/misc";
import { getFormContext } from "@/lib/portal-data";
import { ConversationForm } from "./conversation-form";

export const metadata: Metadata = { title: "Conversations" };

export default async function ConversationsPage() {
  const ctx = await getFormContext("conversation");
  return (
    <>
      <PageHeader eyebrow="Contribute" title="Write a conversation" description="Natural multi-turn dialogue helps build conversational AI that sounds like real people. Write everyday exchanges, lessons, questions and answers, or problem-solving discussions." />
      <ConversationForm ctx={ctx} />
    </>
  );
}
