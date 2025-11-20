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
    <section id="how-it-works" className="py-24 bg-secondary/30">
      <div className="container px-4 mx-auto">
        <h3 className="text-3xl md:text-4xl font-bold text-center mb-16 animate-fade-in">
          How It Works: 3 Steps
        </h3>
        
        <div className="grid md:grid-cols-3 gap-12 mb-12 max-w-6xl mx-auto">
          {steps.map((step, index) => (
            <div key={index} className="relative animate-fade-in" style={{ animationDelay: `${index * 150}ms` }}>
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-16 left-[60%] w-[80%] h-0.5 bg-border" />
              )}
              
              <div className="relative text-center space-y-4">
                {/* Step number badge */}
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary text-primary-foreground text-2xl font-bold mb-4 shadow-lg hover-scale">
                  {step.number}
                </div>
                
                {/* Icon */}
                <div className="flex justify-center">
                  <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center hover-scale">
                    <step.icon className="w-8 h-8 text-primary" strokeWidth={2} />
                  </div>
                </div>
                
                {/* Content */}
                <h4 className="text-xl font-semibold">{step.title}</h4>
                <p className="text-muted-foreground leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
        
        <div className="text-center">
          <Button 
            size="lg"
            className="text-base px-8"
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
