import { FileText, Settings, CheckCircle2 } from "lucide-react";
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
      title: "Submit Order (Dentist)",
      description: "Two-minute form capture: photos, tooth #, shade, urgency",
    },
    {
      number: "2",
      icon: Settings,
      title: "Process (Lab)",
      description: "Lab updates status: In Progress, Ready for QC, Ready for Delivery",
    },
    {
      number: "3",
      icon: CheckCircle2,
      title: "Deliver & Confirm",
      description: "Track shipments and mark delivered with automatic audit log",
    },
  ];

  return (
    <section id="how-it-works" className="py-12 sm:py-16 md:py-24 bg-secondary/30">
      <div className="container px-4 mx-auto">
        <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-12 sm:mb-16 animate-fade-in">
          How It Works: 3 Steps
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12 mb-8 sm:mb-12 max-w-6xl mx-auto">
          {steps.map((step, index) => (
            <div key={index} className="relative animate-fade-in" style={{ animationDelay: `${index * 150}ms` }}>
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-16 left-[60%] w-[80%] h-0.5 bg-border" />
              )}
              
              <div className="relative text-center space-y-3 sm:space-y-4">
                {/* Step number badge */}
                <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-primary text-primary-foreground text-xl sm:text-2xl font-bold mb-3 sm:mb-4 shadow-lg hover-scale">
                  {step.number}
                </div>
                
                {/* Icon */}
                <div className="flex justify-center">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-primary/10 flex items-center justify-center hover-scale">
                    <step.icon className="w-7 h-7 sm:w-8 sm:h-8 text-primary" strokeWidth={2} />
                  </div>
                </div>
                
                {/* Content */}
                <h4 className="text-lg sm:text-xl font-semibold">{step.title}</h4>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
        
        <div className="text-center px-4">
          <Button 
            size="lg"
            className="text-sm sm:text-base px-6 sm:px-8 w-full sm:w-auto"
            onClick={() => navigate(user ? "/new-order" : "/auth")}
          >
            {user ? "Submit Your First Order" : "Start LabLink Free"}
          </Button>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
