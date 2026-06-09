import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { useLanguage } from "@/lib/i18n/LanguageContext";

const FAQSection = () => {
  const { t } = useLanguage();
  const f = t.landing.faq;
  const faqs = [
    { question: f.q1, answer: f.a1 },
    { question: f.q2, answer: f.a2 },
    { question: f.q3, answer: f.a3 },
    { question: f.q4, answer: f.a4 },
    { question: f.q5, answer: f.a5 },
    { question: f.q6, answer: f.a6 },
  ];

  return (
    <section className="py-24 bg-secondary/30">
      <div className="container px-4 mx-auto">
        <div className="max-w-3xl mx-auto">
          <ScrollReveal>
            <h3 className="text-3xl md:text-4xl font-bold text-center mb-12">{f.headline}</h3>
          </ScrollReveal>

          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <ScrollReveal key={index} delay={index * 80}>
                <AccordionItem value={`item-${index}`} className="bg-card px-6 rounded-xl border border-border hover-scale transition-all duration-300">
                  <AccordionTrigger className="text-start font-semibold hover:no-underline hover:text-primary transition-colors">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              </ScrollReveal>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
