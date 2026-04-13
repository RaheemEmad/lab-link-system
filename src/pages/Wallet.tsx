import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import ProtectedRoute from "@/components/ProtectedRoute";
import LandingNav from "@/components/landing/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";
import { ScrollToTop } from "@/components/ui/scroll-to-top";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wallet as WalletIcon, ArrowDownCircle, ArrowUpCircle, Clock, Shield, TrendingUp, Crown } from "lucide-react";
import { TransactionHistory } from "@/components/wallet/TransactionHistory";
import { PaymentInstructions } from "@/components/wallet/PaymentInstructions";
import { toast } from "@/components/ui/sonner";
import { formatDistanceToNow } from "date-fns";

const Wallet = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: wallet, isLoading } = useQuery({
    queryKey: ["wallet", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: subscription } = useQuery({
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

  const isDepositRequired = wallet && !wallet.deposit_paid_at &&
    wallet.deposit_required_after && new Date(wallet.deposit_required_after) <= new Date();

  const canWithdraw = wallet?.deposit_paid_at && wallet?.withdrawal_eligible_after &&
    new Date(wallet.withdrawal_eligible_after) <= new Date();

  const withdrawalTimeLeft = wallet?.withdrawal_eligible_after
    ? formatDistanceToNow(new Date(wallet.withdrawal_eligible_after), { addSuffix: false })
    : null;

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen flex flex-col">
        <LandingNav />
        <div className="flex-1 bg-secondary/30 py-6 lg:py-12">
          <div className="container px-4 lg:px-6 max-w-4xl">
            <div className="mb-6">
              <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-2">
                <WalletIcon className="h-7 w-7 text-primary" />
                My Wallet
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Manage your balance, deposits, and transaction history
              </p>
            </div>

            {/* Balance Card */}
            <Card className="mb-6 bg-gradient-to-br from-primary/10 via-background to-accent/10 border-primary/20">
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">Available Balance</p>
                    <p className="text-4xl font-bold text-primary">
                      {(wallet?.balance || 0).toLocaleString()} <span className="text-lg text-muted-foreground">EGP</span>
                    </p>
                    {subscription && (
                      <Badge variant="secondary" className="mt-2">
                        <Crown className="h-3 w-3 mr-1" />
                        {(subscription as any).plan?.name} Plan — {(subscription as any).plan?.per_order_fee > 0
                          ? `${(subscription as any).plan?.per_order_fee} EGP/order`
                          : "No commission"}
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      disabled={!canWithdraw || (wallet?.balance || 0) <= 0}
                    >
                      <ArrowUpCircle className="h-4 w-4 mr-2" />
                      Withdraw
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Deposit Required Banner */}
            {isDepositRequired && (
              <Card className="mb-6 border-destructive/50 bg-destructive/5">
                <CardContent className="py-4">
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-destructive flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-semibold text-destructive">Commitment Deposit Required</p>
                      <p className="text-sm text-muted-foreground">
                        A 100 EGP deposit is required as a seriousness guarantee for orders.
                        This deposit is fully withdrawable after 3 months.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Status Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">Deposit Status</p>
                      <p className="font-semibold text-sm">
                        {wallet?.deposit_paid_at ? "Paid ✓" : "Pending"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-accent" />
                    <div>
                      <p className="text-xs text-muted-foreground">Withdrawal</p>
                      <p className="font-semibold text-sm">
                        {canWithdraw ? "Available" : withdrawalTimeLeft ? `In ${withdrawalTimeLeft}` : "N/A"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">Plan</p>
                      <p className="font-semibold text-sm">
                        {(subscription as any)?.plan?.name || "No plan"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Subscription CTA */}
            {!subscription && (
              <Card className="mb-6 border-primary/30 bg-primary/5">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">Choose a Subscription Plan</p>
                      <p className="text-sm text-muted-foreground">
                        Get reduced per-order fees with a monthly subscription
                      </p>
                    </div>
                    <Button onClick={() => navigate("/plans")}>View Plans</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Payment Instructions */}
            <div className="mb-6">
              <PaymentInstructions
                context={isDepositRequired ? "deposit" : "wallet"}
                amount={isDepositRequired ? 100 : undefined}
              />
            </div>

            {/* Transaction History */}
            {wallet && <TransactionHistory walletId={wallet.id} />}
          </div>
        </div>
        <LandingFooter />
        <ScrollToTop />
      </div>
    </ProtectedRoute>
  );
};

export default Wallet;
