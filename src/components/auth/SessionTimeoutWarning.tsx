import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Clock } from "lucide-react";
import { toast } from "sonner";

const SESSION_TIMEOUT_WARNING = 5 * 60 * 1000; // 5 minutes before expiry
const CHECK_INTERVAL = 60 * 1000; // Check every minute

export const SessionTimeoutWarning = () => {
  const { session, user } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  useEffect(() => {
    if (!session?.expires_at || !user) return;

    const checkSessionExpiry = () => {
      const expiresAt = new Date(session.expires_at! * 1000).getTime();
      const now = Date.now();
      const timeUntilExpiry = expiresAt - now;

      setTimeRemaining(Math.floor(timeUntilExpiry / 1000 / 60)); // minutes

      // Show warning 5 minutes before expiry
      if (timeUntilExpiry <= SESSION_TIMEOUT_WARNING && timeUntilExpiry > 0) {
        setShowWarning(true);
      } else {
        setShowWarning(false);
      }

      // Auto logout if session has expired
      if (timeUntilExpiry <= 0) {
        handleSessionExpired();
      }
    };

    // Initial check
    checkSessionExpiry();

    // Set up interval for continuous checking
    const interval = setInterval(checkSessionExpiry, CHECK_INTERVAL);

    return () => clearInterval(interval);
  }, [session, user]);

  const handleExtendSession = async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) throw error;

      if (data.session) {
        setShowWarning(false);
        toast.success("Session extended successfully");
      }
    } catch (error: any) {
      console.error("Failed to extend session:", error);
      toast.error("Failed to extend session", {
        description: "Please sign in again to continue.",
      });
    }
  };

  const handleSessionExpired = () => {
    setShowWarning(false);
    toast.error("Session expired", {
      description: "Please sign in again to continue.",
    });
    // The auth state change will automatically redirect to login
  };

  const handleLogout = async () => {
    setShowWarning(false);
    await supabase.auth.signOut();
    toast.info("Signed out successfully");
  };

  return (
    <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-warning" />
            <AlertDialogTitle>Session Expiring Soon</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="pt-2">
            Your session will expire in approximately <strong>{timeRemaining} minute{timeRemaining !== 1 ? 's' : ''}</strong>.
            <br />
            <br />
            Would you like to extend your session?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleLogout}>
            Sign Out Now
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleExtendSession}>
            Extend Session
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
