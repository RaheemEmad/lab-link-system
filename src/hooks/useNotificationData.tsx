import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useMemo } from "react";

/**
 * Single source of truth for notification data.
 * Replaces duplicate queries in useUnreadCount + useLogisticsTabBadges.
 * All consumers share the same React Query cache key.
 */

type TabKey = "shipments" | "tracking" | "calendar" | "analytics" | "scheduling" | "billing";

const NOTIFICATION_TYPE_TO_TAB: Record<string, TabKey> = {
  shipment_update: "shipments",
  order_cancelled: "shipments",
  delivery_confirmed: "tracking",
  appointment_scheduled: "scheduling",
  payment_recorded: "billing",
  invoice_generated: "billing",
  invoice_request: "billing",
  invoice_disputed: "billing",
  credit_note_issued: "billing",
  dispute_resolved: "billing",
};

interface NotificationRow {
  type: string;
}

export function useNotificationData() {
  const { user } = useAuth();

  const { data: unreadNotifications, isLoading } = useQuery({
    queryKey: ["unread-notifications", user?.id],
    queryFn: async (): Promise<NotificationRow[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("notifications")
        .select("type")
        .eq("user_id", user.id)
        .eq("read", false);

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user?.id,
    staleTime: 30_000,
    retry: 1,
  });

  const unreadCount = unreadNotifications?.length ?? 0;

  const hasUrgent = useMemo(
    () =>
      unreadNotifications?.some(
        (n) =>
          n.type === "status_change" ||
          n.type === "urgent" ||
          n.type === "sla_warning"
      ) ?? false,
    [unreadNotifications]
  );

  const tabBadgeCounts = useMemo(() => {
    const counts: Record<TabKey, number> = {
      shipments: 0,
      tracking: 0,
      calendar: 0,
      analytics: 0,
      scheduling: 0,
      billing: 0,
    };

    for (const n of unreadNotifications ?? []) {
      const tab = NOTIFICATION_TYPE_TO_TAB[n.type];
      if (tab) counts[tab]++;
    }

    return counts;
  }, [unreadNotifications]);

  return {
    unreadCount,
    hasUrgent,
    tabBadgeCounts,
    isLoading,
  };
}
