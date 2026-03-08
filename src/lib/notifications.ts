import { supabase } from "@/integrations/supabase/client";

interface CreateNotificationParams {
  user_id: string;
  order_id: string;
  type: string;
  title: string;
  message: string;
}

/**
 * Creates a notification record in the database.
 * Single source of truth for all notification inserts.
 */
export async function createNotification(params: CreateNotificationParams) {
  const { error } = await supabase.from("notifications").insert(params);
  if (error) {
    console.error("[createNotification] Failed:", error);
  }
  return { error };
}

/**
 * Creates multiple notifications in a single batch insert.
 */
export async function createNotifications(params: CreateNotificationParams[]) {
  if (params.length === 0) return { error: null };
  const { error } = await supabase.from("notifications").insert(params);
  if (error) {
    console.error("[createNotifications] Failed:", error);
  }
  return { error };
}
