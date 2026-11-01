import { CircleCheck, FileText } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

import { container, ctaOutlineLight, ctaTeal } from "./landing-styles";

export function LandingHero() {
  return (
    <section
      id="top"
      aria-labelledby="hero-heading"
      className="relative overflow-hidden bg-navy-800 text-white"
    >
      <div
        className="pointer-events-none absolute -top-[260px] -right-[180px] size-[640px] rounded-full border-[64px] border-teal-500 opacity-16"
        aria-hidden="true"
      />
      <div
        className={`${container} relative flex flex-wrap items-center gap-14 pt-16 pb-20 lg:pt-22 lg:pb-24`}
      >
        <div className="flex min-w-0 flex-[1_1_480px] flex-col gap-[22px]">
          <span className="self-start rounded-full bg-mint px-3 py-1.5 text-[13px] font-semibold text-navy-800">
            AI support agent · WhatsApp &amp; website
          </span>
          <h1
            id="hero-heading"
            className="font-heading text-4xl leading-tight font-bold tracking-tight sm:text-5xl sm:leading-[56px] lg:text-[56px] lg:leading-16"
          >
            Answers your customers 24/7 — from your own knowledge
          </h1>
          <p className="max-w-[560px] text-lg leading-7 text-navy-100">
            Upload your price lists, policies and FAQs. Technov replies on WhatsApp and your
            website, creates tickets and orders, and hands the chat to your team the moment a
            person is needed.
          </p>
          <div className="mt-1.5 flex flex-wrap gap-3">
            <Button asChild className={ctaTeal}>
              <Link href="/login">Start free trial</Link>
            </Button>
            <Button asChild variant="outline" className={ctaOutlineLight}>
              <a href="#how">See how it works</a>
            </Button>
          </div>
          <p className="text-sm text-navy-200">
            No credit card required · Set up in under an hour
          </p>
        </div>

        <ExampleConversation />
      </div>
    </section>
  );
}

function ExampleConversation() {
  return (
    <figure
      aria-label="Example conversation"
      className="m-0 min-w-0 max-w-[460px] flex-[1_1_400px] overflow-hidden rounded-3xl bg-white text-navy-800 shadow-[0_18px_40px_rgba(10,28,44,0.35)]"
    >
      <div className="flex items-center gap-3 border-b border-border bg-muted px-5 py-4">
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-mint text-sm font-semibold"
          aria-hidden="true"
        >
          HA
        </span>
        <div className="flex min-w-0 grow flex-col">
          <span className="text-[15px] font-semibold">Hodan Ahmed</span>
          <span className="text-[13px] text-muted-foreground">WhatsApp · +252 61 555 0101</span>
        </div>
        <span className="shrink-0 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700">
          AI replying
        </span>
      </div>

      <div className="flex flex-col gap-3 bg-white p-5 text-[15px] leading-normal">
        <p className="max-w-[80%] self-end rounded-[16px_16px_4px_16px] bg-navy-800 px-4 py-3 text-white">
          Do you have the Samsung A55 in stock? How much is delivery to Hargeisa?
        </p>
        <div className="flex max-w-[88%] flex-col gap-2 self-start">
          <p className="rounded-[16px_16px_16px_4px] bg-muted px-4 py-3">
            Yes — the A55 (128 GB) is in stock for $389. Delivery to Hargeisa is $8 and takes
            2–3 business days.
          </p>
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <FileText className="size-3.5 shrink-0" aria-hidden="true" />
            From “Product catalogue 2026” and “Delivery policy”
          </span>
        </div>
        <p className="max-w-[80%] self-end rounded-[16px_16px_4px_16px] bg-navy-800 px-4 py-3 text-white">
          Great, I’d like to order one.
        </p>
        <div className="flex items-center gap-2.5 rounded-xl bg-green-50 px-3.5 py-3 text-sm text-green-600">
          <CircleCheck className="size-[18px] shrink-0" aria-hidden="true" />
          <span>
            <b>Order created</b> · Samsung A55 × 1 — sent to your team
          </span>
        </div>
      </div>
    </figure>
  );
}
