import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import confetti from "canvas-confetti";
import { Sparkles } from "lucide-react";

interface WelcomeModalProps {
  isOpen: boolean;
  userName: string;
  onClose: () => void;
}

export const WelcomeModal = ({ isOpen, userName, onClose }: WelcomeModalProps) => {
  const navigate = useNavigate();
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Trigger confetti animation
      const duration = 3000;
      const animationEnd = Date.now() + duration;

      const randomInRange = (min: number, max: number) => {
        return Math.random() * (max - min) + min;
      };

      const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          clearInterval(interval);
          return;
        }

        const particleCount = 50 * (timeLeft / duration);

        confetti({
          particleCount,
          startVelocity: 30,
          spread: 360,
          ticks: 60,
          origin: {
            x: randomInRange(0.1, 0.9),
            y: Math.random() - 0.2
          },
          colors: ['#2D6CDF', '#0FB8B1', '#0B1E39'],
          zIndex: 9999,
        });
      }, 250);

      // Show content after a brief delay
      setTimeout(() => setShowContent(true), 100);

      return () => clearInterval(interval);
    } else {
      setShowContent(false);
    }
  }, [isOpen]);

  const handleGoToDashboard = () => {
    onClose();
    navigate("/dashboard");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-[hsl(var(--stability-navy))] border-[hsl(var(--medical-teal))] text-foreground overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: showContent ? 1 : 0, scale: showContent ? 1 : 0.9 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="text-center py-8 px-4"
        >
          {/* Sparkle Icon */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.2, duration: 0.5, type: "spring" }}
            className="flex justify-center mb-6"
          >
            <div className="p-4 rounded-full bg-[hsl(var(--medical-teal))]/20">
              <Sparkles className="h-12 w-12 text-[hsl(var(--medical-teal))]" />
            </div>
          </motion.div>

          {/* Welcome Message */}
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="text-3xl font-bold mb-4 bg-gradient-to-r from-[hsl(var(--trust-blue))] via-[hsl(var(--medical-teal))] to-[hsl(var(--trust-blue))] bg-clip-text text-transparent"
          >
            Hi {userName}, you're logged in!
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
            className="text-muted-foreground mb-8"
          >
            Welcome to LabLink. Let's get started!
          </motion.p>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.4 }}
          >
            <Button
              onClick={handleGoToDashboard}
              className="w-full bg-[hsl(var(--trust-blue))] hover:bg-[hsl(var(--trust-blue))]/90 text-white shadow-lg shadow-[hsl(var(--trust-blue))]/20"
              size="lg"
            >
              Go to Dashboard
            </Button>
          </motion.div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};
