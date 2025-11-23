import { Building2, Stethoscope, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ScrollReveal } from "@/components/ui/scroll-reveal";

const RoleShowcase = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const roles = [
    {
      type: "dentist",
      icon: Stethoscope,
      title: "For Dentists",
      subtitle: "Streamline Your Practice",
      benefits: [
        "Submit orders in 2 minutes with guided forms",
        "Browse and connect with verified labs",
        "Track every case in real-time from intake to delivery",
        "Build your network of preferred labs",
        "Access complete order history and documentation"
      ],
      cta: "Start Ordering",
      route: user ? "/new-order" : "/auth",
      gradient: "from-primary/10 to-accent/5"
    },
    {
      type: "lab",
      icon: Building2,
      title: "For Dental Labs",
      subtitle: "Grow Your Business",
      benefits: [
        "Create a professional lab profile with logo and specializations",
        "Get discovered by dentists searching for your expertise",
        "Manage incoming orders with workflow tools",
        "Build reputation with performance tracking",
        "Reduce errors with standardized order intake"
      ],
      cta: "Setup Lab Profile",
      route: user ? "/lab-admin" : "/auth",
      gradient: "from-accent/10 to-primary/5"
    }
  ];

  return (
    <section className="py-16 sm:py-20 md:py-28 bg-secondary/30">
      <div className="container px-4 mx-auto">
        <ScrollReveal>
          <div className="max-w-3xl mx-auto text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6">
              Built for Your Workflow
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
              Whether you're a dentist seeking reliable labs or a lab looking to grow your client base, LabLink has you covered.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 max-w-7xl mx-auto">
          {roles.map((role, index) => (
            <ScrollReveal key={role.type} delay={index * 150}>
              <div
                className={`relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br ${role.gradient} p-8 sm:p-10 hover:shadow-xl transition-all duration-300 h-full flex flex-col`}
              >
                {/* Icon */}
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                  <role.icon className="w-7 h-7 sm:w-8 sm:h-8 text-primary" strokeWidth={2} />
                </div>

                {/* Title */}
                <h3 className="text-2xl sm:text-3xl font-bold mb-2">{role.title}</h3>
                <p className="text-base sm:text-lg text-muted-foreground mb-6">{role.subtitle}</p>

                {/* Benefits */}
                <ul className="space-y-3 mb-8">
                  {role.benefits.map((benefit, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm sm:text-base text-foreground">{benefit}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Button
                  size="lg"
                  className="w-full sm:w-auto group hover:scale-105 transition-transform"
                  onClick={() => navigate(role.route)}
                >
                  {role.cta}
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
};

export default RoleShowcase;
