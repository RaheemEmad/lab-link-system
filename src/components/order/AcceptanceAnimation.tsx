import { motion } from "framer-motion";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { TestTube, Zap } from "lucide-react";

interface AcceptanceAnimationProps {
  onComplete: () => void;
  orderNumber: string;
  orderId: string;
  onChatOpen: () => void;
  hasMoreApplications?: boolean;
  onStayOnPage?: () => void;
}

export const AcceptanceAnimation = ({ 
  onComplete, 
  orderNumber, 
  orderId, 
  onChatOpen,
  hasMoreApplications = false,
  onStayOnPage
}: AcceptanceAnimationProps) => {
  const [stage, setStage] = useState<"initial" | "button" | "launching" | "complete">("initial");
  const navigate = useNavigate();

  const handleInitiate = () => {
    setStage("launching");
    
    // After animation completes, open chat and conditionally navigate
    setTimeout(() => {
      onChatOpen();
      
      // If there are more applications to review, stay on page
      if (hasMoreApplications && onStayOnPage) {
        onStayOnPage();
      } else {
        // Navigate to dashboard when no more applications
        navigate("/dashboard", { 
          state: { 
            newOrderAccepted: true,
            orderNumber 
          } 
        });
      }
      onComplete();
    }, 1500);
  };

  if (stage === "initial") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
      >
        <motion.div
          className="relative"
          initial={{ y: 20 }}
          animate={{ y: 0 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
        >
          {/* Success highlight pulse */}
          <motion.div
            className="absolute inset-0 bg-success/20 rounded-2xl blur-xl"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 0.8, 0.5]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          
          {/* Data packet icon */}
          <motion.div
            className="relative bg-card border-2 border-success rounded-2xl p-12 shadow-2xl"
            animate={{
              boxShadow: [
                "0 0 20px hsl(var(--success) / 0.3)",
                "0 0 40px hsl(var(--success) / 0.5)",
                "0 0 20px hsl(var(--success) / 0.3)"
              ]
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <motion.div
              initial={{ rotate: 0 }}
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <Zap className="w-16 h-16 text-success" />
            </motion.div>
            
            <motion.div
              className="mt-6 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <h3 className="text-2xl font-bold text-success mb-2">Request Accepted!</h3>
              <p className="text-muted-foreground">Order {orderNumber}</p>
            </motion.div>

            {/* Transform to button */}
            <motion.div
              className="mt-8"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Button
                size="lg"
                onClick={() => setStage("button")}
                className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white font-semibold shadow-lg"
              >
                <TestTube className="mr-2 h-5 w-5" />
                Transform to Processing
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>
      </motion.div>
    );
  }

  if (stage === "button") {
    return (
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
        initial={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="relative"
          animate={{
            scale: [1, 1.05, 1],
          }}
          transition={{ duration: 1, repeat: Infinity }}
        >
          {/* Large pulsing button */}
          <motion.div
            className="absolute inset-0 bg-primary/30 rounded-full blur-2xl"
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.3, 0.6, 0.3]
            }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          
          <Button
            size="lg"
            onClick={handleInitiate}
            className="relative px-12 py-8 text-xl font-bold bg-gradient-to-br from-primary via-accent to-primary bg-size-200 animate-gradient hover:scale-105 transition-transform shadow-2xl"
          >
            <motion.div
              className="flex items-center gap-3"
              animate={{ x: [0, 5, 0] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <TestTube className="h-8 w-8" />
              <span>Initiate Lab Processing</span>
              <Zap className="h-8 w-8" />
            </motion.div>
          </Button>
        </motion.div>
      </motion.div>
    );
  }

  if (stage === "launching") {
    return (
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm"
        initial={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Tunnel/tracer effect */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute left-1/2 top-1/2 border-2 border-primary/30 rounded-full"
              initial={{
                width: 0,
                height: 0,
                x: "-50%",
                y: "-50%",
                opacity: 0
              }}
              animate={{
                width: 1000,
                height: 1000,
                opacity: [0, 0.5, 0],
              }}
              transition={{
                duration: 1.5,
                delay: i * 0.05,
                ease: "easeOut"
              }}
            />
          ))}
        </div>

        {/* Racing packet */}
        <motion.div
          className="relative z-10"
          initial={{ scale: 1, x: 0, y: 0 }}
          animate={{
            scale: [1, 0.3, 0.2],
            x: [0, 200, 400],
            y: [0, -100, -200],
            rotate: [0, 180, 360]
          }}
          transition={{
            duration: 1.2,
            times: [0, 0.5, 1],
            ease: "easeInOut"
          }}
        >
          <motion.div
            className="bg-gradient-to-br from-primary to-accent p-8 rounded-2xl shadow-2xl"
            animate={{
              boxShadow: [
                "0 0 40px hsl(var(--primary) / 0.8)",
                "0 0 80px hsl(var(--accent) / 0.8)"
              ]
            }}
            transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
          >
            <Zap className="w-12 h-12 text-white" />
          </motion.div>
          
          {/* Trail effect */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-primary/50 to-transparent rounded-2xl blur-xl"
            initial={{ scaleX: 0, originX: 0 }}
            animate={{ scaleX: 2 }}
            transition={{ duration: 1 }}
          />
        </motion.div>

        {/* Test tube transformation */}
        <motion.div
          className="absolute z-20"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1, duration: 0.2 }}
        >
          <TestTube className="w-24 h-24 text-primary stroke-2" />
        </motion.div>
      </motion.div>
    );
  }

  return null;
};
