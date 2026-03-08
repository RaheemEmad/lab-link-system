import { WifiOff, Wifi } from "lucide-react";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export const OfflineBanner = () => {
  const { isOnline, wasOffline } = useNetworkStatus();

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed top-0 left-0 right-0 z-[100] bg-destructive text-destructive-foreground"
        >
          <div className="flex items-center justify-center gap-2 py-2 px-4 text-sm font-medium">
            <WifiOff className="h-4 w-4" />
            <span>You're offline. Changes will sync when reconnected.</span>
          </div>
        </motion.div>
      )}
      {isOnline && wasOffline && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed top-0 left-0 right-0 z-[100] bg-success text-success-foreground"
        >
          <div className="flex items-center justify-center gap-2 py-2 px-4 text-sm font-medium">
            <Wifi className="h-4 w-4" />
            <span>Back online!</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
