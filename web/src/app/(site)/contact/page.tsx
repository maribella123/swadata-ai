import type { Metadata } from "next";
import { Mail, ShieldCheck, Users } from "lucide-react";
import { PageHero } from "@/components/site/page-hero";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = { title: "Contact" };

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ topic?: string }> }) {
  const { topic } = await searchParams;
  return (
    <>
      <PageHero eyebrow="Contact" title="Let's build this together." description="Questions, partnerships, research access, or a data rights request — we read every message." />
      <section className="container-page grid gap-12 py-16 lg:grid-cols-[1fr_1.4fr]">
        <div className="space-y-6">
          {[
            { icon: Users, t: "Partnerships", d: "Universities, schools, publishers, broadcasters and cultural organisations." },
            { icon: Mail, t: "Research access", d: "Ask about restricted datasets, benchmarks or collaboration." },
            { icon: ShieldCheck, t: "Privacy & rights", d: "Request access to, correction of, or deletion of your personal information, or raise a copyright concern." },
          ].map(({ icon: Icon, t, d }) => (
            <div key={t} className="flex gap-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-forest-700"><Icon className="size-5" /></span>
              <div><p className="font-semibold text-navy-900">{t}</p><p className="text-sm text-slate-600">{d}</p></div>
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-line bg-white p-6 shadow-[var(--shadow-soft)] sm:p-8">
          <ContactForm defaultTopic={topic} />
        </div>
      </section>
    </>
  );
}
