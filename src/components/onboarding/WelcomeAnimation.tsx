import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Stethoscope, Building2, ArrowRight, Sparkles, CheckCircle } from "lucide-react";
import confetti from "canvas-confetti";

interface WelcomeAnimationProps {
  role: "doctor" | "lab_staff";
  userName?: string;
}

const WelcomeAnimation = ({ role, userName }: WelcomeAnimationProps) => {
  const [open, setOpen] = useState(true);
  const [step, setStep] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    // Trigger confetti on mount
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 2,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.6 },
        colors: ['#2D6CDF', '#0FB8B1', '#3CCB7F'],
      });
      confetti({
        particleCount: 2,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.6 },
        colors: ['#2D6CDF', '#0FB8B1', '#3CCB7F'],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();

    // Progress through steps
    const timer1 = setTimeout(() => setStep(1), 800);
    const timer2 = setTimeout(() => setStep(2), 1600);
    const timer3 = setTimeout(() => setStep(3), 2400);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  const handleGetStarted = () => {
    setOpen(false);
    navigate('/dashboard');
  };

  const roleContent = role === "doctor" ? {
    icon: Stethoscope,
    title: "Welcome to LabLink, Doctor!",
    subtitle: "Your dental lab workflow just got smarter",
    features: [
      "Track all your lab orders in real-time",
      "Communicate directly with labs",
      "Never lose track of a case again"
    ],
    cta: "Start Your First Order"
  } : {
    icon: Building2,
    title: "Welcome to LabLink!",
    subtitle: "Streamline your lab operations",
    features: [
      "Manage incoming orders efficiently",
      "Track production workflow",
      "Deliver excellence to your dentists"
    ],
    cta: "View Your Dashboard"
  };

  const Icon = roleContent.icon;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md bg-gradient-to-br from-background via-background to-primary/5 border-primary/20">
        <div className="flex flex-col items-center text-center space-y-6 py-6">
          {/* Animated Icon */}
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
            <div className="relative bg-primary/10 p-6 rounded-full animate-scale-in">
              <Icon className="w-16 h-16 text-primary animate-fade-in" />
            </div>
            <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-accent animate-pulse" />
          </div>

          {/* Welcome Message */}
          <div className="space-y-2 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              {roleContent.title}
            </h2>
            {userName && (
              <p className="text-lg text-muted-foreground">
                Hi {userName}! 👋
              </p>
            )}
            <p className="text-muted-foreground">
              {roleContent.subtitle}
            </p>
          </div>

          {/* Features List */}
          <div className="w-full space-y-3">
            {roleContent.features.map((feature, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 rounded-lg bg-background/50 border border-primary/10 animate-fade-in"
                style={{ 
                  animationDelay: `${0.4 + (index * 0.2)}s`,
                  opacity: step >= index + 1 ? 1 : 0
                }}
              >
                <CheckCircle className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                <p className="text-sm text-left">{feature}</p>
              </div>
            ))}
          </div>

          {/* CTA Button */}
          <Button
            onClick={handleGetStarted}
            size="lg"
            className="w-full group animate-fade-in"
            style={{ animationDelay: '1.2s' }}
          >
            {roleContent.cta}
            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Button>

          <p className="text-xs text-muted-foreground animate-fade-in" style={{ animationDelay: '1.4s' }}>
            ✨ Your journey to seamless dental workflow starts now
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WelcomeAnimation;
