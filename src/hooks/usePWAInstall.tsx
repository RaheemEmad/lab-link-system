import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferredPromptGlobal: BeforeInstallPromptEvent | null = null;

/**
 * Single source-of-truth hook for PWA install state.
 * Captures `beforeinstallprompt` globally and fires confetti + toast on `appinstalled`.
 */
export const usePWAInstall = () => {
  const [isInstallable, setIsInstallable] = useState(!!deferredPromptGlobal);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already running as PWA
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      deferredPromptGlobal = e as BeforeInstallPromptEvent;
      setIsInstallable(true);
    };

    const onAppInstalled = async () => {
      deferredPromptGlobal = null;
      setIsInstallable(false);
      setIsInstalled(true);

      toast.success("LabLink installed! 🎉", {
        description: "You can now launch LabLink from your home screen.",
        duration: 6000,
      });

      // Fire confetti
      try {
        const { fireConfetti } = await import("@/lib/confetti");
        fireConfetti({ particleCount: 120, spread: 80, origin: { y: 0.7 } });
      } catch {
        // confetti is optional
      }
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPromptGlobal) return false;
    deferredPromptGlobal.prompt();
    const { outcome } = await deferredPromptGlobal.userChoice;
    if (outcome === "accepted") {
      deferredPromptGlobal = null;
      setIsInstallable(false);
      return true;
    }
    return false;
  }, []);

  return { isInstallable, isInstalled, promptInstall };
};
