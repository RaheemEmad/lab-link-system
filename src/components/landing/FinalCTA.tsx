import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft, Stethoscope, Building2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { useLanguage } from "@/lib/i18n/LanguageContext";

const FinalCTA = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, isRTL } = useLanguage();
  const Arrow = isRTL ? ArrowLeft : ArrowRight;
  const f = t.landing.finalCTA;

  return (
    <section className="py-20 sm:py-24 md:py-28 bg-gradient-to-br from-primary/10 via-background to-accent/5 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />

      <div className="container px-4 mx-auto relative z-10">
        <ScrollReveal>
          <div className="max-w-4xl mx-auto text-center space-y-6 sm:space-y-8">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight">{f.headline}</h2>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">{f.sub}</p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center px-4">
              <Button variant="gradient" size="lg" className="group" onClick={() => navigate(user ? "/new-order" : "/auth")}>
                <span className="relative z-10 flex items-center">
                  <Stethoscope className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
                  {f.dentist}
                  <Arrow className="ltr:ml-2 rtl:mr-2 h-4 w-4 group-hover:ltr:translate-x-1 group-hover:rtl:-translate-x-1 transition-transform" />
                </span>
              </Button>

              <Button size="lg" variant="outline" className="group" onClick={() => navigate(user ? "/lab-admin" : "/auth")}>
                <Building2 className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
                {f.lab}
                <Arrow className="ltr:ml-2 rtl:mr-2 h-4 w-4 group-hover:ltr:translate-x-1 group-hover:rtl:-translate-x-1 transition-transform" />
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">{f.trust}</p>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default FinalCTA;
