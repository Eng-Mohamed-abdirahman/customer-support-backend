import Image from "next/image";
import Link from "next/link";

import { MaterialIcon } from "./landing-header";

const KNOWLEDGE_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuByLzg3SiKV6CHdPKpPlNdc2AykCgIVGEum7lYSeLtrapZAsZpovGUsKRUYXomnstlA_XJG90-qqwl4I3_-RF4duDHoAc-v-OjWWgNs4ZvZh6lFTUXmdbAFkJOkdknBuysrTfC4WiyvSeHwCYKWACiPL6s1T6JoDAfoezpH-H5g4GABJWKO8y8oE2kuZa_EFqAGwzhjWUdHlsoOR2QCiM9IxMquftTdiDoayeobmBLRGRXYcIbqtH1lxNAHZWbz8p-5Owl-0tDIW1Ku";

const ANALYTICS_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBSpmJRpG600xX0aEOQrJMOzTBnIqlkVzhdxLjhlRENOkGlNsJNSNkyDc377yr-CROLQgOU0FdpPpOMgFnN_cbFmQS2fWVmRSjj-3h0yE6dmNMmsp1p_LsCIhvJxUjSYiznMPY0RHeEUCotj6_o8c52T0WI2CiCPSLr9heL1zW4j1ItaYuTLNC8LI1u73ewhjUci5AwuMrv-cJxGlPnaJpyAviGydQE6Y7usTXkaY03_INRu3uV7_k48zWOodPfeLjsEFjfBfC1Yc8x";

const KNOWLEDGE_SOURCES = ["PDF Upload", "Website Crawling", "FAQ Import", "Document Sync"];

const STEPS = [
  { icon: "person_add", title: "Create", description: "Sign up and create your first AI agent profile." },
  { icon: "upload_file", title: "Upload", description: "Sync your website and documentation." },
  { icon: "palette", title: "Customize", description: "Design the widget to match your brand colors." },
  { icon: "rocket_launch", title: "Deploy", description: "Copy one line of code to your site and you're live." },
];

const INTEGRATIONS = [
  { icon: "chat", color: "text-green-500", name: "WhatsApp" },
  { icon: "grid_view", color: "text-purple-600", name: "Slack" },
  { icon: "groups", color: "text-blue-600", name: "Discord" },
  { icon: "shopping_bag", color: "text-green-400", name: "Shopify" },
  { icon: "code", color: "text-blue-400", name: "WordPress" },
  { icon: "bolt", color: "text-orange-500", name: "Zapier" },
];

const STATS = [
  { label: "Total Conversations", value: "42,891", trend: "+12.5% vs last month", icon: "trending_up" },
  { label: "AI Resolution Rate", value: "94.2%", trend: "+4.1% vs last month", icon: "trending_up" },
  { label: "Avg. Response Time", value: "0.8s", trend: "Stable", icon: "check" },
  { label: "Customer Satisfaction", value: "4.9/5", trend: "Top 1% in sector", icon: "star", accent: true },
];

export function LandingKnowledge() {
  return (
    <section className="overflow-hidden bg-surface-container-lowest py-stack-xl">
      <div className="mx-auto max-w-container-max px-gutter">
        <div className="grid items-center gap-20 lg:grid-cols-2">
          <div className="relative">
            <div className="absolute -inset-20 rounded-full bg-primary/5 blur-[100px]" />
            <div className="glass-card relative rounded-3xl border border-outline-variant/20 p-8 shadow-2xl">
              <Image
                className="h-auto w-full rounded-2xl"
                src={KNOWLEDGE_IMAGE}
                alt="AI knowledge training"
                width={1200}
                height={900}
                sizes="(min-width: 1024px) 50vw, 100vw"
              />
              <div className="glass-card absolute -right-6 -bottom-6 rounded-2xl border border-white/60 p-6 shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-primary">
                    <MaterialIcon name="sync" />
                  </div>
                  <div>
                    <div className="font-bold text-on-surface">Auto-Retraining</div>
                    <div className="text-xs text-on-surface-variant">Knowledge updated 2m ago</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-8">
            <h2 className="text-headline-lg">
              Train AI Using Your <br /> Business Knowledge
            </h2>
            <p className="text-body-lg text-on-surface-variant">
              Stop manually writing scripts. Our AI crawls your website and parses your
              documents to understand your product as well as your best support agent.
            </p>
            <div className="grid grid-cols-2 gap-4">
              {KNOWLEDGE_SOURCES.map((source) => (
                <div
                  key={source}
                  className="flex items-center gap-3 rounded-xl border border-outline-variant/30 bg-surface-container-low p-4"
                >
                  <MaterialIcon name="check_circle" className="text-primary" filled />
                  <span className="font-medium">{source}</span>
                </div>
              ))}
            </div>
            <Link
              href="/login"
              className="flex items-center gap-3 rounded-2xl bg-on-background px-8 py-4 text-body-md font-semibold text-white transition-all hover:opacity-90"
            >
              Start Training Now
              <MaterialIcon name="arrow_forward" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export function LandingAnalytics() {
  return (
    <section className="relative overflow-hidden bg-on-background py-stack-xl text-white">
      <div className="relative z-10 mx-auto max-w-container-max px-gutter">
        <div className="mb-16 flex flex-col items-end justify-between gap-8 md:flex-row">
          <div className="max-w-xl">
            <h2 className="mb-4 text-headline-lg text-white">Performance you can measure</h2>
            <p className="text-body-md text-outline-variant">
              Get deep insights into how your AI agents are performing and how your
              customers are feeling.
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm">
            Last 30 Days
          </div>
        </div>
        <div className="mb-12 grid gap-6 lg:grid-cols-4">
          {STATS.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md"
            >
              <div className="mb-2 text-label-sm text-outline-variant uppercase">{stat.label}</div>
              <div className="text-3xl font-bold">{stat.value}</div>
              <div
                className={`mt-4 flex items-center gap-2 text-xs ${stat.accent ? "text-primary-fixed-dim" : "text-green-400"}`}
              >
                <MaterialIcon name={stat.icon} className="text-[14px]" />
                {stat.trend}
              </div>
            </div>
          ))}
        </div>
        <div className="glass-card rounded-3xl border border-white/10 bg-white/5 p-8">
          <Image
            className="h-auto w-full rounded-xl"
            src={ANALYTICS_IMAGE}
            alt="Analytics dashboard"
            width={1600}
            height={1000}
            sizes="100vw"
          />
        </div>
      </div>
    </section>
  );
}

export function LandingSteps() {
  return (
    <section className="bg-surface py-stack-xl">
      <div className="mx-auto max-w-container-max px-gutter">
        <div className="mb-20 text-center">
          <h2 className="text-headline-lg">Go Live in 4 Simple Steps</h2>
        </div>
        <div className="relative grid gap-8 md:grid-cols-4">
          <div className="absolute top-1/2 right-[10%] left-[10%] hidden h-px -translate-y-12 bg-outline-variant/30 md:block" />
          {STEPS.map((step) => (
            <div key={step.title} className="group relative space-y-6 text-center">
              <div className="primary-gradient relative z-10 mx-auto flex h-16 w-16 items-center justify-center rounded-2xl text-white shadow-xl transition-transform group-hover:scale-110">
                <MaterialIcon name={step.icon} className="text-2xl" />
              </div>
              <div>
                <h4 className="mb-2 font-bold">{step.title}</h4>
                <p className="text-sm text-on-surface-variant">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function LandingIntegrations() {
  return (
    <section className="border-y border-outline-variant/10 bg-surface-container-low py-stack-xl">
      <div className="mx-auto max-w-container-max px-gutter text-center">
        <h2 className="mb-16 text-headline-lg">Integrated with your tech stack</h2>
        <div className="flex flex-wrap justify-center gap-6">
          {INTEGRATIONS.map((item) => (
            <div
              key={item.name}
              className="glass-card flex h-32 w-32 cursor-default flex-col items-center justify-center gap-3 rounded-2xl transition-all hover:shadow-lg"
            >
              <MaterialIcon name={item.icon} className={`text-3xl ${item.color}`} />
              <span className="text-xs font-bold">{item.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
