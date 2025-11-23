import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { TestTube, Loader2 } from "lucide-react";

interface DashboardReceiveAnimationProps {
  orderNumber: string;
  onComplete: () => void;
}

export const DashboardReceiveAnimation = ({ orderNumber, onComplete }: DashboardReceiveAnimationProps) => {
  const [stage, setStage] = useState<"arriving" | "scanning" | "activating" | "complete">("arriving");

  useEffect(() => {
    const timer1 = setTimeout(() => setStage("scanning"), 500);
    const timer2 = setTimeout(() => setStage("activating"), 1200);
    const timer3 = setTimeout(() => {
      setStage("complete");
      onComplete();
    }, 2500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [onComplete]);

  if (stage === "complete") return null;

  return (
    <motion.div
      className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {stage === "arriving" && (
        <>
          {/* Incoming packet */}
          <motion.div
            className="absolute"
            initial={{ x: 400, y: -200, scale: 0.2, rotate: 360 }}
            animate={{ x: 0, y: 0, scale: 1, rotate: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <motion.div
              className="bg-gradient-to-br from-primary to-accent p-8 rounded-2xl shadow-2xl"
              animate={{
                boxShadow: [
                  "0 0 40px hsl(var(--primary) / 0.8)",
                  "0 0 80px hsl(var(--accent) / 0.8)"
                ]
              }}
              transition={{ duration: 0.3, repeat: Infinity, repeatType: "reverse" }}
            >
              <TestTube className="w-16 h-16 text-white" />
            </motion.div>
          </motion.div>

          {/* Particle burst */}
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-primary rounded-full"
              initial={{ x: 0, y: 0, opacity: 1 }}
              animate={{
                x: Math.cos((i * Math.PI * 2) / 12) * 100,
                y: Math.sin((i * Math.PI * 2) / 12) * 100,
                opacity: 0,
                scale: [1, 2, 0]
              }}
              transition={{ duration: 0.6, delay: 0.3 }}
            />
          ))}
        </>
      )}

      {stage === "scanning" && (
        <motion.div
          className="absolute w-full max-w-4xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {/* Scanning beam */}
          <motion.div
            className="h-1 bg-gradient-to-r from-transparent via-accent to-transparent"
            initial={{ scaleX: 0, x: "-100%" }}
            animate={{ scaleX: 1, x: "100%" }}
            transition={{ duration: 0.7, ease: "linear" }}
          />
          
          {/* Scanning grid */}
          <motion.div
            className="absolute inset-0 border-2 border-accent/30 rounded-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 0.7 }}
          />
        </motion.div>
      )}

      {stage === "activating" && (
        <motion.div
          className="absolute"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Activation glow */}
          <motion.div
            className="absolute inset-0 bg-success/30 rounded-2xl blur-3xl"
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.3, 0.6, 0]
            }}
            transition={{ duration: 1.3 }}
          />
          
          {/* Processing indicator */}
          <motion.div
            className="bg-card border-2 border-success rounded-2xl p-8 shadow-2xl"
            animate={{
              borderColor: ["hsl(var(--success))", "hsl(var(--primary))", "hsl(var(--success))"]
            }}
            transition={{ duration: 1, repeat: 2 }}
          >
            <div className="flex items-center gap-4">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <Loader2 className="w-12 h-12 text-primary" />
              </motion.div>
              <div>
                <h4 className="text-lg font-bold">Order Activated</h4>
                <p className="text-sm text-muted-foreground">#{orderNumber}</p>
              </div>
            </div>
          </motion.div>

          {/* Success particles */}
          {[...Array(16)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1.5 h-1.5 bg-success rounded-full"
              style={{
                left: "50%",
                top: "50%"
              }}
              initial={{ x: 0, y: 0, opacity: 1 }}
              animate={{
                x: Math.cos((i * Math.PI * 2) / 16) * 150,
                y: Math.sin((i * Math.PI * 2) / 16) * 150,
                opacity: 0,
                scale: [0, 1, 0]
              }}
              transition={{ duration: 1.3, delay: 0.2 }}
            />
          ))}
        </motion.div>
      )}
    </motion.div>
  );
};
