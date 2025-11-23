import LandingNav from "@/components/landing/LandingNav";
import LandingHero from "@/components/landing/LandingHero";
import ProblemSection from "@/components/landing/ProblemSection";
import FeatureSnapshot from "@/components/landing/FeatureSnapshot";
import RoleShowcase from "@/components/landing/RoleShowcase";
import LiveDemoSection from "@/components/landing/LiveDemoSection";
import HowItWorks from "@/components/landing/HowItWorks";
import VideoTutorialSection from "@/components/landing/VideoTutorialSection";
import DualView from "@/components/landing/DualView";
import ProofSection from "@/components/landing/ProofSection";
import FAQSection from "@/components/landing/FAQSection";
import FinalCTA from "@/components/landing/FinalCTA";
import LandingFooter from "@/components/landing/LandingFooter";
import { ScrollToTop } from "@/components/ui/scroll-to-top";

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
      <VideoTutorialSection />
      <DualView />
      <ProofSection />
      <FAQSection />
      <FinalCTA />
      <LandingFooter />
      <ScrollToTop />
    </div>
  );
};

export default Home;
