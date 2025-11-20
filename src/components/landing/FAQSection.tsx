import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQSection = () => {
  const faqs = [
    {
      question: "How does role-based access work?",
      answer: "When you sign up, you choose your role: Doctor, Lab Staff, or Admin. Doctors can create and track their orders. Lab Staff can update statuses and add notes to all orders. Admins have full oversight and management capabilities.",
    },
    {
      question: "What features are included?",
      answer: "LabLink includes complete order management, real-time status tracking with full history timeline, internal notes system for collaboration between doctors and lab staff, automatic notifications for status changes, and secure role-based access control.",
    },
    {
      question: "Do both doctors and lab staff need accounts?",
      answer: "Yes, both doctors and lab staff need accounts to access LabLink. This ensures secure access, proper tracking of who made changes, and role-specific features. Sign up takes less than 2 minutes.",
    },
    {
      question: "How do I track order changes?",
      answer: "Every order has a complete history timeline showing all status changes with timestamps and the user who made each change. You can also add internal notes to communicate about specific orders with your team.",
    },
    {
      question: "Is my data secure?",
      answer: "Absolutely. LabLink uses enterprise-grade security with role-based access control, encrypted data storage, and secure authentication. Only authorized users with the correct role can access specific features and data.",
    },
    {
      question: "How much does it cost?",
      answer: "LabLink is currently free to use with all core features included: order management, status tracking, notes, and notifications. We're building advanced analytics and reporting features that may be offered as paid upgrades in the future.",
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
