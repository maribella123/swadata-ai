import Link from "next/link";
import { getSessionUser, hasAnyRole } from "@/lib/auth";
import { ADMIN_ROLES, RESEARCHER_ROLES, REVIEWER_ROLES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Logo } from "./logo";
import { MobileNav } from "./mobile-nav";

export const PUBLIC_NAV = [
  { href: "/about", label: "About" },
  { href: "/languages", label: "Languages" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/contribute", label: "Contribute" },
  { href: "/research", label: "Research" },
  { href: "/datasets", label: "Datasets" },
];

export async function SiteHeader() {
  const user = await getSessionUser();
  const portalLinks = user
    ? [
        { href: "/portal", label: "My portal" },
        ...(hasAnyRole(user, REVIEWER_ROLES) ? [{ href: "/review", label: "Review" }] : []),
        ...(hasAnyRole(user, RESEARCHER_ROLES) ? [{ href: "/researcher", label: "Researcher" }] : []),
        ...(hasAnyRole(user, ADMIN_ROLES) ? [{ href: "/admin", label: "Admin" }] : []),
      ]
    : [];

  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/75">
      <div className="container-page flex h-16 items-center justify-between gap-6">
        <Logo />
        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {PUBLIC_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-navy-800 transition-colors hover:bg-navy-50 hover:text-navy-900"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          {user ? (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href={portalLinks.length > 1 ? portalLinks[portalLinks.length - 1].href : "/portal"}>
                  {portalLinks.length > 1 ? portalLinks[portalLinks.length - 1].label : "My portal"}
                </Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/portal">Contribute</Link>
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/register">Start contributing</Link>
              </Button>
            </>
          )}
        </div>
        <MobileNav items={PUBLIC_NAV} portalLinks={portalLinks} signedIn={Boolean(user)} />
      </div>
    </header>
  );
}
