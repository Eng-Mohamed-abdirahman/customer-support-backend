import Link from "next/link";

import { Button } from "@/components/ui/button";

import { container, eyebrow, sectionHeading } from "./landing-styles";

type Plan = {
  name: string;
  price: string;
  perMonth: boolean;
  features: string[];
  cta: string;
  featured?: boolean;
};

/* Prices are intentionally left as [PRICE] placeholders until they are confirmed. */
const PLANS: Plan[] = [
  {
    name: "Starter",
    price: "[PRICE]",
    perMonth: true,
    features: ["1 website · 1 WhatsApp number", "Knowledge base & AI replies", "Live inbox and tickets"],
    cta: "Start free trial",
  },
  {
    name: "Growth",
    price: "[PRICE]",
    perMonth: true,
    features: [
      "More numbers, sites and team members",
      "Knowledge insights & analytics",
      "API access and custom branding",
    ],
    cta: "Start free trial",
    featured: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    perMonth: false,
    features: ["White-label and advanced security", "Priority support", "Dedicated account manager"],
    cta: "Talk to sales",
  },
];

export function LandingPricing() {
  return (
    <section
      id="pricing"
      aria-labelledby="pricing-heading"
      className={`${container} flex scroll-mt-4 flex-col gap-10 py-16 lg:py-22`}
    >
      <div className="flex max-w-[680px] flex-col gap-2.5">
        <p className={eyebrow}>Pricing</p>
        <h2 id="pricing-heading" className={sectionHeading}>
          Plans that grow with your team
        </h2>
      </div>
      <ul className="flex flex-wrap items-stretch gap-6">
        {PLANS.map((plan) => (
          <PlanCard key={plan.name} plan={plan} />
        ))}
      </ul>
    </section>
  );
}

function PlanCard({ plan }: { plan: Plan }) {
  const featured = plan.featured ?? false;

  return (
    <li
      className={`flex min-w-0 flex-[1_1_300px] flex-col gap-4 rounded-2xl p-8 ${
        featured ? "bg-navy-800 text-white shadow-e3" : "border border-border bg-white text-navy-800"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-heading text-[22px] font-semibold">{plan.name}</h3>
        {featured && (
          <span className="rounded-full bg-teal-500 px-2.5 py-1 text-xs font-semibold text-navy-800">
            Most popular
          </span>
        )}
      </div>
      <p className="font-heading text-4xl font-bold">
        {plan.price}
        {plan.perMonth && (
          <span
            className={`font-sans text-[15px] font-medium ${
              featured ? "text-slate-300" : "text-muted-foreground"
            }`}
          >
            {" "}
            / month
          </span>
        )}
      </p>
      <ul
        className={`flex list-disc flex-col gap-2 pl-5 text-[15px] leading-normal ${
          featured ? "text-navy-100" : "text-slate-700"
        }`}
      >
        {plan.features.map((feature) => (
          <li key={feature}>{feature}</li>
        ))}
      </ul>
      <Button
        asChild
        variant={featured ? "default" : "outline"}
        className={`mt-auto h-12 w-full rounded-[10px] text-[15px] font-semibold ${
          featured
            ? "bg-teal-500 text-navy-800 hover:bg-teal-400"
            : "border-[1.5px] border-navy-800 bg-white text-navy-800 hover:bg-muted hover:text-navy-800"
        }`}
      >
        <Link href="/login">{plan.cta}</Link>
      </Button>
    </li>
  );
}
