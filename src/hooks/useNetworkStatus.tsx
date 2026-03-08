import { useState, useEffect, useCallback } from "react";

interface NetworkStatus {
  isOnline: boolean;
  wasOffline: boolean;
  lastOnlineAt: Date | null;
}

/**
 * Hook to track network connectivity status.
 * Exposes isOnline, wasOffline (for showing "back online" toast), and lastOnlineAt.
 */
export const useNetworkStatus = () => {
  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
    wasOffline: false,
    lastOnlineAt: null,
  });

  const handleOnline = useCallback(() => {
    setStatus((prev) => ({
      isOnline: true,
      wasOffline: true,
      lastOnlineAt: new Date(),
    }));
    // Auto-clear wasOffline after 5s
    setTimeout(() => {
      setStatus((prev) => ({ ...prev, wasOffline: false }));
    }, 5000);
  }, []);

  const handleOffline = useCallback(() => {
    setStatus((prev) => ({
      ...prev,
      isOnline: false,
      wasOffline: false,
    }));
  }, []);

  useEffect(() => {
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [handleOnline, handleOffline]);

  return status;
};
