import { useNotificationData } from "./useNotificationData";

/**
 * Thin wrapper over useNotificationData for backward compatibility.
 * No longer makes its own DB query — shares the single cache entry.
 */
export function useUnreadCount() {
  const { unreadCount, hasUrgent } = useNotificationData();
  return { unreadCount, hasUrgent };
}
