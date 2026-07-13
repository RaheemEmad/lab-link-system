import { lazy, Suspense, useMemo } from "react";
import LandingNav from "@/components/landing/LandingNav";
import LandingHero from "@/components/landing/LandingHero";
import ProblemSection from "@/components/landing/ProblemSection";
import ValuePropSection from "@/components/landing/ValuePropSection";
import HowItWorks from "@/components/landing/HowItWorks";
import LeadCaptureCTA from "@/components/landing/LeadCaptureCTA";
import LandingFooter from "@/components/landing/LandingFooter";
import { ScrollToTop } from "@/components/ui/scroll-to-top";
import { StructuredData, websiteSchema, breadcrumbSchema, faqSchema, localBusinessSchema } from "@/components/seo/StructuredData";
import { useLanguage } from "@/lib/i18n/LanguageContext";


// Below-fold sections - lazy-loaded to reduce initial bundle
const ProofSection = lazy(() => import("@/components/landing/ProofSection"));
const FAQSection = lazy(() => import("@/components/landing/FAQSection"));
const FinalCTA = lazy(() => import("@/components/landing/FinalCTA"));

const Home = () => {
  const { t } = useLanguage();
  const faqData = useMemo(() => {
    const f = t.landing.faq;
    return faqSchema([
      { question: f.q1, answer: f.a1 },
      { question: f.q2, answer: f.a2 },
      { question: f.q3, answer: f.a3 },
      { question: f.q4, answer: f.a4 },
      { question: f.q5, answer: f.a5 },
      { question: f.q6, answer: f.a6 },
    ]);
  }, [t]);

  return (
    <div className="min-h-screen">
      <StructuredData id="home-website" data={websiteSchema()} />
      <StructuredData id="home-org" data={localBusinessSchema()} />
      <StructuredData
        id="home-breadcrumb"
        data={breadcrumbSchema([{ name: "Home", path: "/" }])}
      />
      <StructuredData id="home-faq" data={faqData} />

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
