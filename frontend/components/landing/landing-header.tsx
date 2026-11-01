import Link from "next/link";

import { BrandMark } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";

import { focusRing } from "./landing-styles";

const NAV_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#how", label: "How it works" },
  { href: "#pricing", label: "Pricing" },
];

export function LandingHeader() {
  return (
    <header className="border-b border-border bg-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-8">
        <a href="#top" className={`rounded-[10px] ${focusRing}`} aria-label="Technov home">
          <BrandMark />
        </a>
        <nav
          aria-label="Main"
          className="flex flex-wrap items-center gap-x-7 gap-y-2 text-[15px] font-medium"
        >
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={`rounded-md text-navy-800 hover:text-teal-700 ${focusRing}`}
            >
              {link.label}
            </a>
          ))}
          <Link
            href="/login"
            className={`rounded-md text-navy-800 hover:text-teal-700 ${focusRing}`}
          >
            Sign in
          </Link>
          <Button
            asChild
            className="h-11 rounded-[10px] bg-navy-800 px-5 text-[15px] font-semibold text-white hover:bg-navy-700"
          >
            <Link href="/login">Book a demo</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
