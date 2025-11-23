import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, Zap, Building2, Stethoscope, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";


const LandingHero = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const stats = [
    { value: "2 min", label: "Setup Time", icon: Zap },
    { value: "Zero", label: "Training Required", icon: Sparkles },
    { value: "100%", label: "Order Visibility", icon: CheckCircle2 }
  ];
  
  const benefits = [
    "Transform WhatsApp chaos into organized workflows",
    "Track every order from intake to delivery",
    "Connect with qualified labs instantly"
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5
      }
    }
  };

  return (
    <section className="relative min-h-[80vh] sm:min-h-[85vh] lg:min-h-[90vh] flex items-center overflow-hidden bg-gradient-to-br from-primary/10 via-accent/5 to-background">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Gradient orbs */}
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.2, 0.3]
          }}
          transition={{ 
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute -top-24 -left-24 w-96 h-96 bg-primary/20 rounded-full blur-3xl"
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.3, 1],
            opacity: [0.2, 0.3, 0.2]
          }}
          transition={{ 
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1
          }}
          className="absolute -bottom-24 -right-24 w-[500px] h-[500px] bg-accent/20 rounded-full blur-3xl"
        />
        
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--primary)/0.05)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--primary)/0.05)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_80%_60%_at_50%_50%,black,transparent)]" />
      </div>
      
      <div className="container relative z-10 px-4 sm:px-6 lg:px-8 mx-auto py-12 sm:py-16 lg:py-20 pt-20 sm:pt-28 lg:pt-32">
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-5xl mx-auto"
        >
          <div className="text-center space-y-6 sm:space-y-8">
            
            {/* Main headline */}
            <motion.h1 
              variants={itemVariants}
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold leading-[1.15] sm:leading-[1.2] text-foreground tracking-tight px-2"
            >
              From WhatsApp Chaos to{" "}
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-[gradient_3s_ease_infinite] bg-[length:200%_auto]">
                  Digital Clarity
                </span>
                <motion.div
                  animate={{ scaleX: [0, 1] }}
                  transition={{ duration: 0.8, delay: 0.5 }}
                  className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-primary to-accent origin-left"
                />
              </span>
            </motion.h1>
            
            {/* Subheadline */}
            <motion.p 
              variants={itemVariants}
              className="text-sm sm:text-base md:text-lg lg:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed px-4"
            >
              Connect dentists with qualified dental labs. Track orders, manage profiles, and streamline your workflow.
            </motion.p>
            
            {/* Benefits */}
            <motion.div 
              variants={itemVariants}
              className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center items-start sm:items-center max-w-4xl mx-auto px-4"
            >
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-start gap-2 text-xs sm:text-sm text-muted-foreground group w-full sm:w-auto">
                  <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                  <span className="text-left flex-1">{benefit}</span>
                </div>
              ))}
            </motion.div>
            
            {/* CTAs */}
            <motion.div 
              variants={itemVariants}
              className="flex flex-col sm:flex-row gap-3 justify-center pt-4 px-4"
            >
              <Button 
                variant="gradient"
                size="lg" 
                className="group relative z-10 w-full sm:w-auto"
                onClick={() => navigate(user ? "/new-order" : "/auth")}
              >
                <span className="relative z-10 flex items-center justify-center">
                  <Stethoscope className="mr-2 h-4 w-4" />
                  <span className="hidden xs:inline">For </span>Dentists
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </span>
              </Button>
              
              <Button 
                size="lg" 
                variant="outline"
                className="group w-full sm:w-auto"
                onClick={() => navigate(user ? "/lab-admin" : "/auth")}
              >
                <Building2 className="mr-2 h-4 w-4" />
                <span className="hidden xs:inline">For </span>Labs
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </motion.div>
            
            {/* Trust line */}
            <motion.p 
              variants={itemVariants}
              className="text-xs text-muted-foreground"
            >
              Free to start • No credit card • 2 minute setup
            </motion.p>
            
            {/* Stats */}
            <motion.div 
              variants={itemVariants}
              className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 max-w-3xl mx-auto pt-8 sm:pt-10 px-4"
            >
              {stats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <motion.div 
                    key={index}
                    whileHover={{ y: -4 }}
                    className="text-center p-4 sm:p-5 rounded-lg sm:rounded-xl bg-gradient-to-b from-primary/5 to-transparent border border-primary/10 hover:border-primary/20 transition-all duration-300"
                  >
                    <div className="flex justify-center mb-2">
                      <div className="p-2 sm:p-2.5 rounded-full bg-primary/10">
                        <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                      </div>
                    </div>
                    <div className="text-2xl sm:text-3xl font-bold text-foreground mb-1">
                      {stat.value}
                    </div>
                    <div className="text-xs text-muted-foreground font-medium">
                      {stat.label}
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default LandingHero;