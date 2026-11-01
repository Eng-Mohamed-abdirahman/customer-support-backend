import type { Metadata } from "next";

import { LandingPage } from "@/components/landing/landing-page";

export const metadata: Metadata = {
  title: "Technov — AI customer support for your business",
  description:
    "Upload your price lists, policies and FAQs. Technov answers your customers 24/7 on WhatsApp and your website, creates tickets and orders, and hands the chat to your team when a person is needed.",
};

export default function HomePage() {
  return <LandingPage />;
}
