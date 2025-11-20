import LandingNav from "@/components/landing/LandingNav";
import LandingHero from "@/components/landing/LandingHero";
import ProblemSection from "@/components/landing/ProblemSection";
import FeatureSnapshot from "@/components/landing/FeatureSnapshot";
import HowItWorks from "@/components/landing/HowItWorks";
import DualView from "@/components/landing/DualView";
import ZeroCostStack from "@/components/landing/ZeroCostStack";
import ProofSection from "@/components/landing/ProofSection";
import FAQSection from "@/components/landing/FAQSection";
import FinalCTA from "@/components/landing/FinalCTA";
import LandingFooter from "@/components/landing/LandingFooter";

const Home = () => {
  return (
    <div className="min-h-screen">
      <LandingNav />
      <LandingHero />
      <ProblemSection />
      <FeatureSnapshot />
      <HowItWorks />
      <DualView />
      <ZeroCostStack />
      <ProofSection />
      <FAQSection />
      <FinalCTA />
      <LandingFooter />
    </div>
  );
};

export default Home;
