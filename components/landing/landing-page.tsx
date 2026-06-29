import {
  LandingHeader,
  LandingScrollEffects,
} from "./landing-header";
import {
  LandingFeatures,
  LandingHero,
  LandingTrustedBy,
} from "./landing-sections";
import {
  LandingAnalytics,
  LandingIntegrations,
  LandingKnowledge,
  LandingSteps,
} from "./landing-sections-2";
import {
  LandingCta,
  LandingFaq,
  LandingFooter,
  LandingPricing,
  LandingTestimonials,
} from "./landing-sections-3";

export function LandingPage() {
  return (
    <>
      <LandingScrollEffects />
      <LandingHeader />
      <main className="bg-surface pt-20 text-on-surface">
        <LandingHero />
        <LandingTrustedBy />
        <LandingFeatures />
        <LandingKnowledge />
        <LandingAnalytics />
        <LandingSteps />
        <LandingIntegrations />
        <LandingPricing />
        <LandingTestimonials />
        <LandingCta />
        <LandingFaq />
      </main>
      <LandingFooter />
    </>
  );
}
