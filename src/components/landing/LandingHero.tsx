import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, Zap, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
const LandingHero = () => {
  const navigate = useNavigate();
  const {
    user
  } = useAuth();
  const handleGetStarted = () => {
    if (user) {
      navigate("/new-order");
    } else {
      navigate("/auth");
    }
  };
  const stats = [{
    value: "1,000+",
    label: "Cases Monthly"
  }, {
    value: "0",
    label: "Training Required"
  }, {
    value: "100%",
    label: "Order Accuracy"
  }];
  const hooks = ["Stop losing orders in WhatsApp threads", "Every shade, every tooth, always tracked", "From chaos to clarity in 2 minutes"];
  return <section className="relative min-h-[90vh] sm:min-h-[95vh] flex items-center overflow-hidden bg-gradient-to-br from-background via-primary/5 to-background">
      {/* Animated gradient orbs - hidden on small mobile */}
      <div className="hidden sm:block absolute top-20 left-10 w-48 h-48 sm:w-72 sm:h-72 bg-primary/20 rounded-full blur-3xl animate-pulse" style={{
      animationDuration: '4s'
    }} />
      <div className="hidden sm:block absolute bottom-20 right-10 w-64 h-64 sm:w-96 sm:h-96 bg-accent/20 rounded-full blur-3xl animate-pulse" style={{
      animationDuration: '6s',
      animationDelay: '1s'
    }} />
      
      {/* Animated grid - reduced on mobile */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--primary)/0.03)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--primary)/0.03)_1px,transparent_1px)] bg-[size:32px_32px] sm:bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,black,transparent)] animate-fade-in" />
      
      {/* Floating elements - hidden on mobile */}
      <div className="hidden md:block absolute top-1/4 right-1/4 animate-[float_6s_ease-in-out_infinite]">
        <CheckCircle2 className="w-8 h-8 text-primary/30" />
      </div>
      <div className="hidden md:block absolute bottom-1/3 left-1/4 animate-[float_5s_ease-in-out_infinite]" style={{
      animationDelay: '1s'
    }}>
        <Zap className="w-6 h-6 text-accent/40" />
      </div>
      <div className="hidden md:block absolute top-1/2 right-1/3 animate-[float_7s_ease-in-out_infinite]" style={{
      animationDelay: '2s'
    }}>
        <TrendingUp className="w-7 h-7 text-primary/20" />
      </div>
      
      <div className="container relative z-10 px-4 mx-auto">
        <div className="max-w-5xl mx-auto">
          {/* Center-aligned hero content */}
          <div className="text-center space-y-8">
            {/* Attention-grabbing pill */}
            
            
            {/* Main headline with animation */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight text-foreground animate-fade-in px-4" style={{
            animationDelay: '100ms'
          }}>
              Stop Losing Orders in{" "}
              <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-[gradient_3s_ease_infinite] bg-[length:200%_auto]">
                WhatsApp Chaos
              </span>
            </h1>
            
            {/* Hook bullets */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center px-4 animate-fade-in" style={{
            animationDelay: '200ms'
          }}>
              {hooks.map((hook, index) => <div key={index} className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-center sm:text-left">{hook}</span>
                </div>)}
            </div>
            
            {/* Subheadline */}
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed px-4 animate-fade-in" style={{
            animationDelay: '300ms'
          }}>
              LabLink transforms scattered WhatsApp messages into a crystal-clear digital workflow. Track every tooth, every shade, every delivery with zero mistakes.
            </p>
            
            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4 animate-fade-in" style={{
            animationDelay: '400ms'
          }}>
              <Button size="lg" className="text-base sm:text-lg px-8 sm:px-10 py-5 sm:py-6 h-auto group hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl w-full sm:w-auto" onClick={handleGetStarted}>
                {user ? "Submit New Order" : "Launch LabLink Free"}
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              
              <Button size="lg" variant="outline" className="text-base sm:text-lg px-8 sm:px-10 py-5 sm:py-6 h-auto hover:scale-105 transition-all duration-300 border-2 w-full sm:w-auto" onClick={() => window.location.href = "#how-it-works"}>
                See How It Works
              </Button>
            </div>
            
            <p className="text-xs sm:text-sm text-muted-foreground animate-fade-in px-4" style={{
            animationDelay: '500ms'
          }}>
              No credit card • No installation • 2 minutes to launch
            </p>
            
            {/* Stats bar */}
            <div className="grid grid-cols-3 gap-4 sm:gap-8 max-w-2xl mx-auto pt-8 sm:pt-12 px-4 animate-fade-in" style={{
            animationDelay: '600ms'
          }}>
              {stats.map((stat, index) => <div key={index} className="text-center group hover-scale">
                  <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-1 group-hover:text-primary transition-colors">
                    {stat.value}
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground">
                    {stat.label}
                  </div>
                </div>)}
            </div>
          </div>
        </div>
      </div>
    </section>;
};
export default LandingHero;