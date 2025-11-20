import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export const useServiceWorkerUpdate = () => {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [showReload, setShowReload] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // Check for updates every 60 seconds
      const interval = setInterval(() => {
        navigator.serviceWorker.getRegistration().then((registration) => {
          registration?.update();
        });
      }, 60000);

      const onControllerChange = () => {
        window.location.reload();
      };

      navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

      navigator.serviceWorker.getRegistration().then((registration) => {
        if (!registration) return;

        // Check if there's a waiting service worker
        if (registration.waiting) {
          setWaitingWorker(registration.waiting);
          setShowReload(true);
        }

        // Listen for new service worker
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New service worker is installed and ready
              setWaitingWorker(newWorker);
              setShowReload(true);
            }
          });
        });
      });

      return () => {
        clearInterval(interval);
        navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
      };
    }
  }, []);

  useEffect(() => {
    if (showReload && waitingWorker) {
      toast("Update Available", {
        description: "A new version of LabLink is available",
        duration: Infinity,
        action: (
          <Button
            size="sm"
            onClick={() => {
              waitingWorker.postMessage({ type: 'SKIP_WAITING' });
              setShowReload(false);
            }}
          >
            Reload to Update
          </Button>
        ),
      });
    }
  }, [showReload, waitingWorker]);

  return { showReload, reloadPage: () => window.location.reload() };
};
