import type { ReactNode } from "react";

type AuthShellProps = {
  heading: string;
  description: string;
  dividerLabel: string;
  footerPrompt: string;
  footerActionLabel: string;
  footerActionHref: string;
  children: ReactNode;
  backHref?: string;
};

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="inline-flex items-center gap-2.5">
      <span className="inline-flex size-8 items-center justify-center rounded-full border border-primary/45 bg-primary/15">
        <span className="size-2.5 rounded-full bg-primary shadow-[0_0_18px_0_var(--color-primary)]" />
      </span>
      <span
        className={
          compact
            ? "text-2xl font-semibold tracking-tight text-white"
            : "text-4xl font-semibold tracking-tight text-white"
        }
      >
        Technov
      </span>
    </div>
  );
}

export function AuthShell({
  heading,
  description,
  dividerLabel,
  footerPrompt,
  footerActionLabel,
  footerActionHref,
  children,
  backHref = "/",
}: AuthShellProps) {
  return (
    <main className="auth-canvas min-h-screen text-zinc-100">
      <div className="grid min-h-screen lg:grid-cols-[1.12fr_0.88fr]">
        <aside className="relative hidden border-r border-white/10 lg:flex">
          <div className="flex w-full flex-col justify-between px-10 py-10 xl:px-12 xl:py-12">
            <div className="auth-rise">
              <BrandMark />
            </div>

            <blockquote className="auth-rise auth-rise-3 max-w-xl space-y-3 text-zinc-200">
              <p className="text-2xl leading-tight xl:text-[2rem]">
                &quot;The system acts as a digital AI employee that automatically responds to customer messages 24/7 using business-specific knowledge.&quot;
              </p>
              <footer className="text-base font-medium text-zinc-300">
               Mohamed Abdirahman, CEO of Technov
              </footer>
            </blockquote>
          </div>
        </aside>

        <section className="relative flex items-center justify-center px-6 py-10 sm:px-10 lg:px-14">
          <div className="w-full max-w-md space-y-8">
            <div className="auth-rise space-y-6">
              <div className="lg:hidden">
                <BrandMark compact />
              </div>

              

              <header className="space-y-3">
                <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                  {heading}
                </h1>
                <p className="text-base text-zinc-300 sm:text-lg">{description}</p>
              </header>
            </div>

            <div className="auth-rise auth-rise-2">{children}</div>

            
          </div>
        </section>
      </div>
    </main>
  );
}