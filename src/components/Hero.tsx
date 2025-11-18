import { Button } from "@/components/ui/button";
import { FileText, LayoutDashboard, LogIn, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const Hero = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  return (
    <section className="relative min-h-[600px] flex items-center justify-center overflow-hidden bg-gradient-to-br from-primary via-primary/95 to-accent">
      <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:32px_32px]" />
      
      <div className="absolute top-4 right-4 z-20">
        {user ? (
          <Button variant="outline" onClick={signOut} className="border-white/30 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20">
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        ) : (
          <Button variant="outline" onClick={() => navigate("/auth")} className="border-white/30 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20">
            <LogIn className="mr-2 h-4 w-4" />
            Sign In
          </Button>
        )}
      </div>

      <div className="container relative z-10 px-4 py-24">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center rounded-full border border-white/20 bg-white/10 px-4 py-1.5 backdrop-blur-sm">
            <span className="text-sm font-medium text-white">Digital Order Management</span>
          </div>
          
          <h1 className="mb-6 text-5xl font-bold tracking-tight text-white sm:text-6xl lg:text-7xl">
            Dental Lab
            <span className="block bg-gradient-to-r from-white to-accent-foreground bg-clip-text text-transparent">
              Order System
            </span>
          </h1>
          
          <p className="mb-10 text-lg text-white/90 sm:text-xl">
            Streamline your dental lab workflow with our professional digital order management platform. 
            Track cases from intake to delivery with ease.
          </p>
          
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Button
              size="lg"
              variant="secondary"
              onClick={() => navigate("/new-order")}
              className="group relative overflow-hidden bg-white text-primary hover:bg-white/90"
            >
              <FileText className="mr-2 h-5 w-5" />
              Submit New Order
            </Button>
            
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate("/dashboard")}
              className="border-white/30 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20"
            >
              <LayoutDashboard className="mr-2 h-5 w-5" />
              View Dashboard
            </Button>
          </div>
        </div>
      </div>
      
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
};

export default Hero;
