import { Button } from "@/components/ui/button";
import { ArrowRight, Stethoscope, Building2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const FinalCTA = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  return (
    <section className="py-20 sm:py-24 md:py-28 bg-gradient-to-br from-primary/10 via-background to-accent/5 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      
      <div className="container px-4 mx-auto relative z-10">
        <div className="max-w-4xl mx-auto text-center space-y-8 sm:space-y-10 animate-fade-in">
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
            Ready to Transform Your Dental Workflow?
          </h2>
          
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Join dentists and labs already using LabLink. Get started in 2 minutes with zero cost and zero risk.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center px-4">
            <Button 
              size="lg"
              className="text-base sm:text-lg px-8 py-6 h-auto hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl group"
              onClick={() => navigate(user ? "/new-order" : "/auth")}
            >
              <Stethoscope className="mr-2 h-5 w-5" />
              Start as Dentist
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            
            <Button 
              size="lg"
              variant="outline"
              className="text-base sm:text-lg px-8 py-6 h-auto hover:scale-105 transition-all duration-300 border-2 group"
              onClick={() => navigate(user ? "/lab-admin" : "/auth")}
            >
              <Building2 className="mr-2 h-5 w-5" />
              Join as Lab
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
          
          <p className="text-sm text-muted-foreground">
            No credit card required • Free to start • Launch in minutes
          </p>
        </div>
      </div>
    </section>
  );
};

export default FinalCTA;
