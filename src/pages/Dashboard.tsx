import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import OrderDashboard from "@/components/OrderDashboard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Compass, Truck, MessageSquareMore, FolderOpen, FileText, Wallet, AlertTriangle, ChevronDown } from "lucide-react";
import { DepositPromptBanner } from "@/components/wallet/DepositPromptBanner";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import LandingNav from "@/components/landing/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";
import { ScrollToTop } from "@/components/ui/scroll-to-top";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useNotificationData } from "@/hooks/useNotificationData";
import { FirstTimeModal } from "@/components/onboarding/FirstTimeModal";
import { DashboardTour } from "@/components/dashboard/DashboardTour";
import { AchievementToast } from "@/components/dashboard/AchievementToast";
import { AchievementProgressNotification } from "@/components/dashboard/AchievementProgressNotification";
import { DashboardReceiveAnimation } from "@/components/order/DashboardReceiveAnimation";
import { PendingDeliveryConfirmations } from "@/components/order/PendingDeliveryConfirmations";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

// Overdue invoice banner component
const OverdueInvoiceBanner = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: overdueCount } = useQuery({
    queryKey: ["overdue-invoices-count", user?.id],
    queryFn: async () => {
      const { data: invoices } = await supabase
        .from("invoices")
        .select("id, order:orders!inner(doctor_id)")
        .eq("payment_status", "overdue");
      return invoices?.filter((inv: any) => inv.order?.doctor_id === user?.id).length || 0;
    },
    enabled: !!user?.id,
    staleTime: 60000,
  });

  if (!overdueCount || overdueCount === 0) return null;

  return (
    <Card className="border-destructive/50 bg-destructive/5 mb-4">
      <CardContent className="py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-medium">
              You have {overdueCount} overdue invoice{overdueCount > 1 ? 's' : ''}
            </span>
          </div>
          <Button size="sm" variant="outline" onClick={() => navigate("/logistics?tab=billing")} className="text-xs">
            View Billing
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// Wallet balance mini-card
const WalletMiniCard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: wallet } = useQuery({
    queryKey: ["wallet-balance", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("wallets")
        .select("balance")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  return (
    <button
      onClick={() => navigate("/wallet")}
      className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-primary/5 hover:bg-primary/10 transition-colors text-left"
    >
      <Wallet className="h-4 w-4 text-primary" />
      <div>
        <p className="text-[10px] text-muted-foreground leading-tight">Balance</p>
        <p className="text-sm font-bold text-primary">{(wallet?.balance || 0).toLocaleString()} EGP</p>
      </div>
    </button>
  );
};

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { role, isLabStaff, roleConfirmed, isLoading: roleLoading } = useUserRole();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [runTour, setRunTour] = useState(false);
  const [showReceiveAnimation, setShowReceiveAnimation] = useState(false);
  const [receivedOrderNumber, setReceivedOrderNumber] = useState<string>("");
  const { unreadCount, hasUrgent } = useNotificationData();

  useEffect(() => {
    const checkFirstLogin = async () => {
      if (!user?.id) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed, created_at")
        .eq("id", user.id)
        .single();
      if (profile?.onboarding_completed) {
        const createdAt = new Date(profile.created_at).getTime();
        const now = Date.now();
        if (now - createdAt < 5 * 60 * 1000) {
          const hasSeenOnboarding = localStorage.getItem(`onboarding_seen_${user.id}`);
          if (!hasSeenOnboarding) {
            setShowOnboarding(true);
            localStorage.setItem(`onboarding_seen_${user.id}`, "true");
          }
        }
      }
    };
    checkFirstLogin();
  }, [user]);

  useEffect(() => {
    if (location.state?.newOrderAccepted && location.state?.orderNumber) {
      setReceivedOrderNumber(location.state.orderNumber);
      setShowReceiveAnimation(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  if (roleLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
            <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen flex flex-col">
        {showReceiveAnimation && (
          <DashboardReceiveAnimation
            orderNumber={receivedOrderNumber}
            onComplete={() => setShowReceiveAnimation(false)}
          />
        )}
        <FirstTimeModal open={showOnboarding} onClose={() => setShowOnboarding(false)} />
        <DashboardTour userRole={role || ""} run={runTour} onComplete={() => setRunTour(false)} />
        <AchievementToast />
        <AchievementProgressNotification />
        <LandingNav />
        <TooltipProvider delayDuration={200}>
          <div className="flex-1 bg-secondary/30 py-4 sm:py-6 lg:py-12">
            <div className="container px-3 sm:px-4 lg:px-6">
              <div className="mb-4 sm:mb-6 flex flex-col gap-3 sm:gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">
                      {isLabStaff ? "Lab Dashboard" : "My Dashboard"}
                    </h1>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                      {isLabStaff ? "Manage orders, workflow & logistics" : "Orders, cases, templates & wallet"}
                    </p>
                  </div>
                  {/* Wallet mini card for doctors */}
                  {roleConfirmed && !isLabStaff && <WalletMiniCard />}
                </div>

                {/* Action bar */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Doctor primary action: Create Order dropdown */}
                  {roleConfirmed && !isLabStaff && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" className="gap-1.5 min-h-[44px] sm:min-h-0" data-tour="new-order-btn">
                          <Plus className="h-4 w-4" />
                          <span className="text-xs sm:text-sm">Create Order</span>
                          <ChevronDown className="h-3 w-3 ml-0.5 opacity-60" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuItem onClick={() => navigate("/new-order")}>
                          <Plus className="h-4 w-4 mr-2" />
                          New Order
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate("/templates")}>
                          <FileText className="h-4 w-4 mr-2" />
                          From Template
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate("/patient-cases")}>
                          <FolderOpen className="h-4 w-4 mr-2" />
                          Patient Cases
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate("/logistics")}
                        className="min-h-[44px] sm:min-h-0 press-feedback"
                        data-tour="track-orders-btn"
                      >
                        <Truck className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        <span className="ml-1.5 sm:ml-2 text-xs sm:text-sm">Logistics</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Shipments, tracking, calendar, analytics & billing</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate("/feedback-room")}
                        className="min-h-[44px] sm:min-h-0 press-feedback"
                      >
                        <MessageSquareMore className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        <span className="ml-1.5 sm:ml-2 text-xs sm:text-sm">Feedback</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Collaborate with lab on order details and quality</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setRunTour(true)}
                        className="min-h-[44px] sm:min-h-0 press-feedback"
                      >
                        <Compass className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        <span className="ml-1.5 sm:ml-2 text-xs sm:text-sm">Tour</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Take an interactive tour of the dashboard</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>

              {/* Deposit Prompt for Doctors */}
              {roleConfirmed && !isLabStaff && <DepositPromptBanner />}

              {/* Overdue Invoice Banner for Doctors */}
              {roleConfirmed && !isLabStaff && <OverdueInvoiceBanner />}

              {/* Show pending delivery confirmations for doctors */}
              {roleConfirmed && !isLabStaff && <PendingDeliveryConfirmations />}

              <OrderDashboard />
            </div>
          </div>
        </TooltipProvider>
        <LandingFooter />
        <ScrollToTop />
      </div>
    </ProtectedRoute>
  );
};

export default Dashboard;
