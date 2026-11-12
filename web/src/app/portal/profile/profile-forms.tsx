"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { addLanguage, removeLanguage, saveDefaultConsents, updateProfile, type ProfileState } from "./actions";

type Profile = { display_name: string; public_handle: string | null; bio: string; affiliation: string; region: string; show_in_recognition: boolean };

export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, action] = useActionState<ProfileState, FormData>(updateProfile, {});
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-5">
      {state.ok && <Alert tone="success">Profile saved.</Alert>}
      {state.error && <Alert tone="danger">{state.error}</Alert>}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Display name" htmlFor="display_name" required error={fe.display_name}><Input id="display_name" name="display_name" defaultValue={profile.display_name} required /></Field>
        <Field label="Public handle" htmlFor="public_handle" error={fe.public_handle} hint="Used for public recognition, e.g. @lilanga"><Input id="public_handle" name="public_handle" defaultValue={profile.public_handle ?? ""} /></Field>
        <Field label="Affiliation" htmlFor="affiliation" hint="University, school or organisation (optional)"><Input id="affiliation" name="affiliation" defaultValue={profile.affiliation} /></Field>
        <Field label="Region" htmlFor="region" hint="Province or region (optional)"><Input id="region" name="region" defaultValue={profile.region} /></Field>
      </div>
      <Field label="About you" htmlFor="bio" hint="Optional"><Textarea id="bio" name="bio" defaultValue={profile.bio} rows={3} /></Field>
      <Checkbox id="show_in_recognition" defaultChecked={profile.show_in_recognition} label="Show me in public contributor recognition" description="Your handle (or display name) and approved-contribution count may appear on the homepage." />
      <SubmitButton>Save profile</SubmitButton>
    </form>
  );
}

export function LanguagesManager({
  mine,
  languages,
  varieties,
}: {
  mine: { id: string; name: string; variety: string | null; proficiency: string }[];
  languages: { id: string; name: string }[];
  varieties: { id: string; language_id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [lang, setLang] = useState(languages[0]?.id ?? "");
  const [variety, setVariety] = useState("");
  const [prof, setProf] = useState("native");
  const vs = varieties.filter((v) => v.language_id === lang);
  return (
    <div className="space-y-4">
      {mine.length === 0 ? <p className="text-sm text-slate-500">No languages added yet.</p> : (
        <ul className="divide-y divide-line">
          {mine.map((l) => (
            <li key={l.id} className="flex items-center justify-between py-2.5">
              <span className="text-sm"><span className="font-semibold text-navy-900">{l.name}</span>{l.variety && <span className="text-slate-500"> · {l.variety}</span>} <Badge className="ml-2 capitalize">{l.proficiency}</Badge></span>
              <Button variant="ghost" size="icon" aria-label={`Remove ${l.name}`} disabled={pending} onClick={() => start(async () => { const r = await removeLanguage(l.id); if (r.ok) router.refresh(); else toast.error(r.error); })}><Trash2 /></Button>
            </li>
          ))}
        </ul>
      )}
      <div className="grid gap-3 rounded-xl bg-mist p-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
        <Field label="Language" htmlFor="add_lang"><Select id="add_lang" value={lang} onChange={(e) => { setLang(e.target.value); setVariety(""); }}>{languages.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</Select></Field>
        <Field label="Variety" htmlFor="add_variety"><Select id="add_variety" value={variety} onChange={(e) => setVariety(e.target.value)} disabled={!vs.length}><option value="">Not specified</option>{vs.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</Select></Field>
        <Field label="Proficiency" htmlFor="add_prof"><Select id="add_prof" value={prof} onChange={(e) => setProf(e.target.value)}><option value="native">Native</option><option value="fluent">Fluent</option><option value="intermediate">Intermediate</option><option value="learner">Learner</option></Select></Field>
        <Button type="button" disabled={pending || !lang} onClick={() => start(async () => { const r = await addLanguage(lang, prof, variety || null); if (r.ok) { toast.success("Language saved"); router.refresh(); } else toast.error(r.error); })}>Add</Button>
      </div>
    </div>
  );
}

export function ConsentDefaults({ initial }: { initial: Record<"research_use" | "public_publication" | "ai_training" | "commercial_use", boolean> }) {
  const [v, setV] = useState(initial);
  const [pending, start] = useTransition();
  const router = useRouter();
  const t = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV((s) => ({ ...s, [k]: e.target.checked }));
  return (
    <div className="space-y-1">
      <Checkbox id="d_research" label="Research use" checked={v.research_use} onChange={t("research_use")} />
      <Checkbox id="d_ai" label="AI model training" checked={v.ai_training} onChange={t("ai_training")} />
      <Checkbox id="d_public" label="Public dataset publication" checked={v.public_publication} onChange={t("public_publication")} />
      <Checkbox id="d_commercial" label="Commercial AI applications" checked={v.commercial_use} onChange={t("commercial_use")} />
      <Button className="mt-3" size="sm" disabled={pending} onClick={() => start(async () => { const r = await saveDefaultConsents(v); if (r.ok) { toast.success("Default permissions saved"); router.refresh(); } else toast.error(r.error); })}>Save defaults</Button>
    </div>
  );
}
