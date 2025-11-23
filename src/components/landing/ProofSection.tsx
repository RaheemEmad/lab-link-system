import { Quote } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollReveal } from "@/components/ui/scroll-reveal";

const ProofSection = () => {
  const testimonials = [
    {
      name: "Dr. Sarah Mitchell",
      role: "Practice Owner",
      quote: "LabLink cut our follow-up calls by 70%. Our lab knows exactly what we need, every time.",
      initials: "SM",
    },
    {
      name: "James Rodriguez",
      role: "Lab Manager",
      quote: "We went from messy WhatsApp threads to organized workflows. Remakes dropped 40% in two months.",
      initials: "JR",
    },
    {
      name: "Dr. Emily Chen",
      role: "Prosthodontist",
      quote: "Finally, a system that respects our time. Submit orders in 2 minutes, get clear delivery dates.",
      initials: "EC",
    },
  ];

  return (
    <section className="py-24 bg-background">
      <div className="container px-4 mx-auto">
        <ScrollReveal>
          <div className="text-center mb-16">
            <h3 className="text-3xl md:text-4xl font-bold mb-4">
              Early adopters saw 70% fewer daily calls
            </h3>
          </div>
        </ScrollReveal>
        
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <ScrollReveal key={index} delay={index * 100}>
              <div className="bg-card p-8 rounded-xl border border-border shadow-soft card-interactive h-full">
                <Quote className="w-8 h-8 text-primary/30 mb-4 transition-transform duration-300 hover:scale-110" />
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  "{testimonial.quote}"
                </p>
                <div className="flex items-center gap-3">
                  <Avatar className="hover-scale">
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {testimonial.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{testimonial.name}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
        
        <ScrollReveal delay={300}>
          <div className="text-center mt-12">
            <div className="inline-flex items-center gap-8 px-8 py-4 bg-secondary/50 rounded-xl hover-scale">
              <div className="transition-transform duration-300 hover:scale-110">
                <p className="text-3xl font-bold text-primary">1,000+</p>
                <p className="text-sm text-muted-foreground">Cases processed</p>
              </div>
              <div className="w-px h-12 bg-border" />
              <div className="transition-transform duration-300 hover:scale-110">
                <p className="text-3xl font-bold text-primary">12</p>
                <p className="text-sm text-muted-foreground">Labs onboarded</p>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default ProofSection;
