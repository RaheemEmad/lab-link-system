import { AlertCircle, Shuffle, FileQuestion } from "lucide-react";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { useLanguage } from "@/lib/i18n/LanguageContext";

const ProblemSection = () => {
  const { t } = useLanguage();
  const p = t.landing.problem;
  const problems = [
    { icon: FileQuestion, title: p.missingTitle, description: p.missingDesc },
    { icon: Shuffle, title: p.processTitle, description: p.processDesc },
    { icon: AlertCircle, title: p.accountabilityTitle, description: p.accountabilityDesc },
  ];

  return (
    <section className="py-16 sm:py-20 md:py-24 lg:py-28 bg-secondary/30">
      <div className="container px-4 mx-auto">
        <ScrollReveal>
          <h3 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-12 sm:mb-14 md:mb-16 lg:mb-20 max-w-4xl mx-auto leading-tight">
            {p.headline}
          </h3>
        </ScrollReveal>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8 mb-10 sm:mb-12">
          {problems.map((problem, index) => (
            <ScrollReveal key={index} delay={index * 100}>
              <div className="bg-card p-6 sm:p-8 rounded-xl shadow-soft hover:shadow-medium card-interactive border border-border/50">
                <problem.icon className="w-12 h-12 text-destructive mb-4 transition-transform duration-300 group-hover:scale-110" strokeWidth={1.5} />
                <h4 className="text-xl font-semibold mb-2">{problem.title}</h4>
                <p className="text-muted-foreground">{problem.description}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>

        <div className="text-center">
          <a href="#how-it-works" className="inline-flex items-center text-primary hover:text-primary/80 font-medium transition-colors">
            {p.seeHow}
          </a>
        </div>
      </div>
    </section>
  );
};

export default ProblemSection;
