import { cn } from "@/lib/utils";

export function SectionHeading({
  id,
  eyebrow,
  title,
  description,
  light = false,
  className,
}: {
  id?: string;
  eyebrow?: string;
  title: string;
  description?: string;
  light?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("max-w-3xl", className)}>
      {eyebrow && <p className={cn("eyebrow mb-3", light && "text-gold-400")}>{eyebrow}</p>}
      <h2 id={id} className={cn("font-display text-3xl font-semibold leading-tight sm:text-[2.6rem]", light && "text-white")}>
        {title}
      </h2>
      {description && <p className={cn("mt-4 text-lg leading-relaxed", light ? "text-navy-200" : "text-slate-600")}>{description}</p>}
    </div>
  );
}
