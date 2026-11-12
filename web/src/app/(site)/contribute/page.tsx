import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { BookOpen, Languages, Library, MessagesSquare, Mic, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHero } from "@/components/site/page-hero";

export const metadata: Metadata = { title: "Contribute data" };

const OPTIONS = [
  { icon: Type, title: "Text", href: "/portal/text", body: "Sentences, paragraphs, stories, Q&A, educational material and technical terms.", time: "2 min" },
  { icon: Mic, title: "Audio & speech", href: "/portal/audio", body: "Record in your browser or upload recordings. Speakers are pseudonymised.", time: "3 min" },
  { icon: Languages, title: "Translation", href: "/portal/translations", body: "Translate prompts or your own text between English and African languages.", time: "2 min" },
  { icon: BookOpen, title: "Books & documents", href: "/portal/documents", body: "Upload PDFs, DOCX, EPUB, TXT or scans. Text is extracted, segmented and reviewed.", time: "5 min" },
  { icon: MessagesSquare, title: "Conversations", href: "/portal/conversations", body: "Write natural multi-turn dialogues with speaker roles.", time: "5 min" },
  { icon: Library, title: "Cultural knowledge", href: "/portal/cultural", body: "Proverbs, idioms, greetings, folklore and oral histories, with sensitivity controls.", time: "3 min" },
];

export default function ContributePage() {
  return (
    <>
      <PageHero
        eyebrow="Contribute data"
        title="Share what only you can share: your language."
        description="Choose how you want to contribute. Every submission is stored securely with your chosen permissions and reviewed by native speakers."
      >
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg"><Link href="/register">Create a free account</Link></Button>
          <Button asChild size="lg" variant="outline"><Link href="/login">I already have an account</Link></Button>
        </div>
      </PageHero>
      <section className="container-page py-16">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {OPTIONS.map(({ icon: Icon, title, body, href, time }) => (
            <Link key={title} href={href} className="group rounded-2xl border border-line bg-white p-6 shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]">
              <div className="flex items-center justify-between">
                <span className="grid size-11 place-items-center rounded-xl bg-emerald-50 text-forest-700"><Icon className="size-5" /></span>
                <span className="text-xs text-slate-500">~{time}</span>
              </div>
              <h2 className="mt-5 text-lg font-bold">{title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{body}</p>
            </Link>
          ))}
        </div>
      </section>
      <section className="bg-ivory">
        <div className="container-page grid items-center gap-10 py-16 lg:grid-cols-2">
          <div className="relative aspect-[16/10] overflow-hidden rounded-[2rem]">
            <Image src="/images/microphone-studio.jpg" alt="A studio microphone ready for recording" fill sizes="(min-width:1024px) 45vw, 100vw" className="object-cover" />
          </div>
          <div className="prose-swa">
            <h2>Before you contribute</h2>
            <ul>
              <li>Only submit material you created yourself, or have the right to share.</li>
              <li>For published books or articles, record the copyright status — copyrighted work never enters public datasets without verified permission.</li>
              <li>Don&apos;t include other people&apos;s personal information (names, phone numbers, ID numbers) in your text or recordings.</li>
              <li>Mark sacred or sensitive cultural knowledge as <strong>restricted</strong> — only senior linguists can see it.</li>
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
