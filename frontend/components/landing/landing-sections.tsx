import {
  BarChart3,
  BookOpen,
  Code,
  Lock,
  MessageCircle,
  Monitor,
  ShoppingBag,
  UserCheck,
  type LucideIcon,
} from "lucide-react";

import { container, eyebrow, sectionHeading } from "./landing-styles";

const CHANNELS: { icon: LucideIcon; label: string }[] = [
  { icon: MessageCircle, label: "WhatsApp Business" },
  { icon: Monitor, label: "Website chat widget" },
  { icon: Code, label: "REST API for your apps" },
];

const FEATURES: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: BookOpen,
    title: "Trained on your knowledge",
    body: "Upload PDF and Word files. Answers come only from your documents, with the source shown to your team.",
  },
  {
    icon: MessageCircle,
    title: "WhatsApp and web, one inbox",
    body: "Every channel lands in a single live inbox that updates in real time for the whole team.",
  },
  {
    icon: UserCheck,
    title: "Human handoff in one click",
    body: "When a customer asks for a person, agents are alerted and take over the chat — then hand it back to AI.",
  },
  {
    icon: ShoppingBag,
    title: "Tickets and orders from chat",
    body: "The AI opens tickets and records orders on its own, so nothing a customer asks for gets lost.",
  },
  {
    icon: BarChart3,
    title: "Insights on knowledge gaps",
    body: "See which questions your documents can’t answer yet, and what to add next.",
  },
  {
    icon: Lock,
    title: "Private to every business",
    body: "Each company’s data, API keys and usage are fully separated, with encrypted keys and role-based access.",
  },
];

const STEPS = [
  { title: "Accept your invite", body: "Set up your company profile and get your API key." },
  { title: "Upload your knowledge", body: "FAQs, price lists, policies, opening hours." },
  { title: "Connect your channels", body: "Link WhatsApp in a few clicks or add the website widget." },
  { title: "Go live", body: "The AI answers 24/7; your team watches and steps in." },
];

function SectionIntro({ id, label, title }: { id: string; label: string; title: string }) {
  return (
    <div className="flex max-w-[680px] flex-col gap-2.5">
      <p className={eyebrow}>{label}</p>
      <h2 id={id} className={sectionHeading}>
        {title}
      </h2>
    </div>
  );
}

export function LandingChannels() {
  return (
    <section aria-label="Channels" className="border-b border-border bg-muted">
      <ul
        className={`${container} flex flex-wrap justify-center gap-x-10 gap-y-3 py-[22px] text-[15px] font-semibold text-slate-700`}
      >
        {CHANNELS.map(({ icon: Icon, label }) => (
          <li key={label} className="inline-flex items-center gap-2">
            <Icon className="size-5 text-teal-700" aria-hidden="true" />
            {label}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function LandingFeatures() {
  return (
    <section
      id="features"
      aria-labelledby="features-heading"
      className={`${container} flex scroll-mt-4 flex-col gap-10 py-16 lg:py-22`}
    >
      <SectionIntro
        id="features-heading"
        label="Features"
        title="One workspace for every customer conversation"
      />
      <ul className="flex flex-wrap gap-6">
        {FEATURES.map(({ icon: Icon, title, body }) => (
          <li
            key={title}
            className="flex min-w-0 flex-[1_1_340px] flex-col gap-3 rounded-2xl bg-muted p-7"
          >
            <span
              className="flex size-11 items-center justify-center rounded-xl bg-navy-800 text-teal-500"
              aria-hidden="true"
            >
              <Icon className="size-[22px]" />
            </span>
            <h3 className="font-heading text-xl font-semibold text-navy-800">{title}</h3>
            <p className="text-[15px] leading-relaxed text-muted-foreground">{body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function LandingHowItWorks() {
  return (
    <section id="how" aria-labelledby="how-heading" className="scroll-mt-4 bg-muted">
      <div className={`${container} flex flex-col gap-10 py-16 lg:py-22`}>
        <SectionIntro id="how-heading" label="How it works" title="Live in four steps" />
        <ol className="flex flex-wrap gap-6">
          {STEPS.map((step, index) => {
            const isLast = index === STEPS.length - 1;
            return (
              <li
                key={step.title}
                className={`flex min-w-0 flex-[1_1_240px] flex-col gap-2.5 rounded-2xl p-7 ${
                  isLast ? "bg-navy-800 text-white" : "bg-white text-navy-800 shadow-e1"
                }`}
              >
                <span
                  className={`flex size-10 items-center justify-center rounded-full font-heading font-bold text-navy-800 ${
                    isLast ? "bg-mint" : "bg-teal-500"
                  }`}
                  aria-hidden="true"
                >
                  {index + 1}
                </span>
                <h3 className="font-heading text-lg font-semibold">{step.title}</h3>
                <p
                  className={`text-[15px] leading-relaxed ${
                    isLast ? "text-slate-300" : "text-muted-foreground"
                  }`}
                >
                  {step.body}
                </p>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
