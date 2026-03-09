import { useState, useEffect } from "react";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

/**
 * Shows a sticky bottom banner on mobile after 30s if the app isn't installed.
 */
export const InstallBanner = () => {
  const { isInstallable, isInstalled, promptInstall } = usePWAInstall();
  const isMobile = useIsMobile();
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!isInstallable || isInstalled || dismissed || !isMobile) return;
    const timer = setTimeout(() => setVisible(true), 30000);
    return () => clearTimeout(timer);
  }, [isInstallable, isInstalled, dismissed, isMobile]);

  if (!visible || dismissed) return null;

  return (
    <div className="fixed bottom-16 left-0 right-0 z-50 px-3 pb-2 animate-in slide-in-from-bottom-4">
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-lg">
        <Download className="h-5 w-5 shrink-0 text-primary" />
        <p className="flex-1 text-sm text-foreground">
          Install LabLink for faster access &amp; offline support
        </p>
        <Button size="sm" onClick={promptInstall}>
          Install
        </Button>
        <button
          onClick={() => setDismissed(true)}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
