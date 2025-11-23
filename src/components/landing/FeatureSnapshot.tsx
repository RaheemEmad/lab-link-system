import { ClipboardCheck, Building2, Star, Truck, Users, TrendingUp } from "lucide-react";
import { ScrollReveal } from "@/components/ui/scroll-reveal";

const FeatureSnapshot = () => {
  const features = [
    {
      icon: ClipboardCheck,
      title: "Smart Order Intake",
      description: "Digital forms capture every detail: tooth numbers, shades, photos, and delivery requirements",
    },
    {
      icon: Building2,
      title: "Lab Profiles & Marketplace",
      description: "Browse verified labs, view specializations, pricing tiers, and performance metrics",
    },
    {
      icon: Star,
      title: "Preferred Lab Network",
      description: "Save your trusted labs and streamline ordering with one-click lab selection",
    },
    {
      icon: TrendingUp,
      title: "Real-Time Status Tracking",
      description: "Monitor every order from pending to delivered with automatic updates and notifications",
    },
    {
      icon: Users,
      title: "Team Collaboration",
      description: "Share notes, attachments, and updates across your entire dental team",
    },
    {
      icon: Truck,
      title: "Delivery Management",
      description: "Track shipments, set delivery dates, and maintain complete audit trails",
    },
  ];

  return (
    <section className="py-12 sm:py-16 md:py-24 bg-background">
      <div className="container px-4 mx-auto">
        <ScrollReveal>
          <div className="max-w-4xl mx-auto text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6">
              Everything You Need in One Platform
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
              LabLink brings together dentists and labs with professional tools for order management, lab discovery, and seamless collaboration.
            </p>
          </div>
        </ScrollReveal>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {features.map((feature, index) => (
            <ScrollReveal key={index} delay={index * 100}>
              <div className="bg-card p-6 sm:p-8 rounded-xl border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-[0_8px_30px_rgba(47,59,74,0.08)] hover-scale group h-full">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4 sm:mb-5 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="w-6 h-6 sm:w-7 sm:h-7 text-primary" strokeWidth={2} />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeatureSnapshot;
