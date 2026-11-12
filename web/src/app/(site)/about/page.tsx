import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { Compass, HeartHandshake, Scale, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHero } from "@/components/site/page-hero";
import { SectionHeading } from "@/components/site/section-heading";

export const metadata: Metadata = { title: "About", description: "Why SwaData AI exists and the principles that guide it." };

const PRINCIPLES = [
  { icon: HeartHandshake, title: "Community ownership", body: "Language belongs to its speakers. Contributors decide how their data may be used and can change their permissions at any time." },
  { icon: ShieldCheck, title: "Consent by purpose", body: "Collection, research use, public release, AI training and commercial use are separate, explicit permissions — never bundled." },
  { icon: Scale, title: "Linguistic respect", body: "We never auto-correct African languages with English-centric tools. Native speakers and linguists decide what is correct." },
  { icon: Compass, title: "Transparent provenance", body: "Every record keeps its source, licence, consent and full review history from first submission to model-ready dataset." },
];

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="About SwaData AI"
        title="African languages, written into the future of technology."
        description="SwaData AI is a multilingual platform for collecting, digitising, validating and curating African language data — so that African languages are not left behind by artificial intelligence."
        image="/images/students-writing.jpg"
        imageAlt="Young African students writing in exercise books"
      />
      <section className="container-page grid gap-12 py-20 lg:grid-cols-2">
        <div className="prose-swa">
          <h2>The problem</h2>
          <p>
            Most AI systems are trained on a handful of global languages. Millions of speakers of siSwati, isiZulu, Tshivenda,
            Xitsonga and hundreds of other African languages receive poorer search, translation, speech recognition and digital
            services — or none at all. Much of this gap is a data gap: high-quality, consented, well-documented language data
            simply does not exist at scale.
          </p>
          <h2>Our approach</h2>
          <p>
            We start with <strong>siSwati</strong>, spoken in Eswatini and South Africa, and build an architecture that extends to
            all 11 official South African spoken languages and the wider African language family. Native speakers contribute text,
            speech, translations, conversations and cultural knowledge. Reviewers and linguists validate it. Researchers access
            curated, versioned datasets under clear licences.
          </p>
          <p>
            The goal is practical: data that enables <strong>Small Language Models</strong>, machine translation and speech
            technology that can be built and run in Africa, for Africans.
          </p>
        </div>
        <div className="relative min-h-80 overflow-hidden rounded-[2rem] shadow-[var(--shadow-lift)]">
          <Image src="/images/women-meeting.jpg" alt="African women in a meeting around a table" fill sizes="(min-width: 1024px) 45vw, 100vw" className="object-cover" />
        </div>
      </section>
      <section className="bg-ivory">
        <div className="container-page py-20">
          <SectionHeading eyebrow="Principles" title="How we work" />
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {PRINCIPLES.map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-2xl border border-line bg-white p-6 shadow-[var(--shadow-soft)]">
                <Icon className="size-6 text-forest-700" aria-hidden />
                <h3 className="mt-4 font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{body}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 flex flex-wrap gap-3">
            <Button asChild><Link href="/register">Become a contributor</Link></Button>
            <Button asChild variant="outline"><Link href="/governance">Read our data governance</Link></Button>
          </div>
        </div>
      </section>
    </>
  );
}
