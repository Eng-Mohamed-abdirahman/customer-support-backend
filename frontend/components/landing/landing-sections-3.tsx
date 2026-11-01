import Link from "next/link";

import { MaterialIcon } from "./landing-header";

const PLANS = [
  {
    name: "Starter",
    price: "$0",
    period: "/mo",
    description: "Perfect for individuals and small projects.",
    features: ["1,000 Messages / mo", "1 AI Agent", "Website Integration"],
    cta: "Get Started",
    highlighted: false,
    buttonClass: "bg-surface-container-high hover:bg-surface-container-highest",
  },
  {
    name: "Professional",
    price: "$49",
    period: "/mo",
    description: "Everything you need to automate support.",
    features: [
      "Unlimited Messages",
      "5 AI Agents",
      "WhatsApp Integration",
      "Advanced Analytics",
      "API Access",
    ],
    cta: "Upgrade Now",
    highlighted: true,
    buttonClass: "primary-gradient text-white shadow-lg hover:opacity-90",
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For large organizations with complex needs.",
    features: [
      "Custom Model Training",
      "Dedicated Support Manager",
      "On-premise Deployment",
      "SLA & Security Audits",
    ],
    cta: "Contact Sales",
    highlighted: false,
    buttonClass: "bg-on-background text-white hover:opacity-90",
  },
];

const TESTIMONIALS = [
  {
    quote:
      "Technov has reduced our support tickets by 70%. The AI is incredibly accurate and actually sounds human.",
    name: "Alex Chen",
    role: "CEO @ TechFlow",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDBWjDAYzVAa8_3qMq_R_AmQQO58dqxMo5WDVZb_SKfX0ptt3j24pyOZzp5WdaLPc40hKqrI3jj6hKOGno3ayCqsJqcZVyot7ucwKnG6lA1Xk6kJDV0oc_8MLmGF75WkumR-FAVqntcj5kH_vV4NxN7oveRxlwO1DsRjNj56dw-usyjZKhJg3UBB73Q-_bnDoExOAmP0Kr8dHTvSdPcyPFyRodmUs1mOn15jCYyYLxkNzDUXlrJsZTk489olX35ofhYyt9VjlwrFpRk",
  },
  {
    quote:
      "Integrating WhatsApp support was a game changer for us. Our customers love the instant replies 24/7.",
    name: "Sarah Jenkins",
    role: "Ops Director @ RetailGo",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCfYgMXz7UtWfFfsipnPyBibPntTIGswRAhOwBvd5O9P_29JaNQMWFRz-UWRuZpUjK1BD8Jop_nI0G_fEwPjmOlNqAMTrSVh6zdh1YJdhjeATCiulJ6v8ZCiNrCLScldoAzPQu0XGpdzc1xZG0WE8HF5aeZi2r6s1y-t4Dak1ACIpZgMU1nc4674tYWqdFYOw41YkGjaK8Bx9VBGGE-5XDuLDmsdKDA5t3w7aGXf6qKA4uy-G2BJdMT8Ou4RfCWOXkGvwZ6V3SxAtUh",
  },
  {
    quote:
      "The training process is so simple. We just pasted our documentation URL and the bot was ready in seconds.",
    name: "Michael Brown",
    role: "Founder @ SaaSBox",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuD33rTw5u49XMGmtVaKuqcgVBhtzZHS_m0Nt7Mr6qBgtfqWCE4DFyvO0b1q9OITzJnD4-_L_GqGsb_PtdGEWoHWDXzOTkyyi0edJqoIsHVLmwhPMzLOGW2vx7dz7lEtbVTbcV0G2EkYoJbdeYKT02IgU1IPbz8l3dpSs5br-17O__Ued0Igdvv7_vG2J1QfTzf7ux8kPZtQLX7-TRaxEc374M6OkDOYkTgfflFh1F2UwMVaVi7kQTFk1mdYqQxyAV7rlxtrKut105oJ",
  },
];

const FAQS = [
  {
    question: "How does the AI training work?",
    answer:
      "Technov uses advanced Retrieval-Augmented Generation (RAG). You simply provide your website URL or upload PDF/Doc files, and our system extracts the knowledge to build a semantic database that the AI uses to answer questions accurately.",
  },
  {
    question: "Can I use it on my WhatsApp?",
    answer:
      "Yes! Technov integrates directly with the WhatsApp Business API. You can connect your number in minutes and the AI will handle incoming messages just like it does on your website.",
  },
  {
    question: "Is my business data secure?",
    answer:
      "Security is our priority. We are SOC2 compliant and use enterprise-grade encryption. Your data is isolated and never used to train global models that could leak information to other customers.",
  },
  {
    question: "Does it support multiple languages?",
    answer:
      "Yes, Technov supports over 50 languages natively. It can detect the customer's language automatically and reply in the same language without any manual translation needed.",
  },
];

function Stars() {
  return (
    <div className="mb-6 flex text-amber-500">
      {Array.from({ length: 5 }).map((_, i) => (
        <MaterialIcon key={i} name="star" filled />
      ))}
    </div>
  );
}

export function LandingPricing() {
  return (
    <section className="bg-surface py-stack-xl" id="pricing">
      <div className="mx-auto max-w-container-max px-gutter">
        <div className="mb-20 text-center">
          <h2 className="mb-4 text-headline-lg">Pricing that scales with you</h2>
          <p className="text-on-surface-variant">Choose the perfect plan for your business needs.</p>
        </div>
        <div className="grid items-stretch gap-8 lg:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`glass-card flex flex-col rounded-[32px] p-10 ${
                plan.highlighted
                  ? "relative border-2 border-primary shadow-2xl"
                  : "border border-outline-variant/30"
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-bold text-white">
                  MOST POPULAR
                </div>
              )}
              <div className="mb-8">
                <h4 className="mb-2 text-xl font-bold">{plan.name}</h4>
                <div className="flex items-baseline gap-1">
                  <span
                    className={`text-4xl font-bold ${plan.highlighted ? "text-primary" : ""}`}
                  >
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span className="text-on-surface-variant">{plan.period}</span>
                  )}
                </div>
                <p className="mt-4 text-sm text-on-surface-variant">{plan.description}</p>
              </div>
              <ul className="mb-10 grow space-y-4">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-sm">
                    <MaterialIcon name="check" className="text-[18px] text-primary" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                href="/login"
                className={`w-full rounded-2xl py-4 text-center font-bold transition-all ${plan.buttonClass}`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function LandingTestimonials() {
  return (
    <section className="bg-surface-container-low py-stack-xl">
      <div className="mx-auto max-w-container-max px-gutter">
        <div className="grid gap-8 lg:grid-cols-3">
          {TESTIMONIALS.map((item) => (
            <div key={item.name} className="glass-card rounded-3xl p-8">
              <Stars />
              <p className="mb-8 text-body-md text-on-surface italic">&quot;{item.quote}&quot;</p>
              <div className="flex items-center gap-4">
                <img className="h-12 w-12 rounded-full object-cover" src={item.image} alt="" />
                <div>
                  <div className="font-bold">{item.name}</div>
                  <div className="text-xs text-on-surface-variant">{item.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function LandingCta() {
  return (
    <section className="mx-auto max-w-container-max px-gutter py-stack-xl">
      <div className="cta-banner-gradient relative overflow-hidden rounded-[48px] p-16 text-center text-white md:p-24">
        <div className="absolute inset-0 bg-white/5 opacity-30" />
        <div className="relative z-10">
          <h2 className="mb-8 text-headline-xl">
            Ready to automate your <br /> customer support?
          </h2>
          <p className="mx-auto mb-12 max-w-2xl text-body-lg text-white/80">
            Join 10,000+ businesses and start saving hundreds of hours on manual support
            today.
          </p>
          <div className="flex flex-wrap justify-center gap-6">
            <Link
              href="/login"
              className="rounded-2xl bg-white px-10 py-4 font-bold text-primary shadow-xl transition-all hover:bg-white/90 active:scale-95"
            >
              Start Free Trial
            </Link>
            <button
              type="button"
              className="rounded-2xl border border-white/20 bg-white/10 px-10 py-4 font-bold text-white backdrop-blur-md transition-all hover:bg-white/20 active:scale-95"
            >
              Talk to an Expert
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export function LandingFaq() {
  return (
    <section className="bg-surface py-stack-xl" id="resources">
      <div className="mx-auto max-w-3xl px-gutter">
        <h2 className="mb-16 text-center text-headline-lg">Common Questions</h2>
        <div className="space-y-4">
          {FAQS.map((faq) => (
            <details
              key={faq.question}
              className="group glass-card cursor-pointer rounded-2xl p-6 [&_summary::-webkit-details-marker]:hidden"
            >
              <summary className="flex items-center justify-between font-bold">
                {faq.question}
                <MaterialIcon
                  name="expand_more"
                  className="transition-transform group-open:rotate-180"
                />
              </summary>
              <p className="mt-4 text-sm leading-relaxed text-on-surface-variant">{faq.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function LandingFooter() {
  const footerLinks = {
    Product: ["Features", "Integrations", "Pricing", "Changelog"],
    Company: ["About Us", "Careers", "Blog", "Press"],
    Support: ["Documentation", "API Reference", "Community", "Status"],
    Legal: ["Privacy Policy", "Terms of Service", "Cookie Policy"],
  };

  return (
    <footer className="mt-32 w-full border-t border-outline-variant/20 bg-surface-container-lowest py-stack-xl">
      <div className="mx-auto max-w-container-max px-gutter">
        <div className="mb-16 grid grid-cols-2 gap-12 md:grid-cols-4 lg:grid-cols-6">
          <div className="col-span-2 space-y-6">
            <div className="text-headline-md font-bold text-on-surface">Technov</div>
            <p className="max-w-xs text-body-md leading-relaxed text-on-surface-variant">
              Building the future of autonomous customer support with cutting-edge AI.
              Empowering teams to deliver instant, accurate help 24/7.
            </p>
            <div className="flex gap-4">
              <a
                href="#"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-low text-on-surface-variant transition-all duration-200 hover:bg-primary/10 hover:text-primary"
              >
                <MaterialIcon name="public" className="text-[20px]" />
              </a>
              <a
                href="#"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-low text-on-surface-variant transition-all duration-200 hover:bg-primary/10 hover:text-primary"
              >
                <MaterialIcon name="mail" className="text-[20px]" />
              </a>
            </div>
          </div>
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h5 className="mb-6 font-bold text-on-surface">{title}</h5>
              <ul className="space-y-4 text-sm text-on-surface-variant">
                {links.map((link) => (
                  <li key={link}>
                    <a href="#" className="transition-colors duration-200 hover:text-primary">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="flex flex-col items-center justify-between gap-4 border-t border-outline-variant/10 pt-8 text-sm text-on-surface-variant md:flex-row">
          <p>© 2024 Technov AI. All rights reserved.</p>
          <span>Built with ❤️ for support teams.</span>
        </div>
      </div>
    </footer>
  );
}
