import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useUnreadCount() {
  const { user } = useAuth();

  const { data } = useQuery({
    queryKey: ["unread-notifications", user?.id],
    queryFn: async () => {
      if (!user?.id) return { count: 0, hasUrgent: false };

      const { data, error } = await supabase
        .from("notifications")
        .select("type")
        .eq("user_id", user.id)
        .eq("read", false);

      if (error) throw error;

      const hasUrgent =
        data?.some(
          (n) => n.type === "status_change" || n.type === "urgent" || n.type === "sla_warning"
        ) || false;

      return { count: data?.length || 0, hasUrgent };
    },
    enabled: !!user?.id,
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: 1,
  });

  return {
    unreadCount: data?.count || 0,
    hasUrgent: data?.hasUrgent || false,
  };
}
