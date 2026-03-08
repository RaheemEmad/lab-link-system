import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

type TabKey = "shipments" | "tracking" | "calendar" | "analytics" | "scheduling" | "billing";

type TabBadges = Record<TabKey, number>;

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

const EMPTY_BADGES: TabBadges = {
  shipments: 0,
  tracking: 0,
  calendar: 0,
  analytics: 0,
  scheduling: 0,
  billing: 0,
};

interface OrderShipmentMinimal {
  status: string;
  urgency: string;
  actual_delivery_date: string | null;
  expected_delivery_date: string | null;
}

export function useLogisticsTabBadges(
  userId: string | undefined,
  shipments: OrderShipmentMinimal[]
): TabBadges {
  const [badges, setBadges] = useState<TabBadges>(EMPTY_BADGES);

  const computeBadges = useCallback(
    (notificationTypes: string[]) => {
      const counts = { ...EMPTY_BADGES };

      // Count from notification types
      for (const type of notificationTypes) {
        const tab = NOTIFICATION_TYPE_TO_TAB[type];
        if (tab) counts[tab]++;
      }

      // Data-derived: overdue deliveries for shipments tab
      const now = new Date();
      const overdueCount = shipments.filter((s) => {
        if (s.status === "Delivered" || s.actual_delivery_date) return false;
        if (!s.expected_delivery_date) return false;
        return new Date(s.expected_delivery_date) < now;
      }).length;
      counts.shipments += overdueCount;

      // Data-derived: urgent undelivered for shipments
      const urgentUndelivered = shipments.filter(
        (s) => s.urgency === "Urgent" && s.status !== "Delivered" && !s.actual_delivery_date
      ).length;
      counts.shipments += urgentUndelivered;

      setBadges(counts);
    },
    [shipments]
  );

  useEffect(() => {
    if (!userId) {
      setBadges(EMPTY_BADGES);
      return;
    }

    const fetchUnread = async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("type")
        .eq("user_id", userId)
        .eq("read", false);

      if (error) {
        console.error("[useLogisticsTabBadges] fetch error:", error);
        return;
      }
      computeBadges((data ?? []).map((n) => n.type));
    };

    fetchUnread();

    const channel = supabase
      .channel("logistics-tab-badges")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        () => fetchUnread()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, computeBadges]);

  return badges;
}
