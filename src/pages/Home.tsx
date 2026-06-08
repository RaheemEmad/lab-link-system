import { lazy, Suspense } from "react";
import LandingNav from "@/components/landing/LandingNav";
import LandingHero from "@/components/landing/LandingHero";
import ProblemSection from "@/components/landing/ProblemSection";
import ValuePropSection from "@/components/landing/ValuePropSection";
import HowItWorks from "@/components/landing/HowItWorks";
import LeadCaptureCTA from "@/components/landing/LeadCaptureCTA";
import LandingFooter from "@/components/landing/LandingFooter";
import { ScrollToTop } from "@/components/ui/scroll-to-top";

// Below-fold sections - lazy-loaded to reduce initial bundle
const ProofSection = lazy(() => import("@/components/landing/ProofSection"));
const FAQSection = lazy(() => import("@/components/landing/FAQSection"));
const FinalCTA = lazy(() => import("@/components/landing/FinalCTA"));

const Home = () => {
  return (
    <div className="min-h-screen">
      <LandingNav />
      <main>
        <LandingHero />
        <ProblemSection />
        <ValuePropSection />
        <HowItWorks />

        {/* Lead capture - email / WhatsApp → digital order form */}
        <section className="bg-background py-16 sm:py-20">
          <div className="container mx-auto max-w-4xl px-4 sm:px-6">
            <LeadCaptureCTA source="landing-mid" variant="band" />
          </div>
        </section>

        <Suspense fallback={<div className="min-h-[200px]" />}>
          <ProofSection />
          <FAQSection />
          <FinalCTA />
        </Suspense>
      </main>
      <LandingFooter />
      <ScrollToTop />
    </div>
  );
};

export default Home;
