import { FileText, Building2, TrendingUp, Truck, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { ScrollReveal } from "@/components/ui/scroll-reveal";

const HowItWorks = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isRTL } = useLanguage();
  const Arrow = isRTL ? ArrowLeft : ArrowRight;

  const steps = [
    {
      number: "01",
      icon: FileText,
      title: "Create & Submit",
      description: "Dentists fill a guided form - tooth details, shades, photos - and pick a preferred lab.",
    },
    {
      number: "02",
      icon: Building2,
      title: "Lab Accepts",
      description: "Labs receive the order, accept with one click, and start moving it through their workflow.",
    },
    {
      number: "03",
      icon: TrendingUp,
      title: "Track Progress",
      description: "Both sides see live status updates and notifications as the case advances.",
    },
    {
      number: "04",
      icon: Truck,
      title: "Deliver & Close",
      description: "Add tracking, confirm delivery, and keep the full audit trail for every order.",
    },
  ];

  return (
    <section id="how-it-works" className="relative bg-muted/30 py-20 sm:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
              Workflow
            </div>
            <h2 className="mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              Simple, Transparent Workflow
            </h2>
            <p className="text-base text-muted-foreground sm:text-lg">
              From order creation to delivery - every step is tracked, visible, and on the record.
            </p>
          </div>
        </ScrollReveal>

        <div className="relative mx-auto grid max-w-6xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {/* connector */}
          <div className="absolute left-0 right-0 top-7 hidden h-px bg-gradient-to-r from-transparent via-border to-transparent lg:block" />

          {steps.map((step, index) => (
            <ScrollReveal key={index} delay={index * 80}>
              <div className="group relative h-full rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg">
                <div className="mb-5 flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <step.icon className="h-5 w-5" />
                  </div>
                  <span className="font-mono text-xs font-bold text-muted-foreground">
                    {step.number}
                  </span>
                </div>
                <h3 className="mb-2 text-lg font-semibold text-foreground">{step.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{step.description}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal delay={400}>
          <div className="mt-14 text-center">
            <Button
              size="lg"
              onClick={() => navigate(user ? "/new-order" : "/auth")}
              className="group h-12 rounded-xl px-7 text-base font-semibold shadow-lg shadow-primary/20"
            >
              {user ? "Submit Your First Order" : "Get Started Free"}
              <Arrow className="ltr:ml-2 rtl:mr-2 h-4 w-4 transition-transform group-hover:ltr:translate-x-1 group-hover:rtl:-translate-x-1" />
            </Button>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default HowItWorks;
