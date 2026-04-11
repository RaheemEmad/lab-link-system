import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import ProtectedRoute from "@/components/ProtectedRoute";
import LandingNav from "@/components/landing/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";
import { ScrollToTop } from "@/components/ui/scroll-to-top";
import { PlanCard } from "@/components/subscription/PlanCard";
import { toast } from "@/components/ui/sonner";
import { Crown } from "lucide-react";

const SubscriptionPlans = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: plans, isLoading } = useQuery({
    queryKey: ["subscription-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("is_active", true)
        .order("monthly_fee", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: currentSub } = useQuery({
    queryKey: ["doctor-subscription", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("doctor_subscriptions")
        .select("*, plan:subscription_plans(*)")
        .eq("doctor_id", user!.id)
        .eq("status", "active")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const subscribeMutation = useMutation({
    mutationFn: async (planId: string) => {
      // If existing subscription, update it
      if (currentSub) {
        const { error } = await supabase
          .from("doctor_subscriptions")
          .update({
            plan_id: planId,
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          })
          .eq("id", currentSub.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("doctor_subscriptions")
          .insert({
            doctor_id: user!.id,
            plan_id: planId,
            status: "active",
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctor-subscription"] });
      toast.success("Subscription updated successfully!");
    },
    onError: () => {
      toast.error("Failed to update subscription. Please try again.");
    },
  });

  const tierColors: Record<string, string> = {
    Basic: "border-border",
    Silver: "border-slate-400",
    Gold: "border-amber-400 ring-1 ring-amber-200",
    Platinum: "border-primary ring-2 ring-primary/20",
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen flex flex-col">
        <LandingNav />
        <div className="flex-1 bg-secondary/30 py-6 lg:py-12">
          <div className="container px-4 lg:px-6 max-w-5xl">
            <div className="text-center mb-8">
              <h1 className="text-2xl lg:text-3xl font-bold flex items-center justify-center gap-2">
                <Crown className="h-7 w-7 text-amber-500" />
                Subscription Plans
              </h1>
              <p className="text-muted-foreground mt-2 max-w-lg mx-auto">
                Choose a plan that fits your practice. All plans include full platform access — save more with higher tiers.
              </p>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-72 bg-muted/50 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {plans?.map((plan) => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    isCurrentPlan={currentSub?.plan_id === plan.id}
                    borderClass={tierColors[plan.name] || ""}
                    onSelect={() => subscribeMutation.mutate(plan.id)}
                    isLoading={subscribeMutation.isPending}
                  />
                ))}
              </div>
            )}

            <div className="mt-8 text-center text-xs text-muted-foreground">
              <p>All prices are in EGP. Subscriptions auto-renew monthly. Cancel anytime.</p>
            </div>
          </div>
        </div>
        <LandingFooter />
        <ScrollToTop />
      </div>
    </ProtectedRoute>
  );
};

export default SubscriptionPlans;
