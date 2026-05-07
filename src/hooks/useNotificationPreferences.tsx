import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { NOTIFICATION_CATEGORIES, NotificationCategory, categoryForType } from "@/lib/notificationPreferences";

export interface NotificationPreference {
  category: NotificationCategory;
  in_app: boolean;
  email: boolean;
}

const DEFAULTS: Record<NotificationCategory, { in_app: boolean; email: boolean }> = Object.fromEntries(
  NOTIFICATION_CATEGORIES.map((c) => [c.key, { in_app: true, email: false }])
) as any;

export function useNotificationPreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["notification-prefs", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<Record<NotificationCategory, { in_app: boolean; email: boolean }>> => {
      const { data, error } = await supabase
        .from("notification_preferences")
        .select("category, in_app, email")
        .eq("user_id", user!.id);
      if (error) throw error;
      const result = { ...DEFAULTS };
      for (const row of data ?? []) {
        result[row.category as NotificationCategory] = { in_app: row.in_app, email: row.email };
      }
      return result;
    },
    staleTime: 30_000,
  });

  const mutation = useMutation({
    mutationFn: async (updates: { category: NotificationCategory; in_app: boolean; email: boolean }) => {
      if (!user?.id) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("notification_preferences")
        .upsert(
          { user_id: user.id, ...updates, updated_at: new Date().toISOString() },
          { onConflict: "user_id,category" }
        );
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notification-prefs", user?.id] }),
  });

  return {
    prefs: query.data ?? DEFAULTS,
    isLoading: query.isLoading,
    update: mutation.mutate,
    isUpdating: mutation.isPending,
  };
}

/** Lightweight helper used by realtime hook to suppress in-app popups when disabled. */
export async function shouldShowInApp(userId: string, type: string): Promise<boolean> {
  const category = categoryForType(type);
  const { data } = await supabase
    .from("notification_preferences")
    .select("in_app")
    .eq("user_id", userId)
    .eq("category", category)
    .maybeSingle();
  return data ? data.in_app : true; // default on
}
