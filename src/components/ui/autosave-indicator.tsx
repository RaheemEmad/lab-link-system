import { motion, AnimatePresence } from "framer-motion";
import { Cloud, CloudOff, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AutosaveIndicatorProps {
  isSaving: boolean;
  lastSaved: Date | null;
  hasRecoveredData?: boolean;
  className?: string;
}

export function AutosaveIndicator({
  isSaving,
  lastSaved,
  hasRecoveredData = false,
  className,
}: AutosaveIndicatorProps) {
  const getTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={cn(
          "flex items-center gap-2 text-sm",
          className
        )}
      >
        {isSaving ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-ocean-blue" />
            <span className="text-muted-foreground">Saving draft...</span>
          </>
        ) : lastSaved ? (
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
            >
              <Check className="h-4 w-4 text-forest-green" />
            </motion.div>
            <span className="text-muted-foreground">
              Saved {getTimeAgo(lastSaved)}
              {hasRecoveredData && (
                <span className="ml-1 text-ocean-blue font-medium">(recovered)</span>
              )}
            </span>
          </>
        ) : (
          <>
            <CloudOff className="h-4 w-4 text-muted-foreground/50" />
            <span className="text-muted-foreground/70">Not saved</span>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
