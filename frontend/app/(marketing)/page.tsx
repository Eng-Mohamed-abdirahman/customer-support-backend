import type { Metadata } from "next";

import { LandingPage } from "@/components/landing/landing-page";

export const metadata: Metadata = {
  title: "Technov - AI Customer Support That Never Sleeps",
  description:
    "Deploy an intelligent AI agent trained on your business knowledge. Answer customer questions instantly across your website, WhatsApp, and more.",
};

export default function HomePage() {
  return <LandingPage />;
}
