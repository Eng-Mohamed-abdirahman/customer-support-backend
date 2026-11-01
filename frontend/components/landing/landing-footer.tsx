import Link from "next/link";

import { Button } from "@/components/ui/button";

import { container, ctaTeal, focusRing } from "./landing-styles";

export function LandingCta() {
  return (
    <section aria-labelledby="cta-heading" className="px-4 pb-16 sm:px-8 lg:pb-22">
      <div className="relative mx-auto flex max-w-[1216px] flex-wrap items-center justify-between gap-6 overflow-hidden rounded-3xl bg-navy-800 p-8 text-white sm:p-14">
        <div
          className="pointer-events-none absolute -right-[120px] -bottom-[200px] size-[420px] rounded-full border-[48px] border-teal-500 opacity-16"
          aria-hidden="true"
        />
        <div className="relative flex max-w-[620px] flex-col gap-2.5">
          <h2
            id="cta-heading"
            className="font-heading text-3xl leading-tight font-bold sm:text-4xl sm:leading-11"
          >
            Give your customers answers in seconds
          </h2>
          <p className="text-[17px] leading-relaxed text-navy-100">
            Start with your own documents today. Your team stays in control.
          </p>
        </div>
        <Button asChild className={`relative ${ctaTeal}`}>
          <Link href="/login">Start free trial</Link>
        </Button>
      </div>
    </section>
  );
}

const FOOTER_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#pricing", label: "Pricing" },
  { href: "/login", label: "Sign in" },
  { href: "#top", label: "Privacy" },
];

export function LandingFooter() {
  const linkClass = `rounded-md text-muted-foreground hover:text-navy-800 ${focusRing}`;

  return (
    <footer className="border-t border-border bg-white">
      <div
        className={`${container} flex flex-wrap items-center justify-between gap-4 py-7 text-sm text-muted-foreground`}
      >
        <span className="font-heading text-lg font-bold text-navy-800">
          Tech<span className="text-teal-500">nov</span>
        </span>
        <nav aria-label="Footer" className="flex flex-wrap gap-6">
          {FOOTER_LINKS.map((link) =>
            link.href.startsWith("/") ? (
              <Link key={link.label} href={link.href} className={linkClass}>
                {link.label}
              </Link>
            ) : (
              <a key={link.label} href={link.href} className={linkClass}>
                {link.label}
              </a>
            ),
          )}
        </nav>
        <span>© 2026 Technov</span>
      </div>
    </footer>
  );
}
