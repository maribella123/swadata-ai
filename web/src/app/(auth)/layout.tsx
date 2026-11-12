import Image from "next/image";
import { Logo } from "@/components/site/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.05fr]">
      <main id="main" className="flex flex-col px-4 py-8 sm:px-10">
        <Logo />
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">{children}</div>
        <p className="text-xs text-slate-500">Preserving African Languages. Powering African Intelligence.</p>
      </main>
      <aside className="relative hidden lg:block">
        <Image src="/images/portrait-woman.jpg" alt="Portrait of a young African woman" fill priority sizes="50vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-950/85 via-navy-950/20 to-transparent" />
        <div className="absolute inset-x-10 bottom-12 text-white">
          <p className="font-display text-4xl leading-tight">Your language deserves a place in the future of AI.</p>
          <p className="mt-3 max-w-md text-navy-100">Every sentence, recording and proverb you share helps build technology that speaks with your community.</p>
        </div>
      </aside>
    </div>
  );
}
