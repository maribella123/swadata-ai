import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  AudioLines,
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  Feather,
  Globe2,
  Handshake,
  Languages,
  Library,
  MessagesSquare,
  Mic,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Type,
  UserPlus,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getLanguages, getLanguageStats, getPlatformStats, getTopContributors } from "@/lib/public-data";
import { formatNumber } from "@/lib/utils";
import { LanguageGrid } from "@/components/site/language-grid";
import { SectionHeading } from "@/components/site/section-heading";

export const dynamic = "force-dynamic";

const STEPS = [
  { icon: UserPlus, title: "Register", body: "Create a free account and record your consent preferences — you stay in control of how your data is used." },
  { icon: Languages, title: "Choose a language", body: "Pick the languages and varieties you speak. siSwati is our founding priority language." },
  { icon: Feather, title: "Contribute language data", body: "Write, record, translate, upload documents or share proverbs and oral histories." },
  { icon: ShieldCheck, title: "Validate submissions", body: "Native-speaker reviewers and linguists check accuracy, quality and cultural appropriateness." },
  { icon: BrainCircuit, title: "Build African Language AI", body: "Approved, permissioned data becomes versioned datasets for Small Language Models and research." },
];

const CATEGORIES = [
  { icon: Type, title: "Text and sentences", body: "Everyday sentences, paragraphs, questions and technical terms.", href: "/portal/text" },
  { icon: BookOpen, title: "Books and documents", body: "Digitise PDFs, Word files, EPUBs and scanned pages with OCR.", href: "/portal/documents" },
  { icon: ScrollText, title: "Poems and literature", body: "Poetry with line and stanza structure preserved.", href: "/portal/documents" },
  { icon: Mic, title: "Audio and speech", body: "Record in your browser or upload WAV, MP3, WebM or M4A.", href: "/portal/audio" },
  { icon: Languages, title: "Translation", body: "English ⇄ African language and African ⇄ African translations.", href: "/portal/translations" },
  { icon: MessagesSquare, title: "Conversations", body: "Multi-turn dialogues with speaker roles for conversational AI.", href: "/portal/conversations" },
  { icon: Sparkles, title: "Proverbs and idioms", body: "Expressions with meaning, literal translation and context.", href: "/portal/cultural" },
  { icon: Library, title: "Cultural knowledge", body: "Folklore, greetings, oral histories and indigenous terminology.", href: "/portal/cultural" },
];

const RESEARCH = [
  { title: "Small Language Models", body: "Compact, efficient models that run on affordable hardware and serve African communities directly." },
  { title: "Machine translation", body: "Reviewed parallel text between African languages and English, and between African languages." },
  { title: "Speech recognition", body: "Consented recordings with reviewed transcripts for ASR and voice interfaces." },
  { title: "Conversational AI", body: "Natural dialogues and instruction data grounded in local contexts." },
  { title: "Language preservation", body: "A durable, provenance-tracked archive of living language and cultural knowledge." },
];

export default async function HomePage() {
  const [{ stats, ok }, languages, langStats, contributors] = await Promise.all([
    getPlatformStats(),
    getLanguages(),
    getLanguageStats(),
    getTopContributors(6),
  ]);

  const impact = [
    { label: "Languages supported", value: stats.languages_supported, icon: Globe2 },
    { label: "Registered contributors", value: stats.registered_contributors, icon: Users },
    { label: "Approved text contributions", value: stats.approved_text, icon: Type },
    { label: "Approved audio recordings", value: stats.audio_recordings, icon: AudioLines },
    { label: "Approved translations", value: stats.translations, icon: Languages },
    { label: "Datasets available", value: stats.datasets_available, icon: Library },
  ];

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden bg-ivory">
        <div className="container-page grid items-center gap-12 py-14 lg:grid-cols-[1.05fr_1fr] lg:py-24">
          <div className="animate-fade-up">
            <p className="eyebrow mb-5 flex items-center gap-3">
              <span className="gold-rule" /> siSwati first · Built for Africa
            </p>
            <h1 className="font-display text-[2.6rem] leading-[1.05] font-semibold sm:text-6xl lg:text-[4.25rem]">
              Your Language Deserves a Place in the Future of AI.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600">
              Join a growing community preserving, digitising and advancing African languages through language data, cultural
              knowledge and artificial intelligence.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/register">
                  Start Contributing <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/languages">Explore African Languages</Link>
              </Button>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
              {["Consent for every use", "Native-speaker review", "Provenance on every record"].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-500" aria-hidden /> {t}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative animate-fade-up [animation-delay:120ms]">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] shadow-[var(--shadow-lift)] sm:aspect-[5/5] lg:aspect-[4/5]">
              <Image
                src="/images/hero-researchers.jpg"
                alt="Young African technologists working together at computers"
                fill
                priority
                sizes="(min-width: 1024px) 45vw, 100vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-navy-950/55 via-transparent to-transparent" />
            </div>
            <div className="absolute -bottom-6 left-4 right-4 rounded-2xl border border-white/60 bg-white/95 p-4 shadow-[var(--shadow-lift)] backdrop-blur sm:left-auto sm:right-6 sm:w-72">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Live on SwaData AI</p>
              <p className="mt-1 font-display text-3xl font-semibold text-navy-900 tabular-nums">
                {formatNumber(stats.total_submissions)}
              </p>
              <p className="text-sm text-slate-600">language contributions submitted across {formatNumber(stats.languages_supported)} languages</p>
            </div>
            <div className="absolute -top-4 -left-3 hidden rounded-xl bg-navy-900 px-4 py-3 text-white shadow-[var(--shadow-lift)] sm:block">
              <p className="text-xs text-navy-200">Founding language</p>
              <p className="font-display text-lg">siSwati</p>
            </div>
          </div>
        </div>
      </section>

      {/* A. PLATFORM IMPACT */}
      <section aria-labelledby="impact" className="border-y border-line bg-white">
        <div className="container-page py-16">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <SectionHeading id="impact" eyebrow="Platform impact" title="Every number here is live." />
            <p className="max-w-sm text-sm text-slate-500">
              Figures are read directly from the SwaData AI database and only count reviewer-approved contributions.
              {!ok && " Statistics are temporarily unavailable."}
            </p>
          </div>
          <dl className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-3 lg:grid-cols-6">
            {impact.map(({ label, value, icon: Icon }) => (
              <div key={label} className="bg-white p-5 sm:p-6">
                <Icon className="size-5 text-emerald-500" aria-hidden />
                <dd className="mt-4 font-display text-3xl font-semibold text-navy-900 tabular-nums sm:text-4xl">{formatNumber(value)}</dd>
                <dt className="mt-1 text-sm text-slate-500">{label}</dt>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* B. SUPPORTED LANGUAGES */}
      <section aria-labelledby="languages" className="bg-white">
        <div className="container-page py-20">
          <SectionHeading
            id="languages"
            eyebrow="Supported languages"
            title="All 11 official South African spoken languages — and growing."
            description="siSwati leads our first collection campaign. The language registry is designed to expand across Africa: administrators can activate new languages without code changes."
          />
          <div className="mt-12">
            <LanguageGrid
              languages={languages}
              stats={Object.fromEntries(langStats)}
              limitActive={11}
            />
          </div>
        </div>
      </section>

      {/* C. HOW IT WORKS */}
      <section aria-labelledby="how" className="bg-navy-950 text-white">
        <div className="container-page py-20">
          <SectionHeading id="how" eyebrow="How it works" title="From your voice to African language AI, in five steps." light />
          <ol className="mt-14 grid gap-6 md:grid-cols-5">
            {STEPS.map(({ icon: Icon, title, body }, i) => (
              <li key={title} className="relative rounded-2xl border border-white/10 bg-white/[0.04] p-6">
                <div className="flex items-center justify-between">
                  <span className="grid size-11 place-items-center rounded-xl bg-emerald-500/15 text-emerald-100 ring-1 ring-emerald-500/30">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <span className="font-display text-3xl text-gold-400/80">0{i + 1}</span>
                </div>
                <h3 className="mt-6 text-lg font-semibold text-white">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-navy-200">{body}</p>
              </li>
            ))}
          </ol>
          <div className="mt-10">
            <Button asChild variant="outline-light">
              <Link href="/how-it-works">
                Read the full workflow <ArrowRight />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* D. CONTRIBUTION CATEGORIES */}
      <section aria-labelledby="categories" className="bg-ivory">
        <div className="container-page py-20">
          <SectionHeading
            id="categories"
            eyebrow="Ways to contribute"
            title="Bring the full richness of your language."
            description="Language lives in conversation, poetry, proverbs and stories — not only in sentences. Every form of contribution is welcome."
          />
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {CATEGORIES.map(({ icon: Icon, title, body, href }) => (
              <Link
                key={title}
                href={href}
                className="group flex flex-col rounded-2xl border border-line bg-white p-6 shadow-[var(--shadow-soft)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]"
              >
                <span className="grid size-11 place-items-center rounded-xl bg-emerald-50 text-forest-700 transition-colors group-hover:bg-forest-700 group-hover:text-white">
                  <Icon className="size-5" aria-hidden />
                </span>
                <h3 className="mt-5 font-semibold">{title}</h3>
                <p className="mt-1.5 flex-1 text-sm leading-relaxed text-slate-600">{body}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-forest-700">
                  Contribute <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* E. RESEARCH AND AI */}
      <section aria-labelledby="research" className="bg-white">
        <div className="container-page grid items-center gap-14 py-20 lg:grid-cols-2">
          <div className="relative">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] shadow-[var(--shadow-lift)]">
              <Image
                src="/images/ai-server-room.jpg"
                alt="An African woman engineer working in a data centre"
                fill
                sizes="(min-width: 1024px) 40vw, 100vw"
                className="object-cover"
              />
            </div>
            <div className="absolute -right-3 bottom-10 hidden max-w-[15rem] rounded-2xl bg-forest-700 p-5 text-white shadow-[var(--shadow-lift)] sm:block">
              <p className="font-display text-xl leading-snug">Data that knows where it came from.</p>
              <p className="mt-2 text-sm text-emerald-100">Every record carries provenance, consent and review history.</p>
            </div>
          </div>
          <div>
            <SectionHeading
              id="research"
              eyebrow="Research & AI development"
              title="Raw voices become research-grade data."
              description="Contributions move through raw, validated, curated and model-ready layers. Only reviewer-approved data with explicit permission reaches a dataset."
            />
            <ul className="mt-8 space-y-5">
              {RESEARCH.map((r) => (
                <li key={r.title} className="flex gap-4">
                  <span className="mt-1 grid size-7 shrink-0 place-items-center rounded-full bg-gold-100 text-gold-700">
                    <CheckCircle2 className="size-4" aria-hidden />
                  </span>
                  <div>
                    <p className="font-semibold text-navy-900">{r.title}</p>
                    <p className="text-sm leading-relaxed text-slate-600">{r.body}</p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="navy">
                <Link href="/research">Our research approach</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/datasets">Browse datasets</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* F. COMMUNITY */}
      <section aria-labelledby="community" className="bg-ivory">
        <div className="container-page py-20">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr]">
            <div>
              <SectionHeading
                id="community"
                eyebrow="Community participation"
                title="Built with communities, not just for them."
                description="Universities, schools, linguists, writers, cultural organisations and language communities shape what we collect and how it is used."
              />
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {[
                  { t: "Universities & researchers", d: "Partner on data campaigns, benchmarks and ethics-approved studies." },
                  { t: "Schools & educators", d: "Contribute learning materials and run classroom collection drives." },
                  { t: "Linguists & translators", d: "Review submissions and guide standards for each language." },
                  { t: "Cultural organisations", d: "Digitise archives with full rights and sensitivity controls." },
                ].map((x) => (
                  <div key={x.t} className="rounded-xl border border-line bg-white p-4">
                    <p className="font-semibold text-navy-900">{x.t}</p>
                    <p className="mt-1 text-sm text-slate-600">{x.d}</p>
                  </div>
                ))}
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild>
                  <Link href="/contact?topic=partnership">
                    <Handshake /> Partner with us
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/register">Join as a contributor</Link>
                </Button>
              </div>
            </div>
            <div className="grid gap-6">
              <div className="relative aspect-[16/10] overflow-hidden rounded-[2rem] shadow-[var(--shadow-lift)]">
                <Image
                  src="/images/community-team.jpg"
                  alt="A group of women standing together in a bright office"
                  fill
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  className="object-cover"
                />
              </div>
              <div className="rounded-2xl border border-line bg-white p-6">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-navy-900">Contributor recognition</p>
                  <span className="text-xs text-slate-500">Opt-in · approved work only</span>
                </div>
                {contributors.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-600">
                    Our first contributors will be recognised here once their work is approved. Contributors choose whether to
                    appear on this list from their profile.
                  </p>
                ) : (
                  <ul className="mt-4 divide-y divide-line">
                    {contributors.map((c, i) => (
                      <li key={`${c.display_name}-${i}`} className="flex items-center justify-between py-2.5 text-sm">
                        <span className="flex items-center gap-3">
                          <span className="grid size-8 place-items-center rounded-full bg-navy-900 text-xs font-bold text-white">
                            {(c.display_name || "?").slice(0, 1).toUpperCase()}
                          </span>
                          <span>
                            <span className="font-medium text-navy-900">{c.public_handle ? `@${c.public_handle}` : c.display_name}</span>
                            <span className="block text-xs text-slate-500">{(c.languages ?? []).join(", ")}</span>
                          </span>
                        </span>
                        <span className="font-semibold tabular-nums text-forest-700">{formatNumber(Number(c.approved))}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-forest-700">
        <div className="container-page flex flex-col items-start justify-between gap-8 py-16 lg:flex-row lg:items-center">
          <div className="max-w-2xl">
            <h2 className="font-display text-3xl font-semibold text-white sm:text-4xl">
              Preserving African Languages. Powering African Intelligence.
            </h2>
            <p className="mt-3 text-emerald-100">Five minutes of your language today becomes part of the record for generations.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="light" size="lg">
              <Link href="/register">Start Contributing</Link>
            </Button>
            <Button asChild variant="outline-light" size="lg">
              <Link href="/governance">How we protect your data</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
