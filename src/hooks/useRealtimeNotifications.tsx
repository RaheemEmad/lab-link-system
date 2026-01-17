import { useEffect, useCallback } from "react";
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

  const showNotificationPopup = useCallback((notification: Notification) => {
    // Determine toast variant based on notification type
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
  }, []);

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

  return null;
};
