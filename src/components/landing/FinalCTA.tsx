import { Button } from "@/components/ui/button";
import { ArrowRight, Stethoscope, Building2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ScrollReveal } from "@/components/ui/scroll-reveal";

const FinalCTA = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  return (
    <section className="py-20 sm:py-24 md:py-28 bg-gradient-to-br from-primary/10 via-background to-accent/5 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      
      <div className="container px-4 mx-auto relative z-10">
        <ScrollReveal>
          <div className="max-w-4xl mx-auto text-center space-y-6 sm:space-y-8">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight">
              Ready to Transform Your Workflow?
            </h2>
            
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Join dentists and labs using LabLink. Get started in 2 minutes.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center px-4">
              <Button 
                variant="gradient"
                size="lg"
                className="group"
                onClick={() => navigate(user ? "/new-order" : "/auth")}
              >
                <span className="relative z-10 flex items-center">
                  <Stethoscope className="mr-2 h-4 w-4" />
                  Start as Dentist
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </span>
              </Button>
              
              <Button 
                size="lg"
                variant="outline"
                className="group"
                onClick={() => navigate(user ? "/lab-admin" : "/auth")}
              >
                <Building2 className="mr-2 h-4 w-4" />
                Join as Lab
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
            
            <p className="text-xs text-muted-foreground">
              Free to start • No credit card • 2 minute setup
            </p>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default FinalCTA;
