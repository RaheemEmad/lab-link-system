import { useEffect, useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const POPUP_NOTIFICATION_TYPES = [
  'order_accepted',
  'delivery_confirmed',
  'feedback_received',
  'invoice_generated',
  'sla_warning',
  'new_lab_request',
  'status_update',
  'delivery_issue',
  'new_order',
  'bid_submitted',
  'bid_accepted',
  'bid_declined',
  'order_assigned',
  'invoice_disputed',
  'dispute_resolved',
  'invoice_request',
  'order_cancelled',
  'payment_recorded',
  'credit_note_issued',
  'review_submitted',
  'new_message',
  'new_marketplace_application',
  'admin_order_override',
  'appointment_scheduled',
  'appointment_confirmed',
  'appointment_cancelled',
  'design_approved',
  'design_revision_requested',
  'feedback_attachment',
  'checklist_updated',
  'order_edited',
  'ticket_status_update',
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

  useEffect(() => {
    if ("Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) return false;
    if (Notification.permission === "granted") return true;
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === "granted";
    } catch {
      return false;
    }
  }, []);

  const showNativeNotification = useCallback((notification: Notification) => {
    if (!("Notification" in window) || Notification.permission !== "granted") return;

    const isUrgent = notification.type.includes('warning') || notification.type.includes('issue') || notification.type === 'sla_warning';

    try {
      if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.showNotification(notification.title, {
            body: notification.message,
            icon: "/lablink-icon.png",
            badge: "/favicon-48x48.png",
            tag: `lablink-${notification.id}`,
            requireInteraction: isUrgent,
            vibrate: isUrgent ? [200, 100, 200, 100, 200] : [200, 100, 200],
            data: {
              url: `/order-tracking/${notification.order_id}`,
              orderId: notification.order_id,
              notificationId: notification.id,
            },
            actions: [
              { action: 'view', title: 'View Order' },
              { action: 'dismiss', title: 'Dismiss' }
            ],
          } as NotificationOptions);
        });
      } else {
        const nativeNotif = new window.Notification(notification.title, {
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
    const isWarning = notification.type.includes('warning') || notification.type.includes('issue');
    const isSuccess = notification.type.includes('confirmed') || notification.type.includes('accepted');
    const action = {
      label: "View",
      onClick: () => { window.location.href = `/order-tracking/${notification.order_id}`; },
    };

    if (isSuccess) {
      toast.success(notification.title, { description: notification.message, duration: 5000, action });
    } else if (isWarning) {
      toast.warning(notification.title, { description: notification.message, duration: 7000, action });
    } else {
      toast.info(notification.title, { description: notification.message, duration: 5000, action });
    }

    showNativeNotification(notification);
  }, [showNativeNotification]);

  // Auto-request permission
  useEffect(() => {
    if (!user?.id || permission !== "default") return;
    const timer = setTimeout(() => requestPermission(), 3000);
    return () => clearTimeout(timer);
  }, [user?.id, permission, requestPermission]);

  // Realtime subscription
  useEffect(() => {
    if (!user?.id) return;

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

          if (POPUP_NOTIFICATION_TYPES.includes(notification.type)) {
            showNotificationPopup(notification);
          }

          // Batch invalidation — single predicate instead of 6 separate calls
          queryClient.invalidateQueries({
            predicate: (query) => {
              const key = query.queryKey[0] as string;
              return [
                'notifications',
                'unread-notifications',
                'mobile-nav-unread',
                'inbox-chats',
                'inbox-approvals',
                'inbox-deliveries',
                'inbox-invoices',
              ].includes(key);
            },
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id, queryClient, showNotificationPopup]);

  return {
    permission,
    requestPermission,
    isSupported: "Notification" in window,
    isGranted: permission === "granted",
  };
};
