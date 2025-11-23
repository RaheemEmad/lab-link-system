import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface FormFeedbackProps {
  message?: string;
  type?: "error" | "success" | "info";
  className?: string;
}

export const FormFeedback = ({ message, type = "error", className }: FormFeedbackProps) => {
  if (!message) return null;

  const icons = {
    error: AlertCircle,
    success: CheckCircle2,
    info: Info,
  };

  const Icon = icons[type];

  const colorClasses = {
    error: "text-destructive",
    success: "text-success",
    info: "text-primary",
  };

  const bgClasses = {
    error: "bg-destructive/10 border-destructive/20",
    success: "bg-success/10 border-success/20",
    info: "bg-primary/10 border-primary/20",
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0, y: -10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        transition={{
          duration: 0.3,
          ease: [0.4, 0, 0.2, 1],
        }}
        className={cn(
          "flex items-start gap-2 rounded-lg border p-3 text-sm",
          bgClasses[type],
          className
        )}
      >
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{
            type: "spring",
            stiffness: 260,
            damping: 20,
            delay: 0.1,
          }}
        >
          <Icon className={cn("h-4 w-4 mt-0.5 flex-shrink-0", colorClasses[type])} />
        </motion.div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.2 }}
          className={cn("leading-relaxed", colorClasses[type])}
        >
          {message}
        </motion.p>
      </motion.div>
    </AnimatePresence>
  );
};

export default FormFeedback;
