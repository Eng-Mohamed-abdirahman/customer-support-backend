import { LandingCta, LandingFooter } from "./landing-footer";
import { LandingHeader } from "./landing-header";
import { LandingHero } from "./landing-hero";
import { LandingPricing } from "./landing-pricing";
import { LandingChannels, LandingFeatures, LandingHowItWorks } from "./landing-sections";

export function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-clip bg-white text-navy-800">
      <LandingHeader />
      <main>
        <LandingHero />
        <LandingChannels />
        <LandingFeatures />
        <LandingHowItWorks />
        <LandingPricing />
        <LandingCta />
      </main>
      <LandingFooter />
    </div>
  );
}
