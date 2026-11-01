import Link from "next/link";

import { MaterialIcon } from "./landing-header";

const HERO_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDiEXqUqcWK_dbXmd9ePzAVkamAkJ7UkQPZtzghNbAqmpYn5fAw6Z1qfG7HZQ4nrKNc-sBKp8ieo8Ue2lnuWj0XjZnsDXdzoRh1SApybreyx6cSxJ6ozsUO_5oEisNsxNF7u1WvP8i2k2EOrL8SNbXfcZ3HIJXEvOKQv5ktBcHQQ7ozrDqfyOnaZw_W7Igwy2zD_ohCi83svL0PQ4VTT-IN69hyDcNof13JBAxCq-WgOjKAgBCsmC8RZXYJXQqcuZf8JWQ2nSE_3SCR";

const AVATARS = [
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDcUBKLykSt8TMMikrKuf0ChloihrUJ1PLD2PDVOc31h65XbjBF4WIiTALE70Q1ZFDd61Lho4-ME0MjFAuXHmZXIOl-djaeSs-WJSoJovEFnFKBtGfS4mTJmyrALPtce6JruxPiuqBJUYeRvQ9G2er2NvBmM9RykZRuO9OfERYsnhd7c_PAtrSIILkrUzSW7JvAVnkTn3Hemcg_qQjDYLC1sjqGoPOO8QEInaN8ZRFSw_DIWGN_8Uh_h6VPC0SmxMzEYE6m72qkH3Zc",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAN3a3XG89wZaZ3VsjrJ7Buk02kOgVDat465otDLh8-Tgj2IqMVererVnngpvj9H39Vz5CXbVoBY__cn2XDVBC7iGfAGNSQdKH_-6cqQLhhkk1LUSq9UWbd-TOoa_CHmxq6wJsk_lvgAgZc3siEcS8uYbO1kwQAScB1DIqJUrTbMK4Z2yk-pULQDBNWbeRkarmNcesXCJPziNOEnRastBomqMRj9y_CADG_yaY5glBprZNmJJN0sMZVhREOggpQD0P7jsMQVXFlIouB",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAKcr-60rg09wC9oId1bLeSOU7DffTU-9OEBRzXWbNjyDmC53x_-xhiJxB4uK5lYkzP9RkBl-PxSuOAm-OawRdfQFtCmuW3MYJVF9X0BIzS5-rQXVljy8AM0axVy5XYk2VvvDHaRjAM1tdmaMdZmkViLtNr7Aaj9u4_pNpeE-9AC-k9HS1yhRv_u6pJN6J0RBcq4xS-eTk4S3lRmGDNgYFk3C_A58p1gGw7qZ7jgzL4f7WiXnTnPO1UgeRRU5DtfXh8YilL9FF6Lt9R",
];

export function LandingHero() {
  return (
    <section className="relative overflow-hidden pt-20 pb-32 lg:pt-32 lg:pb-48">
      <div className="absolute inset-0 z-[-1]">
        <div className="absolute top-0 right-0 h-[500px] w-[500px] translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute bottom-0 left-0 h-[600px] w-[600px] -translate-x-1/2 translate-y-1/2 rounded-full bg-secondary/10 blur-[120px]" />
      </div>
      <div className="mx-auto grid max-w-container-max items-center gap-16 px-gutter lg:grid-cols-2">
        <div className="space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-label-sm text-primary">
            <MaterialIcon name="auto_awesome" className="text-[18px]" />
            Next-Gen AI Platform
          </div>
          <h1 className="text-headline-xl leading-tight font-bold text-on-background">
            AI Customer Support <br />
            <span className="text-primary">That Never Sleeps</span>
          </h1>
          <p className="max-w-xl text-body-lg text-on-surface-variant">
            Deploy an intelligent AI agent trained on your business knowledge. Answer
            customer questions instantly across your website, WhatsApp, and more.
          </p>
          <div className="flex flex-wrap gap-4 pt-4">
            <Link
              href="/login"
              className="primary-gradient rounded-2xl px-8 py-4 text-body-md font-semibold text-white shadow-xl transition-all hover:-translate-y-0.5 hover:shadow-primary/20 active:scale-95"
            >
              Start Free
            </Link>
            <button
              type="button"
              className="rounded-2xl border border-outline-variant bg-white px-8 py-4 text-body-md font-semibold text-on-surface transition-all hover:bg-surface-container-low active:scale-95"
            >
              Book a Demo
            </button>
          </div>
          <div className="flex items-center gap-4 text-label-sm text-on-surface-variant">
            <div className="flex -space-x-2">
              {AVATARS.map((src) => (
                <img
                  key={src}
                  className="h-8 w-8 rounded-full border-2 border-surface object-cover"
                  src={src}
                  alt=""
                />
              ))}
            </div>
            <span>Joined by 10,000+ support teams</span>
          </div>
        </div>
        <div className="group relative">
          <div className="absolute -inset-4 rounded-[40px] bg-primary/5 blur-2xl transition-all group-hover:bg-primary/10" />
          <div className="glass-card relative overflow-hidden rounded-2xl border border-white/40 shadow-2xl">
            <img className="aspect-[4/3] w-full object-cover" src={HERO_IMAGE} alt="Technov analytics dashboard" />
            <div className="floating glass-card absolute top-8 -left-12 max-w-[200px] rounded-xl border border-white/60 p-4 shadow-lg">
              <div className="mb-2 flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/10 text-green-600">
                  <MaterialIcon name="check_circle" className="text-sm" filled />
                </div>
                <div className="text-[10px] font-bold text-on-surface">Resolved by AI</div>
              </div>
              <div className="text-xs leading-relaxed text-on-surface-variant">
                &quot;Can I upgrade my plan?&quot; — Resolution in 1.2s
              </div>
            </div>
            <div className="floating glass-card absolute right-[-2rem] bottom-12 rounded-xl border border-white/60 p-4 shadow-lg">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                <span className="text-[10px] font-bold tracking-wider uppercase">Live Agent</span>
              </div>
              <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-outline-variant/30">
                <div className="h-full w-2/3 bg-primary" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function LandingTrustedBy() {
  const companies = ["Loom", "Ramp", "Vercel", "Linear", "Stripe"];

  return (
    <section className="border-y border-outline-variant/10 bg-surface-container-lowest py-20">
      <div className="mx-auto max-w-container-max px-gutter text-center">
        <p className="mb-10 text-label-sm tracking-widest text-on-surface-variant uppercase">
          Trusted by growing businesses worldwide
        </p>
        <div className="flex flex-wrap items-center justify-center gap-12 opacity-50 grayscale transition-all hover:grayscale-0">
          {companies.map((name) => (
            <span key={name} className="text-headline-md font-bold">
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

const FEATURES = [
  {
    icon: "chat_bubble",
    color: "primary",
    title: "AI Chat Widget",
    description:
      "Embed a beautiful, customizable chat widget that matches your brand and speaks 50+ languages.",
  },
  {
    icon: "chat",
    color: "secondary",
    title: "WhatsApp Integration",
    description:
      "Connect Technov to your WhatsApp Business account and support customers on their favorite app.",
  },
  {
    icon: "hub",
    color: "tertiary",
    title: "Multi-Tenant Platform",
    description:
      "Manage multiple products or businesses from a single dashboard with isolated data and agents.",
  },
  {
    icon: "school",
    color: "primary",
    title: "Knowledge Training",
    description:
      "Train your AI in minutes by syncing your website, docs, or FAQ. No manual coding required.",
  },
  {
    icon: "query_stats",
    color: "secondary",
    title: "Analytics Dashboard",
    description:
      "Track resolution rates, sentiment analysis, and common pain points with deep AI insights.",
  },
  {
    icon: "api",
    color: "tertiary",
    title: "API Integration",
    description:
      "Connect to your CRM, database, or backend systems to give your AI access to customer data.",
  },
];

const colorMap = {
  primary: "bg-primary/10 text-primary",
  secondary: "bg-secondary/10 text-secondary",
  tertiary: "bg-tertiary/10 text-tertiary",
} as const;

export function LandingFeatures() {
  return (
    <section className="bg-surface py-stack-xl" id="features">
      <div className="mx-auto max-w-container-max px-gutter">
        <div className="mx-auto mb-20 max-w-2xl text-center">
          <h2 className="mb-6 text-headline-lg">Everything you need to automate support</h2>
          <p className="text-body-md text-on-surface-variant">
            Technov combines state-of-the-art LLMs with powerful integrations to create a
            seamless support experience.
          </p>
        </div>
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="group glass-card rounded-2xl p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
            >
              <div
                className={`mb-6 flex h-12 w-12 items-center justify-center rounded-xl transition-transform group-hover:scale-110 ${colorMap[feature.color as keyof typeof colorMap]}`}
              >
                <MaterialIcon name={feature.icon} />
              </div>
              <h3 className="mb-4 text-headline-md">{feature.title}</h3>
              <p className="leading-relaxed text-on-surface-variant">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
