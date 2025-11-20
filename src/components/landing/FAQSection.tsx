import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQSection = () => {
  const faqs = [
    {
      question: "How long to onboard?",
      answer: "5–10 minutes to set up the Google Form and Glide dashboard, plus a quick staff briefing. Most labs are up and running the same day.",
    },
    {
      question: "Do dentists need accounts?",
      answer: "No, dentists simply use the form link you share. No logins, no app installs. They fill out the form and submit. That's it.",
    },
    {
      question: "Is patient data secure?",
      answer: "Yes. All data is stored in your Google Workspace account, following your organization's G-Suite security policies. You control access and permissions.",
    },
    {
      question: "Can we use across branches?",
      answer: "Absolutely. Multi-location labs can use LabLink by adding a location tag to each order. Everything stays in one central dashboard.",
    },
    {
      question: "Paid upgrade?",
      answer: "The core system is free forever. We're building optional paid features like automated reminders, analytics dashboards, and advanced reporting coming soon.",
    },
  ];

  return (
    <section className="py-24 bg-secondary/30">
      <div className="container px-4 mx-auto">
        <div className="max-w-3xl mx-auto">
          <h3 className="text-3xl md:text-4xl font-bold text-center mb-12 animate-fade-in">
            Frequently Asked Questions
          </h3>
          
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem 
                key={index} 
                value={`item-${index}`}
                className="bg-card px-6 rounded-xl border border-border animate-fade-in"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <AccordionTrigger className="text-left font-semibold hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
