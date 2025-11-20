import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";

/**
 * Custom hook to manage browser notifications
 * Requests permissions and shows native desktop notifications for urgent alerts
 */
export const useBrowserNotifications = () => {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>("default");

  // Check initial permission state
  useEffect(() => {
    if ("Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  // Request notification permission
  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) {
      console.warn("Browser notifications are not supported");
      return false;
    }

    if (Notification.permission === "granted") {
      return true;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      console.log("Notification permission:", result);
      return result === "granted";
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      return false;
    }
  }, []);

  // Show a browser notification
  const showNotification = useCallback(
    (title: string, options?: NotificationOptions) => {
      if (!("Notification" in window)) {
        console.warn("Browser notifications are not supported");
        return;
      }

      if (Notification.permission !== "granted") {
        console.warn("Notification permission not granted");
        return;
      }

      if (!user) {
        console.warn("User not authenticated");
        return;
      }

      try {
        const notification = new Notification(title, {
          icon: "/favicon.ico",
          badge: "/favicon.ico",
          requireInteraction: true, // Keep notification until user interacts
          ...options,
        });

        notification.onclick = () => {
          window.focus();
          notification.close();
          
          // If there's a tag, use it to navigate
          if (options?.tag) {
            window.location.href = `/notifications`;
          }
        };

        console.log("Browser notification shown:", title);
      } catch (error) {
        console.error("Error showing notification:", error);
      }
    },
    [user]
  );

  // Show urgent notification with red styling
  const showUrgentNotification = useCallback(
    (count: number) => {
      showNotification("🔴 Urgent Lab Notification", {
        body: `You have ${count} urgent notification${count > 1 ? "s" : ""} requiring immediate attention`,
        tag: "urgent-notification",
        icon: "/favicon.ico",
        requireInteraction: true,
      });
    },
    [showNotification]
  );

  // Show normal notification
  const showNormalNotification = useCallback(
    (count: number) => {
      showNotification("📬 New Lab Notification", {
        body: `You have ${count} new notification${count > 1 ? "s" : ""}`,
        tag: "normal-notification",
        icon: "/favicon.ico",
      });
    },
    [showNotification]
  );

  return {
    permission,
    requestPermission,
    showNotification,
    showUrgentNotification,
    showNormalNotification,
    isSupported: "Notification" in window,
    isGranted: permission === "granted",
  };
};
