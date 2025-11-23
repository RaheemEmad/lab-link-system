import { FileText, Building2, TrendingUp, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const HowItWorks = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const steps = [
    {
      number: "1",
      icon: FileText,
      title: "Create & Submit Orders",
      description: "Dentists fill guided forms with tooth details, shades, photos, and select their preferred lab",
    },
    {
      number: "2",
      icon: Building2,
      title: "Lab Accepts & Processes",
      description: "Labs receive orders, update status through the workflow, and collaborate via notes",
    },
    {
      number: "3",
      icon: TrendingUp,
      title: "Track Progress",
      description: "Both parties monitor real-time status updates with automatic notifications",
    },
    {
      number: "4",
      icon: Truck,
      title: "Deliver & Close",
      description: "Add tracking details, confirm delivery, and maintain complete audit history",
    },
  ];

  return (
    <section id="how-it-works" className="py-12 sm:py-16 md:py-24 bg-background">
      <div className="container px-4 mx-auto">
        <div className="max-w-3xl mx-auto text-center mb-12 sm:mb-16 animate-fade-in">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6">
            Simple, Transparent Workflow
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            From order creation to delivery, every step is tracked and visible to your entire team.
          </p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10 mb-8 sm:mb-12 max-w-7xl mx-auto">
          {steps.map((step, index) => (
            <div key={index} className="relative animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-12 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-primary/50 to-primary/20" />
              )}
              
              <div className="relative text-center space-y-4">
                {/* Step number badge */}
                <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-primary text-primary-foreground text-lg sm:text-xl font-bold shadow-lg hover-scale">
                  {step.number}
                </div>
                
                {/* Icon */}
                <div className="flex justify-center">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-primary/10 flex items-center justify-center hover-scale group-hover:bg-primary/20 transition-colors">
                    <step.icon className="w-7 h-7 sm:w-8 sm:h-8 text-primary" strokeWidth={2} />
                  </div>
                </div>
                
                {/* Content */}
                <h3 className="text-lg sm:text-xl font-semibold">{step.title}</h3>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed px-2">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
        
        <div className="text-center px-4 mt-12">
          <Button 
            size="lg"
            className="text-base sm:text-lg px-8 py-6 h-auto hover:scale-105 transition-transform shadow-lg"
            onClick={() => navigate(user ? "/new-order" : "/auth")}
          >
            {user ? "Submit Your First Order" : "Get Started Free"}
          </Button>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
