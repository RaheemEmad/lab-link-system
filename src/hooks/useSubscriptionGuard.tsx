import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useUserRole } from "./useUserRole";
import { useMemo } from "react";

export interface SubscriptionInfo {
  isActive: boolean;
  isExpired: boolean;
  isExpiringSoon: boolean;
  daysUntilExpiry: number;
  planName: string | null;
  monthlyFee: number;
  perOrderFee: number;
  planId: string | null;
  subscriptionId: string | null;
}

export const useSubscriptionGuard = () => {
  const { user } = useAuth();
  const { isDoctor, roleConfirmed } = useUserRole();

  const { data: subscription, isLoading } = useQuery({
    queryKey: ["subscription-guard", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("doctor_subscriptions")
        .select("*, plan:subscription_plans(*)")
        .eq("doctor_id", user.id)
        .eq("status", "active")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && roleConfirmed && isDoctor,
    staleTime: 60_000,
    retry: 1,
  });

  const info: SubscriptionInfo = useMemo(() => {
    if (!subscription) {
      return {
        isActive: false,
        isExpired: false,
        isExpiringSoon: false,
        daysUntilExpiry: 0,
        planName: null,
        monthlyFee: 0,
        perOrderFee: 0,
        planId: null,
        subscriptionId: null,
      };
    }

    const now = new Date();
    const periodEnd = new Date(subscription.current_period_end);
    const daysUntilExpiry = Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const isExpired = daysUntilExpiry <= 0;
    const isExpiringSoon = daysUntilExpiry > 0 && daysUntilExpiry <= 5;
    const plan = subscription.plan as any;

    return {
      isActive: !isExpired,
      isExpired,
      isExpiringSoon,
      daysUntilExpiry,
      planName: plan?.name || null,
      monthlyFee: plan?.monthly_fee || 0,
      perOrderFee: plan?.per_order_fee || 0,
      planId: subscription.plan_id,
      subscriptionId: subscription.id,
    };
  }, [subscription]);

  return { ...info, isLoading, hasSubscription: !!subscription };
};
