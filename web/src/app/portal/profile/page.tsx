import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { ROLE_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { ConsentDefaults, LanguagesManager, ProfileForm } from "./profile-forms";

export const metadata: Metadata = { title: "My profile" };

const CONSENT_LABELS: Record<string, string> = {
  platform_terms: "Platform terms",
  data_collection: "Data collection",
  research_use: "Research use",
  public_publication: "Public publication",
  ai_training: "AI model training",
  commercial_use: "Commercial use",
  audio_recording: "Audio recording",
};

export default async function ProfilePage() {
  const user = await requireUser();
  const supabase = await createClient();
  const [{ data: profile }, { data: myLangs }, { data: langs }, { data: varieties }, { data: consents }] = await Promise.all([
    supabase.from("users").select("*").eq("id", user.id).single(),
    supabase.from("user_languages").select("id, proficiency, language_id, languages(name), language_varieties(name)").eq("user_id", user.id),
    supabase.from("languages").select("id, name").eq("is_active", true).order("sort_order"),
    supabase.from("language_varieties").select("id, language_id, name").eq("is_active", true),
    supabase.from("consents").select("id, consent_type, granted, policy_version, created_at").eq("user_id", user.id).order("created_at", { ascending: false }),
  ]);
  const latest: Record<string, boolean> = {};
  (consents ?? []).forEach((c) => !(c.consent_type in latest) && (latest[c.consent_type] = c.granted));

  return (
    <>
      <PageHeader eyebrow="Account" title="My profile" description="We only ask for what we need. Your email is never shown to reviewers or researchers." />
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
            <CardContent><ProfileForm profile={profile!} /></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Languages I speak</CardTitle></CardHeader>
            <CardContent><LanguagesManager mine={(myLangs ?? []).map((l) => ({ id: l.id, name: l.languages?.name ?? "", variety: l.language_varieties?.name ?? null, proficiency: l.proficiency }))} languages={langs ?? []} varieties={varieties ?? []} /></CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Account</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between gap-2"><span className="text-slate-500">Email</span><span className="font-medium">{user.email}</span></div>
              <div className="flex justify-between gap-2"><span className="text-slate-500">Member since</span><span className="font-medium">{formatDate(profile?.created_at)}</span></div>
              <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-slate-500">Roles</span><span className="flex flex-wrap gap-1">{user.roles.map((r) => <Badge key={r} tone="navy">{ROLE_LABELS[r]}</Badge>)}</span></div>
              <p className="pt-2 text-xs text-slate-500">Want to become a reviewer, linguist or researcher? <a className="font-semibold text-forest-700 underline" href="/contact?topic=research">Tell us about your background.</a></p>
              <p className="text-xs text-slate-500"><a className="font-semibold text-forest-700 underline" href="/forgot-password">Change password</a> · <a className="font-semibold text-forest-700 underline" href="/contact?topic=privacy">Request account deletion or a copy of your data</a></p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Default permissions</CardTitle></CardHeader>
            <CardContent>
              <p className="mb-3 text-sm text-slate-600">Pre-fill these choices on new contributions. You can still change them per contribution.</p>
              <ConsentDefaults initial={{ research_use: latest.research_use ?? false, public_publication: latest.public_publication ?? false, ai_training: latest.ai_training ?? false, commercial_use: latest.commercial_use ?? false }} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Consent history</CardTitle></CardHeader>
            <CardContent>
              <ul className="max-h-72 space-y-2 overflow-y-auto text-sm">
                {(consents ?? []).map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-2">
                    <span>{CONSENT_LABELS[c.consent_type]} <span className="text-xs text-slate-400">v{c.policy_version}</span></span>
                    <span className="flex items-center gap-2"><Badge tone={c.granted ? "success" : "neutral"}>{c.granted ? "Granted" : "Withdrawn"}</Badge><span className="text-xs text-slate-400">{formatDate(c.created_at)}</span></span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
