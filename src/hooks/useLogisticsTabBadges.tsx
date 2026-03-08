import { useMemo } from "react";
import { useNotificationData } from "./useNotificationData";

type TabKey = "shipments" | "tracking" | "calendar" | "analytics" | "scheduling" | "billing";
type TabBadges = Record<TabKey, number>;

interface OrderShipmentMinimal {
  status: string;
  urgency: string;
  actual_delivery_date: string | null;
  expected_delivery_date: string | null;
}

/**
 * Derives logistics tab badges from the shared notification cache
 * plus shipment-specific overdue/urgent counts.
 * No longer makes its own DB query.
 */
export function useLogisticsTabBadges(
  _userId: string | undefined,
  shipments: OrderShipmentMinimal[]
): TabBadges {
  const { tabBadgeCounts } = useNotificationData();

  const shipmentBadgeCount = useMemo(() => {
    const now = new Date();
    const overdueCount = shipments.filter((s) => {
      if (s.status === "Delivered" || s.actual_delivery_date) return false;
      if (!s.expected_delivery_date) return false;
      return new Date(s.expected_delivery_date) < now;
    }).length;
    const urgentUndelivered = shipments.filter(
      (s) => s.urgency === "Urgent" && s.status !== "Delivered" && !s.actual_delivery_date
    ).length;
    return overdueCount + urgentUndelivered;
  }, [shipments]);

  return useMemo(
    () => ({
      ...tabBadgeCounts,
      shipments: tabBadgeCounts.shipments + shipmentBadgeCount,
    }),
    [tabBadgeCounts, shipmentBadgeCount]
  );
}
