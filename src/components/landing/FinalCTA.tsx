import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const FinalCTA = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  return (
    <section className="py-24 bg-gradient-to-br from-primary/10 via-background to-accent/5">
      <div className="container px-4 mx-auto">
        <div className="max-w-3xl mx-auto text-center space-y-8 animate-fade-in">
          <h2 className="text-3xl md:text-5xl font-bold leading-tight">
            Start LabLink in under 2 minutes. Zero cost, zero risk
          </h2>
          
          <Button 
            size="lg"
            className="text-lg px-12 py-6 h-auto hover:scale-105 transition-transform duration-300"
            onClick={() => navigate(user ? "/new-order" : "/auth")}
          >
            {user ? "Submit an Order Now" : "Launch LabLink Free"}
          </Button>
        </div>
      </div>
    </section>
  );
};

export default FinalCTA;
