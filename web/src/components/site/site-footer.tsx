import Link from "next/link";
import { Logo } from "./logo";

const COLUMNS = [
  {
    title: "Platform",
    links: [
      { href: "/how-it-works", label: "How it works" },
      { href: "/contribute", label: "Contribute data" },
      { href: "/languages", label: "Supported languages" },
      { href: "/datasets", label: "Dataset repository" },
    ],
  },
  {
    title: "Research",
    links: [
      { href: "/research", label: "African language research" },
      { href: "/researcher", label: "Researcher portal" },
      { href: "/governance", label: "Data governance & licensing" },
      { href: "/about", label: "About AfriLang Research" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy policy (POPIA)" },
      { href: "/terms", label: "Terms and conditions" },
      { href: "/governance", label: "Consent & permissions" },
      { href: "/contact", label: "Contact us" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="bg-navy-950 text-navy-100">
      <div className="container-page grid gap-12 py-16 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="max-w-sm">
          <Logo light />
          <p className="mt-5 font-display text-xl leading-snug text-white">
            Preserving African Languages.
            <br />
            Powering African Intelligence.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-navy-200">
            A community-driven platform collecting, validating and curating African language data — starting with siSwati — for
            responsible African language AI.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-gold-400">{col.title}</p>
            <ul className="mt-4 space-y-2.5">
              {col.links.map((l) => (
                <li key={l.href + l.label}>
                  <Link href={l.href} className="text-sm text-navy-100 transition-colors hover:text-white">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-2 py-6 text-xs text-navy-300 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} AfriLang Research. Contributions remain governed by each contributor&apos;s recorded permissions.</p>
          <p>Photography: Unsplash (Unsplash License).</p>
        </div>
      </div>
    </footer>
  );
}
