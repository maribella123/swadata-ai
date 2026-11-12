import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { PageHero } from "@/components/site/page-hero";
import { SectionHeading } from "@/components/site/section-heading";

export const metadata: Metadata = { title: "African language research" };

export default function ResearchPage() {
  return (
    <>
      <PageHero
        eyebrow="African language research"
        title="Research infrastructure for African language AI."
        description="AfriLang Research produces documented, versioned, consented datasets and is building the tooling to train and evaluate Small Language Models for African languages."
        image="/images/boardroom.jpg"
        imageAlt="A research team meeting in a bright boardroom"
      />
      <section className="container-page grid gap-12 py-20 lg:grid-cols-[1fr_1.2fr]">
        <SectionHeading eyebrow="Research areas" title="What the data enables" />
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            ["Small Language Models", "Compact models trained or fine-tuned (e.g. with LoRA / QLoRA) on curated African language corpora."],
            ["Tokenizer research", "Measuring how tokenizers fragment agglutinative Bantu morphology, and training language-aware vocabularies."],
            ["Machine translation", "Parallel corpora for English ⇄ African and African ⇄ African translation, with human quality ratings."],
            ["Speech technology", "Speech recognition and synthesis from consented, pseudonymised recordings with reviewed transcripts."],
            ["Conversational AI", "Dialogue and instruction data reflecting local contexts — health, agriculture, education, civic life."],
            ["Evaluation", "Held-out benchmarks, kept separate from training splits, for honest model comparison."],
          ].map(([t, d]) => (
            <div key={t} className="rounded-2xl border border-line p-5">
              <h3 className="font-semibold">{t}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{d}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="bg-ivory">
        <div className="container-page grid gap-10 py-20 lg:grid-cols-2">
          <div className="prose-swa">
            <h2>Methodology commitments</h2>
            <ul>
              <li><strong>No English-centric correction.</strong> Text is NFC-normalised and whitespace-normalised only; spelling and grammar are never &quot;fixed&quot; automatically.</li>
              <li><strong>Contributor-aware splits.</strong> All items from one contributor fall into a single train/validation/test split to prevent leakage.</li>
              <li><strong>Duplicate-aware.</strong> Normalised hashes remove exact duplicates before splitting.</li>
              <li><strong>Honest limitations.</strong> Automatic transcription and language identification are not assumed to work for every African language; outputs are always human-reviewed.</li>
              <li><strong>Separation of concerns.</strong> Model training runs outside the web platform; the AI Lab registry tracks models, runs and evaluations.</li>
            </ul>
          </div>
          <div className="rounded-2xl bg-navy-950 p-8 text-white">
            <h2 className="font-display text-2xl font-semibold text-white">For researchers</h2>
            <p className="mt-3 text-navy-200">
              Request the researcher role to search datasets, read data cards, inspect provenance, request restricted access and
              download permitted exports.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild variant="light"><Link href="/datasets">Dataset repository</Link></Button>
              <Button asChild variant="outline-light"><Link href="/contact?topic=research">Request researcher access</Link></Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
