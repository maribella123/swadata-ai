import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Database, FileCheck2, Layers, ShieldCheck, Upload, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHero } from "@/components/site/page-hero";
import { SectionHeading } from "@/components/site/section-heading";

export const metadata: Metadata = { title: "How it works" };

const FLOW = [
  { icon: UserCheck, title: "1. Register and consent", body: "Create an account, verify your email and choose the languages you speak. You accept the platform terms; every later submission records its own purpose-specific permissions." },
  { icon: Upload, title: "2. Contribute", body: "Submit text, upload documents, record audio in the browser, translate prompts, write conversations or document proverbs. Original files go to private, encrypted storage." },
  { icon: FileCheck2, title: "3. Automatic checks", body: "Language-agnostic checks run immediately: Unicode normalisation, duplicate detection, length and metadata validation. Documents are extracted and OCR'd in the background; audio is measured." },
  { icon: ShieldCheck, title: "4. Human review", body: "Native-speaker reviewers approve, reject or request changes. Corrections are saved as new versions — your original is always preserved. Linguists verify document rights and handle restricted cultural material." },
  { icon: Layers, title: "5. Curation", body: "Approved data moves from the raw layer to validated, then curated. Administrators build versioned dataset releases from items whose permissions allow research and AI training." },
  { icon: Database, title: "6. Responsible release", body: "A second administrator approves each release (four-eyes rule). Researchers download exports — CSV, JSONL, Parquet, TXT or WAV — with data cards, provenance and contributor-aware splits." },
];

export default function HowItWorksPage() {
  return (
    <>
      <PageHero
        eyebrow="How it works"
        title="A careful path from contribution to dataset."
        description="Quality and consent are built into every step. Nothing reaches a dataset without human review and explicit permission."
        image="/images/conversation.jpg"
        imageAlt="Two women in conversation at a table by a window"
      />
      <section className="container-page py-20">
        <ol className="relative grid gap-6 lg:grid-cols-2">
          {FLOW.map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex gap-5 rounded-2xl border border-line bg-white p-6 shadow-[var(--shadow-soft)]">
              <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-forest-700 text-white">
                <Icon className="size-5" aria-hidden />
              </span>
              <div>
                <h2 className="text-lg font-bold">{title}</h2>
                <p className="mt-1.5 leading-relaxed text-slate-600">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
      <section className="bg-navy-950">
        <div className="container-page py-20">
          <SectionHeading eyebrow="Data layers" title="Four layers, never overwritten." light />
          <div className="mt-10 grid gap-4 md:grid-cols-4">
            {[
              ["Raw", "Exactly as submitted, with original files and versions."],
              ["Validated", "Approved by a reviewer; corrections stored as versions."],
              ["Curated", "Deduplicated, permission-filtered and documented."],
              ["Model-ready", "Split, formatted and released as a versioned dataset."],
            ].map(([t, d], i) => (
              <div key={t} className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
                <p className="font-display text-3xl text-gold-400">0{i + 1}</p>
                <p className="mt-3 text-lg font-semibold text-white">{t}</p>
                <p className="mt-1 text-sm text-navy-200">{d}</p>
              </div>
            ))}
          </div>
          <Button asChild variant="light" className="mt-10"><Link href="/register">Get started <ArrowRight /></Link></Button>
        </div>
      </section>
    </>
  );
}
