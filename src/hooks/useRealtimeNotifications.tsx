import { useEffect, useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// Notification types that trigger real-time popups
const POPUP_NOTIFICATION_TYPES = [
  'order_accepted',
  'delivery_confirmed',
  'feedback_received',
  'invoice_generated',
  'sla_warning',
  'new_lab_request',
  'status_update',
  'delivery_issue',
];

interface Notification {
  id: string;
  user_id: string;
  order_id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

export const useRealtimeNotifications = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [permission, setPermission] = useState<NotificationPermission>("default");

  // Check and request notification permission on mount
  useEffect(() => {
    if ("Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  // Request permission for native notifications
  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) {
      console.warn("Browser notifications not supported");
      return false;
    }

    if (Notification.permission === "granted") {
      return true;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === "granted";
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      return false;
    }
  }, []);

  // Show native browser notification (works on lock screen for mobile/tablets)
  const showNativeNotification = useCallback((notification: Notification) => {
    if (!("Notification" in window) || Notification.permission !== "granted") {
      return;
    }

    const isUrgent = notification.type.includes('warning') || notification.type.includes('issue') || notification.type === 'sla_warning';
    
    try {
      // Use Service Worker for better lock screen support
      if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.showNotification(notification.title, {
            body: notification.message,
            icon: "/lablink-icon.png",
            badge: "/favicon-48x48.png",
            tag: `lablink-${notification.id}`,
            requireInteraction: isUrgent, // Keep urgent notifications until dismissed
            vibrate: isUrgent ? [200, 100, 200, 100, 200] : [200, 100, 200],
            data: {
              url: `/order-tracking/${notification.order_id}`,
              orderId: notification.order_id,
              notificationId: notification.id,
            },
            // Actions for quick response (Android/Chrome)
            actions: [
              { action: 'view', title: 'View Order' },
              { action: 'dismiss', title: 'Dismiss' }
            ],
          } as NotificationOptions);
        });
      } else {
        // Fallback to basic Notification API
        const nativeNotif = new Notification(notification.title, {
          body: notification.message,
          icon: "/lablink-icon.png",
          badge: "/favicon-48x48.png",
          tag: `lablink-${notification.id}`,
          requireInteraction: isUrgent,
        });

        nativeNotif.onclick = () => {
          window.focus();
          window.location.href = `/order-tracking/${notification.order_id}`;
          nativeNotif.close();
        };
      }
    } catch (error) {
      console.error("Error showing native notification:", error);
    }
  }, []);

  const showNotificationPopup = useCallback((notification: Notification) => {
    // Show in-app toast
    const isWarning = notification.type.includes('warning') || notification.type.includes('issue');
    const isSuccess = notification.type.includes('confirmed') || notification.type.includes('accepted');

    if (isSuccess) {
      toast.success(notification.title, {
        description: notification.message,
        duration: 5000,
        action: {
          label: "View",
          onClick: () => {
            window.location.href = `/order-tracking/${notification.order_id}`;
          },
        },
      });
    } else if (isWarning) {
      toast.warning(notification.title, {
        description: notification.message,
        duration: 7000,
        action: {
          label: "View",
          onClick: () => {
            window.location.href = `/order-tracking/${notification.order_id}`;
          },
        },
      });
    } else {
      toast.info(notification.title, {
        description: notification.message,
        duration: 5000,
        action: {
          label: "View",
          onClick: () => {
            window.location.href = `/order-tracking/${notification.order_id}`;
          },
        },
      });
    }

    // Also show native notification for lock screen support
    showNativeNotification(notification);
  }, [showNativeNotification]);

  useEffect(() => {
    if (!user?.id) return;

    // Auto-request permission on first load if not set
    if (permission === "default") {
      // Delay permission request to avoid blocking UI
      const timer = setTimeout(() => {
        requestPermission();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [user?.id, permission, requestPermission]);

  useEffect(() => {
    if (!user?.id) return;

    // Subscribe to notifications for this user
    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const notification = payload.new as Notification;
          
          // Show popup for important notification types
          if (POPUP_NOTIFICATION_TYPES.includes(notification.type)) {
            showNotificationPopup(notification);
          }

          // Invalidate notifications query to update badge count
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
          queryClient.invalidateQueries({ queryKey: ['unread-notifications'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient, showNotificationPopup]);

  return {
    permission,
    requestPermission,
    isSupported: "Notification" in window,
    isGranted: permission === "granted",
  };
};
