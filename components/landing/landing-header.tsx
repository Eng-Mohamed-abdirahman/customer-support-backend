"use client";

import Link from "next/link";
import { useEffect } from "react";

function MaterialIcon({
  name,
  filled,
  className,
}: {
  name: string;
  filled?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`material-symbols-outlined ${className ?? ""}`}
      style={
        filled
          ? { fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }
          : undefined
      }
    >
      {name}
    </span>
  );
}

export function LandingHeader() {
  return (
    <header className="fixed top-0 z-50 w-full border-b border-outline-variant/10 bg-surface/80 shadow-sm backdrop-blur-xl">
      <nav className="mx-auto flex h-20 w-full max-w-container-max items-center justify-between px-gutter">
        <Link href="/" className="text-headline-md font-bold text-on-surface">
          Technov
        </Link>
        <div className="hidden items-center gap-8 md:flex">
          <a
            className="text-body-md text-on-surface-variant transition-colors duration-200 hover:text-primary"
            href="#features"
          >
            Features
          </a>
          <a
            className="text-body-md text-on-surface-variant transition-colors duration-200 hover:text-primary"
            href="#pricing"
          >
            Pricing
          </a>
          <a
            className="text-body-md text-on-surface-variant transition-colors duration-200 hover:text-primary"
            href="#resources"
          >
            Resources
          </a>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="rounded-lg px-6 py-2.5 font-medium text-primary transition-all hover:bg-primary-container/10 active:scale-95"
          >
            Login
          </Link>
          <Link
            href="/login"
            className="primary-gradient rounded-lg px-6 py-2.5 font-medium text-white shadow-lg transition-all hover:opacity-90 active:scale-95"
          >
            Start Free
          </Link>
        </div>
      </nav>
    </header>
  );
}

export function LandingScrollEffects() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("opacity-100", "translate-y-0");
            entry.target.classList.remove("opacity-0", "translate-y-10");
          }
        });
      },
      { threshold: 0.1 }
    );

    document.querySelectorAll(".landing-page section").forEach((section) => {
      section.classList.add(
        "transition-all",
        "duration-700",
        "opacity-0",
        "translate-y-10"
      );
      observer.observe(section);
    });

    const handleScroll = () => {
      const header = document.querySelector(".landing-page header");
      if (!header) return;

      if (window.scrollY > 20) {
        header.classList.add("nav-blur", "bg-surface/90", "shadow-md");
      } else {
        header.classList.remove("nav-blur", "bg-surface/90", "shadow-md");
      }
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll();

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return null;
}

export { MaterialIcon };
