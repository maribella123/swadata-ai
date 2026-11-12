import Image from "next/image";
import { cn } from "@/lib/utils";

export function PageHero({
  eyebrow,
  title,
  description,
  image,
  imageAlt,
  children,
  tone = "ivory",
}: {
  eyebrow: string;
  title: string;
  description?: string;
  image?: string;
  imageAlt?: string;
  children?: React.ReactNode;
  tone?: "ivory" | "navy";
}) {
  const navy = tone === "navy";
  return (
    <section className={cn(navy ? "bg-navy-950 text-white" : "bg-ivory")}>
      <div className={cn("container-page grid items-center gap-10 py-14 lg:py-20", image && "lg:grid-cols-[1.1fr_1fr]")}>
        <div className="animate-fade-up">
          <p className={cn("eyebrow mb-4 flex items-center gap-3", navy && "text-gold-400")}>
            <span className="gold-rule" /> {eyebrow}
          </p>
          <h1 className={cn("font-display text-4xl font-semibold leading-[1.08] sm:text-5xl", navy && "text-white")}>{title}</h1>
          {description && <p className={cn("mt-5 max-w-2xl text-lg leading-relaxed", navy ? "text-navy-200" : "text-slate-600")}>{description}</p>}
          {children && <div className="mt-8">{children}</div>}
        </div>
        {image && (
          <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] shadow-[var(--shadow-lift)]">
            <Image src={image} alt={imageAlt ?? ""} fill priority sizes="(min-width: 1024px) 45vw, 100vw" className="object-cover" />
          </div>
        )}
      </div>
    </section>
  );
}

export function LegalPage({ eyebrow, title, updated, children }: { eyebrow: string; title: string; updated: string; children: React.ReactNode }) {
  return (
    <>
      <PageHero eyebrow={eyebrow} title={title} description={`Last updated ${updated}`} />
      <div className="container-page py-14">
        <article className="prose-swa mx-auto max-w-3xl">{children}</article>
      </div>
    </>
  );
}
