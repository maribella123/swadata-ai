"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type Item = { href: string; label: string };

export function MobileNav({ items, portalLinks, signedIn }: { items: Item[]; portalLinks: Item[]; signedIn: boolean }) {
  const pathname = usePathname();
  // The menu is open only on the page where it was opened, so navigating closes it.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const setOpen = (fn: (o: boolean) => boolean) => setOpenOn(fn(open) ? pathname : null);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <Button variant="ghost" size="icon" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {open ? <X className="!size-5" /> : <Menu className="!size-5" />}
      </Button>
      {open && (
        <div className="fixed inset-x-0 top-16 bottom-0 z-40 overflow-y-auto bg-white px-4 pb-10 pt-4">
          <nav aria-label="Mobile" className="flex flex-col">
            {items.map((i) => (
              <Link key={i.href} href={i.href} className="border-b border-line py-3.5 text-lg font-semibold text-navy-900">
                {i.label}
              </Link>
            ))}
            {portalLinks.map((i) => (
              <Link key={i.href} href={i.href} className="border-b border-line py-3.5 text-lg font-semibold text-forest-700">
                {i.label}
              </Link>
            ))}
          </nav>
          <div className="mt-6 grid gap-3">
            {signedIn ? (
              <form action="/auth/signout" method="post">
                <Button variant="outline" className="w-full" size="lg">Sign out</Button>
              </form>
            ) : (
              <>
                <Button asChild size="lg"><Link href="/register">Start contributing</Link></Button>
                <Button asChild variant="outline" size="lg"><Link href="/login">Sign in</Link></Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
