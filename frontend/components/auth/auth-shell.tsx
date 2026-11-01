import { Check, Headphones } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

type AuthShellProps = {
  heading: string;
  description: string;
  dividerLabel?: string;
  footerPrompt?: string;
  footerActionLabel?: string;
  footerActionHref?: string;
  children: ReactNode;
  backHref?: string;
};

const HIGHLIGHTS = [
  "Live inbox for WhatsApp and web chat",
  "Take over from the AI in one click",
  "Your data stays private to your company",
];

export function BrandMark({ inverted = false }: { inverted?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span
        className={
          inverted
            ? "flex size-10 items-center justify-center rounded-[10px] bg-teal-500 text-navy-800"
            : "flex size-10 items-center justify-center rounded-[10px] bg-navy-800 text-teal-500"
        }
        aria-hidden="true"
      >
        <Headphones className="size-5" />
      </span>
      <span
        className={`font-heading text-2xl font-bold tracking-tight ${inverted ? "text-white" : "text-navy-800"}`}
      >
        Tech<span className="text-teal-500">nov</span>
      </span>
    </span>
  );
}

export function AuthShell({ heading, description, children }: AuthShellProps) {
  return (
    <main className="flex min-h-screen flex-wrap bg-white text-navy-800">
      <aside className="relative flex flex-[1_1_520px] flex-col justify-between gap-10 overflow-hidden bg-navy-800 p-10 text-white sm:p-14">
        <div
          className="pointer-events-none absolute -right-48 -bottom-56 size-[560px] rounded-full border-[56px] border-teal-500 opacity-15"
          aria-hidden="true"
        />
        <Link href="/" className="relative self-start rounded-[10px]">
          <BrandMark inverted />
        </Link>
        <div className="relative flex max-w-lg flex-col gap-5">
          <h2 className="text-4xl leading-tight font-bold sm:text-[44px] sm:leading-[52px]">
            Welcome back to your support workspace
          </h2>
          <p className="text-[17px] leading-relaxed text-navy-100">
            Pick up live conversations, handle tickets and keep your AI agent learning.
          </p>
          <ul className="mt-2 flex flex-col gap-3.5 text-base">
            {HIGHLIGHTS.map((item) => (
              <li key={item} className="flex items-center gap-3">
                <span
                  className="flex size-7 shrink-0 items-center justify-center rounded-full bg-mint text-navy-800"
                  aria-hidden="true"
                >
                  <Check className="size-4" strokeWidth={2.5} />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-navy-200">© {new Date().getFullYear()} Technov</p>
      </aside>

      <section className="flex flex-[1_1_480px] items-center justify-center px-6 py-14 sm:px-8">
        <div className="flex w-full max-w-[420px] flex-col gap-7">
          <header className="flex flex-col gap-2">
            <h1 className="text-[32px] leading-10 font-bold">{heading}</h1>
            <p className="text-base text-muted-foreground">{description}</p>
          </header>
          {children}
        </div>
      </section>
    </main>
  );
}
