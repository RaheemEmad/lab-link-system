import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, Zap, Building2, Stethoscope } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";


const LandingHero = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const heroRef = useRef<HTMLElement>(null);
  
  // Parallax scroll animations
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  });
  
  // Different parallax speeds for depth
  const orbY = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const gridY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const floatingY = useTransform(scrollYProgress, [0, 1], ["0%", "80%"]);
  const contentY = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);
  
  // Fade-out effect for hero section
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  
  // Wave animations responding to scroll
  const wave1Y = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const wave2Y = useTransform(scrollYProgress, [0, 1], [0, 100]);
  const wave3Y = useTransform(scrollYProgress, [0, 1], [0, 200]);
  
  const stats = [
    { value: "2 min", label: "Setup Time" },
    { value: "Zero", label: "Training Required" },
    { value: "100%", label: "Order Visibility" }
  ];
  
  const hooks = [
    "Transform WhatsApp chaos into organized workflows",
    "Every order tracked from intake to delivery",
    "Connect dentists with qualified labs instantly"
  ];
  return (
    <motion.section 
      ref={heroRef} 
      style={{ opacity: heroOpacity }}
      className="relative min-h-[85vh] sm:min-h-[88vh] flex items-center overflow-hidden bg-gradient-to-br from-background via-primary/5 to-background pb-12 sm:pb-16 md:pb-20"
    >
      {/* Animated wave patterns responding to scroll */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Wave 1 */}
        <motion.div
          style={{ y: wave1Y }}
          className="absolute -bottom-32 left-0 right-0"
        >
          <svg
            className="w-full h-64 opacity-[0.03]"
            viewBox="0 0 1440 320"
            preserveAspectRatio="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fill="hsl(var(--primary))"
              d="M0,96L48,112C96,128,192,160,288,160C384,160,480,128,576,122.7C672,117,768,139,864,138.7C960,139,1056,117,1152,101.3C1248,85,1344,75,1392,69.3L1440,64L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
            />
          </svg>
        </motion.div>
        
        {/* Wave 2 */}
        <motion.div
          style={{ y: wave2Y }}
          className="absolute -bottom-20 left-0 right-0"
        >
          <svg
            className="w-full h-48 opacity-[0.02]"
            viewBox="0 0 1440 320"
            preserveAspectRatio="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fill="hsl(var(--accent))"
              d="M0,224L48,213.3C96,203,192,181,288,181.3C384,181,480,203,576,213.3C672,224,768,224,864,208C960,192,1056,160,1152,154.7C1248,149,1344,171,1392,181.3L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
            />
          </svg>
        </motion.div>
        
        {/* Wave 3 */}
        <motion.div
          style={{ y: wave3Y }}
          className="absolute -bottom-10 left-0 right-0"
        >
          <svg
            className="w-full h-32 opacity-[0.04]"
            viewBox="0 0 1440 320"
            preserveAspectRatio="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fill="hsl(var(--primary))"
              d="M0,32L48,58.7C96,85,192,139,288,149.3C384,160,480,128,576,112C672,96,768,96,864,112C960,128,1056,160,1152,165.3C1248,171,1344,149,1392,138.7L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
            />
          </svg>
        </motion.div>
        
        {/* Abstract geometric shapes */}
        <motion.div
          style={{ y: wave1Y, rotate: useTransform(scrollYProgress, [0, 1], [0, 45]) }}
          className="absolute top-1/3 -right-20 w-96 h-96 border-2 border-primary/5 rounded-full"
        />
        <motion.div
          style={{ y: wave2Y, rotate: useTransform(scrollYProgress, [0, 1], [0, -30]) }}
          className="absolute bottom-1/4 -left-32 w-64 h-64 border-2 border-accent/5"
        />
      </div>
      
      {/* Animated gradient orbs with parallax */}
      <motion.div 
        style={{ y: orbY }}
        className="hidden sm:block absolute top-20 left-10 w-48 h-48 sm:w-72 sm:h-72 bg-primary/20 rounded-full blur-3xl animate-pulse" 
        transition={{ type: "spring", stiffness: 50 }}
      />
      <motion.div 
        style={{ y: orbY }}
        className="hidden sm:block absolute bottom-20 right-10 w-64 h-64 sm:w-96 sm:h-96 bg-accent/20 rounded-full blur-3xl animate-pulse" 
        transition={{ type: "spring", stiffness: 50 }}
      />
      
      {/* Animated grid with parallax */}
      <motion.div 
        style={{ y: gridY }}
        className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--primary)/0.03)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--primary)/0.03)_1px,transparent_1px)] bg-[size:32px_32px] sm:bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,black,transparent)] animate-fade-in" 
      />
      
      {/* Floating elements with parallax */}
      <motion.div 
        style={{ y: floatingY }}
        className="hidden md:block absolute top-1/4 right-1/4 animate-[float_6s_ease-in-out_infinite]"
      >
        <CheckCircle2 className="w-8 h-8 text-primary/30" />
      </motion.div>
      <motion.div 
        style={{ y: floatingY }}
        className="hidden md:block absolute bottom-1/3 left-1/4 animate-[float_5s_ease-in-out_infinite]" 
      >
        <Zap className="w-6 h-6 text-accent/40" />
      </motion.div>
      
      <motion.div style={{ y: contentY }} className="container relative z-10 px-4 mx-auto">
        <div className="max-w-5xl mx-auto">
          <div className="text-center space-y-6 sm:space-y-8 md:space-y-10">
            
            {/* Main headline */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight text-foreground animate-fade-in px-4 mt-8 sm:mt-12 md:mt-16" style={{ animationDelay: '100ms' }}>
              From WhatsApp Chaos to{" "}
              <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-[gradient_3s_ease_infinite] bg-[length:200%_auto]">
                Digital Clarity
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
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed px-4 animate-fade-in" style={{ animationDelay: '300ms' }}>
              The complete platform connecting dentists with qualified dental labs. Track orders, manage profiles, and streamline your entire workflow in one place.
            </p>
            
            {/* Dual CTA for both user types */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center px-4 animate-fade-in" style={{ animationDelay: '400ms' }}>
              <Button 
                size="lg" 
                className="text-base sm:text-lg px-8 py-6 h-auto group hover-scale hover-glow transition-all duration-300 shadow-lg w-full sm:w-auto"
                onClick={() => navigate(user ? "/new-order" : "/auth")}
              >
                <Stethoscope className="mr-2 h-5 w-5" />
                For Dentists
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              
              <Button 
                size="lg" 
                variant="outline"
                className="text-base sm:text-lg px-8 py-6 h-auto hover-scale transition-all duration-300 border-2 w-full sm:w-auto"
                onClick={() => navigate(user ? "/lab-admin" : "/auth")}
              >
                <Building2 className="mr-2 h-5 w-5" />
                For Labs
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
            
            <p className="text-xs sm:text-sm text-muted-foreground animate-fade-in px-4" style={{ animationDelay: '500ms' }}>
              Free to start • No credit card required • Launch in 2 minutes
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
      </motion.div>
    </motion.section>
  );
};

export default LandingHero;