import { lazy, Suspense } from "react";
import LandingNav from "@/components/landing/LandingNav";
import LandingHero from "@/components/landing/LandingHero";
import ProblemSection from "@/components/landing/ProblemSection";
import FeatureSnapshot from "@/components/landing/FeatureSnapshot";
import RoleShowcase from "@/components/landing/RoleShowcase";
import LiveDemoSection from "@/components/landing/LiveDemoSection";
import HowItWorks from "@/components/landing/HowItWorks";
import LandingFooter from "@/components/landing/LandingFooter";
import { ScrollToTop } from "@/components/ui/scroll-to-top";

// Below-fold sections — lazy-loaded to reduce initial bundle
const VideoTutorialSection = lazy(() => import("@/components/landing/VideoTutorialSection"));
const DualView = lazy(() => import("@/components/landing/DualView"));
const ProofSection = lazy(() => import("@/components/landing/ProofSection"));
const FAQSection = lazy(() => import("@/components/landing/FAQSection"));
const FinalCTA = lazy(() => import("@/components/landing/FinalCTA"));

const Home = () => {
  return (
    <div className="min-h-screen">
      <LandingNav />
      <LandingHero />
      <ProblemSection />
      <FeatureSnapshot />
      <RoleShowcase />
      <LiveDemoSection />
      <HowItWorks />
      <Suspense fallback={<div className="min-h-[200px]" />}>
        <VideoTutorialSection />
        <DualView />
        <ProofSection />
        <FAQSection />
        <FinalCTA />
      </Suspense>
      <LandingFooter />
      <ScrollToTop />
    </div>
  );
};

export default Home;
