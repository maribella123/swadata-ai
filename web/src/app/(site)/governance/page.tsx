import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PageHero } from "@/components/site/page-hero";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";

export const metadata: Metadata = { title: "Data governance and licensing" };
export const dynamic = "force-dynamic";

const PERMISSIONS = [
  ["Data collection", "Required to submit. Allows SwaData AI to store and review your contribution."],
  ["Research use", "Allows inclusion in research datasets available to approved researchers."],
  ["Public dataset publication", "Allows inclusion in datasets anyone may download."],
  ["AI model training", "Allows use to train or fine-tune AI models. Required for every dataset release."],
  ["Commercial AI applications", "Allows use in commercial products. Off by default."],
];

export default async function GovernancePage() {
  const supabase = await createClient();
  const { data: licences } = await supabase.from("data_licenses").select("code, name, url, allows_commercial, requires_attribution, share_alike, description").eq("is_active", true).order("code");
  return (
    <>
      <PageHero
        tone="navy"
        eyebrow="Data governance & licensing"
        title="Consent is specific, recorded and revocable."
        description="Our governance model separates every purpose, preserves provenance, and keeps copyrighted and culturally sensitive material out of public datasets unless rights are verified."
      />
      <section className="container-page py-16">
        <h2 className="font-display text-3xl font-semibold">Five separate permissions</h2>
        <p className="mt-2 max-w-3xl text-slate-600">Recorded per contribution, never bundled. You can change them later from &quot;My contributions&quot;; changes apply to future dataset releases.</p>
        <div className="mt-8 grid gap-4 md:grid-cols-5">
          {PERMISSIONS.map(([t, d], i) => (
            <div key={t} className="rounded-2xl border border-line p-5">
              <p className="font-display text-2xl text-gold-500">0{i + 1}</p>
              <p className="mt-2 font-semibold text-navy-900">{t}</p>
              <p className="mt-1 text-sm text-slate-600">{d}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="bg-ivory">
        <div className="container-page grid gap-12 py-16 lg:grid-cols-2">
          <div className="prose-swa">
            <h2>Dataset inclusion rules</h2>
            <ul>
              <li>Status <strong>approved</strong> by a reviewer who is not the contributor.</li>
              <li>Contributor granted <strong>research use</strong> and <strong>AI training</strong>; public datasets also require <strong>public publication</strong>, and commercially-licensed datasets require <strong>commercial use</strong>.</li>
              <li>Document extracts additionally require each segment to be approved and the document&apos;s rights to be <strong>verified</strong> by a linguist or administrator, with digitisation and AI-training permission.</li>
              <li>Cultural items marked <strong>restricted</strong> are never released.</li>
              <li>Every release is approved by a second administrator (four-eyes rule) and is immutable once published.</li>
            </ul>
            <h2>Cultural sensitivity</h2>
            <p>
              Contributors classify cultural knowledge as public, community or restricted. Restricted material — such as sacred or
              ceremonial knowledge — is visible only to the contributor, senior linguists and administrators.
            </p>
            <h2>Security & retention</h2>
            <p>
              Data access is enforced in the database through Row Level Security. Files live in private storage buckets. Sensitive
              actions (role changes, rights decisions, releases, consent changes) are written to an append-only audit log. Database
              backups follow Supabase point-in-time recovery on production.
            </p>
          </div>
          <div>
            <h2 className="font-display text-2xl font-semibold">Licences in use</h2>
            <div className="mt-4 overflow-hidden rounded-2xl border border-line bg-white">
              <Table className="min-w-0">
                <THead><TR><TH>Licence</TH><TH>Commercial</TH><TH>Attribution</TH></TR></THead>
                <TBody>
                  {(licences ?? []).map((l) => (
                    <TR key={l.code}>
                      <TD>
                        <p className="font-semibold text-navy-900">{l.url ? <a className="underline" href={l.url} target="_blank" rel="noreferrer">{l.name}</a> : l.name}</p>
                        <p className="text-xs text-slate-500">{l.description}</p>
                      </TD>
                      <TD>{l.allows_commercial ? "Yes" : "No"}</TD>
                      <TD>{l.requires_attribution ? "Required" : "Not required"}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
