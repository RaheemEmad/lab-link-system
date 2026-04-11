import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";

export const DepositPromptBanner = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: wallet } = useQuery({
    queryKey: ["wallet-deposit-check", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wallets")
        .select("deposit_paid_at, deposit_required_after")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
    staleTime: 60000,
  });

  // Only show if deposit is required and not yet paid
  const shouldShow = wallet &&
    !wallet.deposit_paid_at &&
    wallet.deposit_required_after &&
    new Date(wallet.deposit_required_after) <= new Date();

  if (!shouldShow) return null;

  return (
    <Card className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20 mb-4">
      <CardContent className="py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
            <Shield className="h-4 w-4 flex-shrink-0" />
            <span className="text-sm font-medium">
              A 100 EGP commitment deposit is required to continue placing orders
            </span>
          </div>
          <Button size="sm" variant="outline" onClick={() => navigate("/wallet")} className="text-xs flex-shrink-0">
            Go to Wallet
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
